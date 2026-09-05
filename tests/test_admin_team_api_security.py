from __future__ import annotations

from datetime import (
    UTC,
    datetime,
    timedelta,
)
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api import dependencies
from app.api.routes.admin import (
    auth as admin_auth_route,
)
from app.api.routes.admin import (
    team as admin_team_route,
)
from app.core.config import settings
from app.core.constants import AdminRole
from app.db.models.admin import Admin
from app.main import create_application
from app.services.admin import (
    invitation_service,
)
from app.services.admin.auth import (
    AdminAuthenticationError,
    AdminIdentity,
)
from app.services.admin.session_service import (
    ValidatedAdminSession,
)

# ============================================================
# TEST SUPPORT
# ============================================================


TEST_ORIGIN = "http://testserver"

TEST_INVITATION_TOKEN = (
    "bakaboost-test-invitation-token-"
    "0123456789abcdef"
)

TEST_CLOUDFLARE_ACCESS_TOKEN = (
    "test-cloudflare-access-application-jwt"
)


class FakeScalarCollection:
    def __init__(
        self,
        values: list[object],
    ) -> None:
        self.values = values

    def all(
        self,
    ) -> list[object]:
        return list(
            self.values
        )


class FakeResult:
    def __init__(
        self,
        value=None,
    ) -> None:
        self.value = value

    def scalar_one_or_none(
        self,
    ):
        return self.value

    def scalars(
        self,
    ) -> FakeScalarCollection:
        if self.value is None:
            values: list[object] = []

        elif isinstance(
            self.value,
            list,
        ):
            values = self.value

        else:
            values = [
                self.value
            ]

        return FakeScalarCollection(
            values
        )


class FakeDatabaseSession:
    """
    Minimal AsyncSession substitute for HTTP-boundary tests.

    Query results are consumed in the order supplied.
    """

    def __init__(
        self,
        results: list[object] | None = None,
    ) -> None:
        self.results = list(
            results or []
        )

        self.added: list[object] = []

        self.commit_count = 0
        self.rollback_count = 0
        self.flush_count = 0

    async def execute(
        self,
        statement,
    ) -> FakeResult:
        del statement

        if not self.results:
            raise AssertionError(
                "Unexpected database query."
            )

        return FakeResult(
            self.results.pop(0)
        )

    def add(
        self,
        value,
    ) -> None:
        self.added.append(
            value
        )

    async def flush(
        self,
    ) -> None:
        self.flush_count += 1

        #
        # SQLAlchemy normally materializes UUID defaults on
        # INSERT/flush. Reproduce the small part required by
        # the invitation service.
        #
        for value in self.added:
            if (
                hasattr(
                    value,
                    "id",
                )
                and getattr(
                    value,
                    "id",
                    None,
                )
                is None
            ):
                value.id = uuid4()

    async def commit(
        self,
    ) -> None:
        self.commit_count += 1

    async def rollback(
        self,
    ) -> None:
        self.rollback_count += 1


def utcnow() -> datetime:
    return datetime.now(
        UTC
    )


def build_identity(
    *,
    subject: str = (
        "cf-access-api-invited-admin"
    ),
    email: str | None = (
        "invitee@example.test"
    ),
) -> AdminIdentity:
    """
    Build the trusted identity object produced after successful
    Cloudflare Access JWT verification.

    JWT cryptographic validation itself belongs to the admin
    authentication service tests. These API-boundary tests mock
    that decoder and verify authorization/enrollment behavior.
    """

    return AdminIdentity(
        subject=subject,
        email=email,
        claims={
            "sub": subject,
            "email": email,
            "name": (
                "Invited Administrator"
            ),
            "type": "app",
        },
    )


def build_admin(
    *,
    role: AdminRole,
    is_active: bool = True,
) -> Admin:
    return Admin(
        auth_subject=(
            f"cf-access-{uuid4()}"
        ),
        email=(
            f"{uuid4()}@example.test"
        ),
        display_name=(
            "BAKABOOST API Test"
        ),
        role=role,
        is_active=is_active,
        mfa_enabled=True,
        security_version=1,
        activated_at=utcnow(),
    )


def build_invitation(
    *,
    email: str = (
        "invitee@example.test"
    ),
    role: AdminRole = AdminRole.ADMIN,
    expires_at: datetime | None = None,
    accepted_at: datetime | None = None,
    revoked_at: datetime | None = None,
):
    return SimpleNamespace(
        id=uuid4(),
        email=email,
        role=role,
        token_hash="a" * 64,
        invited_by_admin_id=uuid4(),
        expires_at=(
            expires_at
            or (
                utcnow()
                + timedelta(
                    hours=1
                )
            )
        ),
        created_at=utcnow(),
        updated_at=utcnow(),
        accepted_at=accepted_at,
        accepted_admin_id=None,
        revoked_at=revoked_at,
        revoked_by_admin_id=None,
        revoke_reason=None,
    )


def install_database_override(
    application,
    db: FakeDatabaseSession,
) -> None:
    async def override_db_session():
        yield db

    application.dependency_overrides[
        dependencies.get_db_session
    ] = override_db_session


def enable_cloudflare_auth_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Force HTTP-boundary tests through the production-style
    Cloudflare Access assertion path.

    This deliberately disables the explicit local-development
    Bearer-token authentication path.
    """

    monkeypatch.setattr(
        settings,
        "app_environment",
        "test",
    )

    monkeypatch.setattr(
        settings,
        "dev_admin_auth_enabled",
        False,
    )


@pytest.fixture
def application(
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Build an isolated FastAPI application with deterministic
    browser-security configuration.
    """

    monkeypatch.setattr(
        settings,
        "allowed_origins",
        TEST_ORIGIN,
    )

    monkeypatch.setattr(
        settings,
        "allowed_hosts",
        "testserver",
    )

    app = create_application()

    yield app

    app.dependency_overrides.clear()


@pytest.fixture
def client(
    application,
):
    with TestClient(
        application,
        base_url=TEST_ORIGIN,
    ) as test_client:
        yield test_client


# ============================================================
# ADMIN AUTHORIZATION BOUNDARY
# ============================================================


def test_team_endpoint_requires_admin_authentication(
    client: TestClient,
) -> None:
    """
    Team & Access data must not be visible anonymously.
    """

    response = client.get(
        "/api/admin/team"
    )

    assert response.status_code == 401

    assert response.json()[
        "detail"
    ] == "Authentication required."


def test_valid_cloudflare_identity_without_local_admin_is_denied(
    application,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Critical security invariant:

        valid Cloudflare Access identity
        !=
        BAKABOOST administrator

    Successful authentication at Cloudflare Access must never
    automatically provision administrator access.
    """

    enable_cloudflare_auth_mode(
        monkeypatch
    )

    db = FakeDatabaseSession()

    install_database_override(
        application,
        db,
    )

    identity = build_identity(
        subject=(
            "cf-access-authenticated-but-not-admin"
        ),
        email=(
            "outsider@example.test"
        ),
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_token",
        lambda raw_token: identity,
    )

    async def fake_get_admin_for_identity(
        session,
        *,
        identity,
    ):
        assert session is db

        assert (
            identity.subject
            == (
                "cf-access-authenticated-but-not-admin"
            )
        )

        raise AdminAuthenticationError(
            "Administrator account not found."
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_admin_for_identity",
        fake_get_admin_for_identity,
    )

    response = client.post(
        "/api/admin/auth/session",
        headers={
            "Cf-Access-Jwt-Assertion": (
                TEST_CLOUDFLARE_ACCESS_TOKEN
            ),
            "Origin": TEST_ORIGIN,
        },
    )

    assert response.status_code == 401

    #
    # Never reveal whether a particular identity/email exists
    # in the administrator database.
    #
    body_text = response.text.lower()

    assert (
        "outsider@example.test"
        not in body_text
    )

    assert (
        identity.subject.lower()
        not in body_text
    )


# ============================================================
# INVITATION ACCEPTANCE AUTH BOUNDARY
# ============================================================


def test_invitation_acceptance_requires_cloudflare_access_assertion(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Possession of the invitation token alone must not be
    sufficient.

    Production-style enrollment requires a Cloudflare Access
    application assertion.
    """

    enable_cloudflare_auth_mode(
        monkeypatch
    )

    response = client.post(
        (
            "/api/admin/team/"
            "invitations/accept"
        ),
        headers={
            "Origin": TEST_ORIGIN,
        },
        json={
            "invitation_token": (
                TEST_INVITATION_TOKEN
            ),
        },
    )

    assert response.status_code == 401


def test_invitation_acceptance_rejects_identity_mismatch(
    application,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_cloudflare_auth_mode(
        monkeypatch
    )

    invitation = build_invitation(
        email="expected@example.test"
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    install_database_override(
        application,
        db,
    )

    identity = build_identity(
        email="attacker@example.test"
    )

    monkeypatch.setattr(
        admin_team_route,
        "decode_admin_token",
        lambda raw_token: identity,
    )

    response = client.post(
        (
            "/api/admin/team/"
            "invitations/accept"
        ),
        headers={
            "Cf-Access-Jwt-Assertion": (
                TEST_CLOUDFLARE_ACCESS_TOKEN
            ),
            "Origin": TEST_ORIGIN,
        },
        json={
            "invitation_token": (
                TEST_INVITATION_TOKEN
            ),
        },
    )

    assert response.status_code == 403

    assert db.added == []


@pytest.mark.parametrize(
    (
        "invitation"
    ),
    [
        build_invitation(
            expires_at=(
                utcnow()
                - timedelta(
                    minutes=5
                )
            ),
        ),
        build_invitation(
            revoked_at=utcnow(),
        ),
        build_invitation(
            accepted_at=utcnow(),
        ),
    ],
    ids=[
        "expired",
        "revoked",
        "already-used",
    ],
)
def test_unavailable_invitations_share_generic_public_error(
    application,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    invitation,
) -> None:
    """
    Expired, revoked and previously-used invitations should
    collapse to the same public response so callers cannot
    enumerate invitation lifecycle state.
    """

    enable_cloudflare_auth_mode(
        monkeypatch
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    install_database_override(
        application,
        db,
    )

    identity = build_identity(
        email=invitation.email
    )

    monkeypatch.setattr(
        admin_team_route,
        "decode_admin_token",
        lambda raw_token: identity,
    )

    response = client.post(
        (
            "/api/admin/team/"
            "invitations/accept"
        ),
        headers={
            "Cf-Access-Jwt-Assertion": (
                TEST_CLOUDFLARE_ACCESS_TOKEN
            ),
            "Origin": TEST_ORIGIN,
        },
        json={
            "invitation_token": (
                TEST_INVITATION_TOKEN
            ),
        },
    )

    assert response.status_code == 400

    assert response.json() == {
        "detail": (
            "Administrator invitation is "
            "invalid or unavailable."
        ),
    }


# ============================================================
# IMMUTABLE EXTERNAL SUBJECT BINDING
# ============================================================


def test_successful_acceptance_binds_immutable_cloudflare_subject(
    application,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Successful onboarding must bind the new administrator to
    the immutable externally authenticated subject.

    Email proves that the authenticated invitation recipient
    matches the Super Admin-selected address.

    Future BAKABOOST administrator authentication is bound to
    auth_subject, never email.
    """

    enable_cloudflare_auth_mode(
        monkeypatch
    )

    invitation = build_invitation(
        email="invitee@example.test",
        role=AdminRole.ADMIN,
    )

    #
    # Query order inside accept_admin_invitation():
    #
    # 1. invitation by token hash
    # 2. existing administrator by subject/email
    #
    db = FakeDatabaseSession(
        [
            invitation,
            None,
        ]
    )

    install_database_override(
        application,
        db,
    )

    identity = build_identity(
        subject=(
            "cf-access-immutable-new-admin"
        ),
        email="invitee@example.test",
    )

    monkeypatch.setattr(
        admin_team_route,
        "decode_admin_token",
        lambda raw_token: identity,
    )

    audit_events: list[
        dict[str, object]
    ] = []

    async def fake_record_audit_event(
        session,
        **kwargs,
    ):
        assert session is db

        audit_events.append(
            kwargs
        )

    monkeypatch.setattr(
        invitation_service,
        "record_audit_event",
        fake_record_audit_event,
    )

    raw_invitation_token = (
        "one-time-super-admin-issued-token"
    )

    response = client.post(
        (
            "/api/admin/team/"
            "invitations/accept"
        ),
        headers={
            "Cf-Access-Jwt-Assertion": (
                TEST_CLOUDFLARE_ACCESS_TOKEN
            ),
            "Origin": TEST_ORIGIN,
        },
        json={
            "invitation_token": (
                raw_invitation_token
            ),
        },
    )

    assert response.status_code == 200

    created_admins = [
        value
        for value in db.added
        if isinstance(
            value,
            Admin,
        )
    ]

    assert len(
        created_admins
    ) == 1

    created_admin = created_admins[0]

    assert (
        created_admin.auth_subject
        == identity.subject
    )

    assert (
        created_admin.email
        == "invitee@example.test"
    )

    assert (
        created_admin.role
        == AdminRole.ADMIN
    )

    assert (
        created_admin.is_active
        is True
    )

    assert (
        invitation.accepted_admin_id
        == created_admin.id
    )

    assert (
        invitation.accepted_at
        is not None
    )

    assert db.commit_count == 1
    assert db.rollback_count == 0

    #
    # The public response must never expose the immutable
    # external subject or the raw invitation credential.
    #
    response_text = response.text

    assert (
        identity.subject
        not in response_text
    )

    assert (
        raw_invitation_token
        not in response_text
    )

    #
    # Audit metadata must not duplicate either credential.
    #
    for event in audit_events:
        metadata_text = str(
            event.get(
                "metadata",
                {},
            )
        )

        assert (
            raw_invitation_token
            not in metadata_text
        )

        assert (
            identity.subject
            not in metadata_text
        )


# ============================================================
# ROLE-BASED TEAM MANAGEMENT
# ============================================================


def test_normal_admin_cannot_access_team_management(
    application,
    client: TestClient,
) -> None:
    normal_admin = build_admin(
        role=AdminRole.ADMIN
    )

    async def override_current_admin():
        return normal_admin

    application.dependency_overrides[
        dependencies.get_current_admin
    ] = override_current_admin

    response = client.get(
        "/api/admin/team"
    )

    assert response.status_code == 403


def test_reviewer_cannot_access_team_management(
    application,
    client: TestClient,
) -> None:
    reviewer = build_admin(
        role=AdminRole.REVIEWER
    )

    async def override_current_admin():
        return reviewer

    application.dependency_overrides[
        dependencies.get_current_admin
    ] = override_current_admin

    response = client.get(
        "/api/admin/team"
    )

    assert response.status_code == 403


def test_sensitive_team_mutation_rejects_normal_admin(
    application,
    client: TestClient,
) -> None:
    """
    Even with an authenticated administrator session, owner
    mutations remain unavailable to the ADMIN role.
    """

    normal_admin = build_admin(
        role=AdminRole.ADMIN
    )

    session_row = SimpleNamespace(
        id=uuid4(),
        admin_id=normal_admin.id,
    )

    validated = ValidatedAdminSession(
        admin=normal_admin,
        session=session_row,
    )

    async def override_current_session():
        return validated

    async def override_sensitive_admin():
        return normal_admin

    async def override_admin_csrf():
        return None

    application.dependency_overrides[
        dependencies.get_current_admin_session
    ] = override_current_session

    application.dependency_overrides[
        dependencies.get_sensitive_admin
    ] = override_sensitive_admin

    application.dependency_overrides[
        dependencies.require_admin_csrf
    ] = override_admin_csrf

    response = client.post(
        (
            f"/api/admin/team/"
            f"{uuid4()}/disable"
        ),
        headers={
            "Origin": TEST_ORIGIN,
        },
    )

    assert response.status_code == 403


# ============================================================
# STATE-CHANGING REQUEST SECURITY
# ============================================================


def test_sensitive_team_mutation_without_session_is_denied(
    client: TestClient,
) -> None:
    response = client.post(
        (
            f"/api/admin/team/"
            f"{uuid4()}/disable"
        ),
        headers={
            "Origin": TEST_ORIGIN,
        },
    )

    assert response.status_code == 401


def test_state_changing_team_request_rejects_unapproved_origin(
    client: TestClient,
) -> None:
    """
    Browser-origin enforcement sits in front of the admin
    authorization layer.
    """

    response = client.post(
        (
            f"/api/admin/team/"
            f"{uuid4()}/disable"
        ),
        headers={
            "Origin": (
                "https://attacker.example"
            ),
        },
    )

    assert response.status_code == 403