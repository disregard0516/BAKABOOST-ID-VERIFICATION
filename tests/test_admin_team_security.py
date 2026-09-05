from __future__ import annotations

from datetime import (
    UTC,
    datetime,
    timedelta,
)
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.core.constants import AdminRole
from app.services.admin import (
    invitation_service,
    team_service,
)
from app.services.admin.auth import AdminIdentity
from app.services.admin.invitation_service import (
    AdminInvitationAlreadyAcceptedError,
    AdminInvitationExpiredError,
    AdminInvitationIdentityError,
    AdminInvitationPermissionError,
    AdminInvitationRevokedError,
)
from app.services.admin.team_service import (
    AdminTeamConflictError,
    AdminTeamPermissionError,
)

# ============================================================
# TEST SUPPORT
# ============================================================


class FakeScalarResult:
    def __init__(
        self,
        value,
    ) -> None:
        self.value = value

    def scalar_one_or_none(
        self,
    ):
        return self.value


class FakeDatabaseSession:
    """
    Small async-session substitute used only for service-level
    security regression tests.

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
        self.flush_count = 0

    async def execute(
        self,
        statement,
    ) -> FakeScalarResult:
        del statement

        if not self.results:
            raise AssertionError(
                "Unexpected database query."
            )

        return FakeScalarResult(
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
        # SQLAlchemy normally evaluates UUID defaults during
        # INSERT/flush. The fake session emulates that small
        # part so service code can safely audit the new row.
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


def utcnow() -> datetime:
    return datetime.now(
        UTC
    )


def build_admin(
    *,
    role: AdminRole,
    is_active: bool = True,
    security_version: int = 1,
):
    return SimpleNamespace(
        id=uuid4(),
        auth_subject=(
            f"external-subject-{uuid4()}"
        ),
        email=(
            f"{uuid4()}@example.test"
        ),
        display_name="BAKABOOST Test",
        role=role,
        is_active=is_active,
        mfa_enabled=True,
        security_version=(
            security_version
        ),
        last_login_at=None,
        invited_at=None,
        activated_at=utcnow(),
        disabled_at=(
            None
            if is_active
            else utcnow()
        ),
        security_updated_at=None,
        created_at=utcnow(),
        updated_at=utcnow(),
    )


def build_invitation(
    *,
    email: str = "invitee@example.test",
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


def build_identity(
    *,
    subject: str = (
        "external-subject-new-admin"
    ),
    email: str | None = (
        "invitee@example.test"
    ),
) -> AdminIdentity:
    return AdminIdentity(
        subject=subject,
        email=email,
        claims={
            "name": (
                "Invited Administrator"
            ),
        },
    )

# ============================================================
# SUPER ADMIN AUTHORIZATION
# ============================================================


@pytest.mark.asyncio
async def test_normal_admin_cannot_manage_invitations() -> None:
    """
    ADMIN_MANAGE is additionally protected at the service
    boundary: a normal administrator must never be able to
    perform owner-level invitation management.
    """

    db = FakeDatabaseSession()

    normal_admin = build_admin(
        role=AdminRole.ADMIN
    )

    with pytest.raises(
        AdminInvitationPermissionError
    ):
        await (
            invitation_service
            .create_admin_invitation(
                db,
                acting_admin=normal_admin,
                email=(
                    "new-admin@example.test"
                ),
                role=AdminRole.ADMIN,
                expires_at=(
                    utcnow()
                    + timedelta(
                        hours=1
                    )
                ),
            )
        )

    assert db.flush_count == 0
    assert db.added == []


@pytest.mark.asyncio
async def test_normal_admin_cannot_manage_team() -> None:
    """
    Team inspection itself is owner-only.
    """

    db = FakeDatabaseSession()

    normal_admin = build_admin(
        role=AdminRole.ADMIN
    )

    with pytest.raises(
        AdminTeamPermissionError
    ):
        await team_service.list_admin_team(
            db,
            acting_admin=normal_admin,
        )


# ============================================================
# LAST SUPER ADMIN PROTECTION
# ============================================================


@pytest.mark.asyncio
async def test_last_active_super_admin_cannot_be_demoted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    There must always remain at least one active owner.
    """

    db = FakeDatabaseSession()

    owner = build_admin(
        role=AdminRole.SUPER_ADMIN
    )

    async def fake_lock_super_admins(
        session,
        *,
        acting_admin_id,
    ):
        assert session is db
        assert acting_admin_id == owner.id

        return [
            owner
        ]

    async def fake_lock_target(
        session,
        *,
        admin_id,
    ):
        assert session is db
        assert admin_id == owner.id

        return owner

    monkeypatch.setattr(
        team_service,
        "_lock_active_super_admins",
        fake_lock_super_admins,
    )

    monkeypatch.setattr(
        team_service,
        "_lock_target_admin",
        fake_lock_target,
    )

    with pytest.raises(
        AdminTeamConflictError
    ):
        await team_service.change_admin_role(
            db,
            target_admin_id=owner.id,
            acting_admin=owner,
            role=AdminRole.ADMIN,
        )

    assert (
        owner.role
        == AdminRole.SUPER_ADMIN
    )


@pytest.mark.asyncio
async def test_last_active_super_admin_cannot_be_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner = build_admin(
        role=AdminRole.SUPER_ADMIN
    )

    db = FakeDatabaseSession()

    async def fake_lock_super_admins(
        session,
        *,
        acting_admin_id,
    ):
        assert acting_admin_id == owner.id

        return [
            owner
        ]

    async def fake_lock_target(
        session,
        *,
        admin_id,
    ):
        assert admin_id == owner.id

        return owner

    monkeypatch.setattr(
        team_service,
        "_lock_active_super_admins",
        fake_lock_super_admins,
    )

    monkeypatch.setattr(
        team_service,
        "_lock_target_admin",
        fake_lock_target,
    )

    with pytest.raises(
        AdminTeamConflictError
    ):
        await team_service.disable_admin(
            db,
            target_admin_id=owner.id,
            acting_admin=owner,
        )

    assert owner.is_active is True
    assert owner.disabled_at is None


# ============================================================
# SECURITY STATE INVALIDATION
# ============================================================


@pytest.mark.asyncio
async def test_role_change_invalidates_existing_sessions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Changing authorization must rotate the target account's
    security_version and invalidate its existing sessions.
    """

    db = FakeDatabaseSession()

    owner = build_admin(
        role=AdminRole.SUPER_ADMIN
    )

    target = build_admin(
        role=AdminRole.ADMIN,
        security_version=7,
    )

    async def fake_lock_super_admins(
        session,
        *,
        acting_admin_id,
    ):
        assert session is db
        assert acting_admin_id == owner.id

        return [
            owner
        ]

    async def fake_lock_target(
        session,
        *,
        admin_id,
    ):
        assert admin_id == target.id

        return target

    invalidations: list[
        tuple[UUID, str]
    ] = []

    async def fake_invalidate(
        session,
        *,
        admin,
        reason,
    ):
        assert session is db

        admin.security_version += 1

        invalidations.append(
            (
                admin.id,
                reason,
            )
        )

    async def fake_audit(
        session,
        **kwargs,
    ):
        assert session is db
        assert kwargs

    monkeypatch.setattr(
        team_service,
        "_lock_active_super_admins",
        fake_lock_super_admins,
    )

    monkeypatch.setattr(
        team_service,
        "_lock_target_admin",
        fake_lock_target,
    )

    monkeypatch.setattr(
        team_service,
        "invalidate_admin_security_state",
        fake_invalidate,
    )

    monkeypatch.setattr(
        team_service,
        "record_audit_event",
        fake_audit,
    )

    changed = (
        await team_service.change_admin_role(
            db,
            target_admin_id=target.id,
            acting_admin=owner,
            role=AdminRole.REVIEWER,
        )
    )

    assert changed is target

    assert (
        target.role
        == AdminRole.REVIEWER
    )

    assert (
        target.security_version
        == 8
    )

    assert invalidations == [
        (
            target.id,
            "admin_role_changed",
        )
    ]

    assert db.flush_count == 1


@pytest.mark.asyncio
async def test_disabling_admin_invalidates_security_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner = build_admin(
        role=AdminRole.SUPER_ADMIN
    )

    target = build_admin(
        role=AdminRole.ADMIN,
        security_version=3,
    )

    db = FakeDatabaseSession()

    async def fake_lock_super_admins(
        session,
        *,
        acting_admin_id,
    ):
        return [
            owner
        ]

    async def fake_lock_target(
        session,
        *,
        admin_id,
    ):
        assert admin_id == target.id
        return target

    invalidation_reasons: list[
        str
    ] = []

    async def fake_invalidate(
        session,
        *,
        admin,
        reason,
    ):
        admin.security_version += 1
        invalidation_reasons.append(
            reason
        )

    async def fake_audit(
        session,
        **kwargs,
    ):
        return None

    monkeypatch.setattr(
        team_service,
        "_lock_active_super_admins",
        fake_lock_super_admins,
    )

    monkeypatch.setattr(
        team_service,
        "_lock_target_admin",
        fake_lock_target,
    )

    monkeypatch.setattr(
        team_service,
        "invalidate_admin_security_state",
        fake_invalidate,
    )

    monkeypatch.setattr(
        team_service,
        "record_audit_event",
        fake_audit,
    )

    disabled = await team_service.disable_admin(
        db,
        target_admin_id=target.id,
        acting_admin=owner,
    )

    assert disabled is target
    assert target.is_active is False
    assert target.disabled_at is not None
    assert target.security_version == 4

    assert invalidation_reasons == [
        "admin_disabled"
    ]


@pytest.mark.asyncio
async def test_forced_session_revocation_rotates_security_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    A forced logout must invalidate not only current session
    rows but the account security state itself. This blocks
    concurrent sessions created against an older version.
    """

    owner = build_admin(
        role=AdminRole.SUPER_ADMIN
    )

    target = build_admin(
        role=AdminRole.ADMIN,
        security_version=11,
    )

    db = FakeDatabaseSession()

    async def fake_lock_super_admins(
        session,
        *,
        acting_admin_id,
    ):
        return [
            owner
        ]

    async def fake_lock_target(
        session,
        *,
        admin_id,
    ):
        return target

    invalidation_reasons: list[
        str
    ] = []

    async def fake_invalidate(
        session,
        *,
        admin,
        reason,
    ):
        admin.security_version += 1
        invalidation_reasons.append(
            reason
        )

    async def fake_audit(
        session,
        **kwargs,
    ):
        return None

    monkeypatch.setattr(
        team_service,
        "_lock_active_super_admins",
        fake_lock_super_admins,
    )

    monkeypatch.setattr(
        team_service,
        "_lock_target_admin",
        fake_lock_target,
    )

    monkeypatch.setattr(
        team_service,
        "invalidate_admin_security_state",
        fake_invalidate,
    )

    monkeypatch.setattr(
        team_service,
        "record_audit_event",
        fake_audit,
    )

    result = (
        await team_service
        .revoke_admin_access_sessions(
            db,
            target_admin_id=target.id,
            acting_admin=owner,
        )
    )

    assert result is target

    assert (
        target.security_version
        == 12
    )

    assert invalidation_reasons == [
        "sessions_revoked_by_super_admin"
    ]


# ============================================================
# INVITATION STATE ENFORCEMENT
# ============================================================


@pytest.mark.asyncio
async def test_revoked_invitation_cannot_be_accepted() -> None:
    invitation = build_invitation(
        revoked_at=utcnow()
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    with pytest.raises(
        AdminInvitationRevokedError
    ):
        await (
            invitation_service
            .accept_admin_invitation(
                db,
                raw_token=(
                    "valid-looking-token"
                ),
                identity=build_identity(),
            )
        )


@pytest.mark.asyncio
async def test_expired_invitation_cannot_be_accepted() -> None:
    invitation = build_invitation(
        expires_at=(
            utcnow()
            - timedelta(
                minutes=1
            )
        )
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    with pytest.raises(
        AdminInvitationExpiredError
    ):
        await (
            invitation_service
            .accept_admin_invitation(
                db,
                raw_token=(
                    "valid-looking-token"
                ),
                identity=build_identity(),
            )
        )


@pytest.mark.asyncio
async def test_used_invitation_cannot_be_reused() -> None:
    invitation = build_invitation(
        accepted_at=utcnow()
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    with pytest.raises(
        AdminInvitationAlreadyAcceptedError
    ):
        await (
            invitation_service
            .accept_admin_invitation(
                db,
                raw_token=(
                    "valid-looking-token"
                ),
                identity=build_identity(),
            )
        )


# ============================================================
# EXTERNAL IDENTITY BINDING
# ============================================================


@pytest.mark.asyncio
async def test_invitation_email_must_match_authenticated_identity() -> None:
    """
    Possession of an invitation token is not enough.

    The externally authenticated verified email must exactly
    match the address selected by the Super Admin.
    """

    invitation = build_invitation(
        email="expected@example.test"
    )

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    identity = build_identity(
        email="attacker@example.test",
    )

    with pytest.raises(
        AdminInvitationIdentityError
    ):
        await (
            invitation_service
            .accept_admin_invitation(
                db,
                raw_token=(
                    "valid-looking-token"
                ),
                identity=identity,
            )
        )

    assert db.added == []


@pytest.mark.asyncio
async def test_missing_authenticated_email_cannot_accept_invitation() -> None:
    """
    Invitation acceptance requires an authenticated email.

    The authentication layer validates the external identity
    before this service is called. The invitation service
    still fails closed when no email is available.
    """

    invitation = build_invitation()

    db = FakeDatabaseSession(
        [
            invitation,
        ]
    )

    identity = AdminIdentity(
        subject="cloudflare|new-admin",
        email=None,
        claims={},
    )

    with pytest.raises(
        AdminInvitationIdentityError
    ):
        await (
            invitation_service
            .accept_admin_invitation(
                db,
                raw_token=(
                    "valid-looking-token"
                ),
                identity=identity,
            )
        )