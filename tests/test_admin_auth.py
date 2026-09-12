from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.dependencies import (
    require_sensitive_permission,
)
from app.core.config import settings
from app.core.constants import AdminRole
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.services.admin import (
    auth as admin_auth_service,
)
from app.services.admin.auth import (
    AdminAccountDisabledError,
    AdminAuthenticationError,
    AdminIdentity,
    decode_admin_step_up_token,
    decode_admin_token,
    get_admin_for_identity,
)

# ============================================================
# TEST SUPPORT
# ============================================================


TEST_SUBJECT = (
    "cloudflare-access-admin-subject"
)

TEST_EMAIL = (
    "admin@example.com"
)

NORMAL_AUDIENCE = (
    "scanly-admin-access-audience"
)

STEP_UP_AUDIENCE = (
    "scanly-admin-step-up-audience"
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


class FakeDatabaseSession:
    def __init__(
        self,
        result=None,
    ) -> None:
        self.result = result
        self.execute_count = 0

    async def execute(
        self,
        statement,
    ) -> FakeResult:
        del statement

        self.execute_count += 1

        return FakeResult(
            self.result
        )


def build_identity(
    *,
    subject: str = TEST_SUBJECT,
    email: str | None = TEST_EMAIL,
) -> AdminIdentity:
    return AdminIdentity(
        subject=subject,
        email=email,
        claims={
            "sub": subject,
            "email": email,
            "type": "app",
        },
    )


def build_admin(
    role: AdminRole,
    *,
    is_active: bool = True,
) -> Admin:
    return Admin(
        auth_subject=TEST_SUBJECT,
        email=TEST_EMAIL,
        display_name="Test Admin",
        role=role,
        is_active=is_active,
    )


def force_cloudflare_auth_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Disable the explicit local-development authentication
    mechanism so token decoding follows the production-style
    Cloudflare Access path.
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

    monkeypatch.setattr(
        settings,
        "cloudflare_access_audience",
        NORMAL_AUDIENCE,
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        STEP_UP_AUDIENCE,
    )


def force_development_auth_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "app_environment",
        "development",
    )

    monkeypatch.setattr(
        settings,
        "dev_admin_auth_enabled",
        True,
    )


# ============================================================
# CLOUDFLARE ACCESS IDENTITY DECODING
# ============================================================


def test_cloudflare_identity_is_normalized(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    claims = {
        "sub": (
            "  cloudflare-immutable-subject  "
        ),
        "email": (
            "  ADMIN@Example.COM  "
        ),
        "type": "app",
    }

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        assert (
            raw_token
            == "cloudflare-access-jwt"
        )

        assert (
            audience
            == NORMAL_AUDIENCE
        )

        return claims

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = decode_admin_token(
        "  cloudflare-access-jwt  "
    )

    assert (
        identity.subject
        == "cloudflare-immutable-subject"
    )

    assert (
        identity.email
        == "admin@example.com"
    )

    assert identity.claims is claims


def test_production_mode_uses_normal_cloudflare_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    calls = {
        "cloudflare": 0,
        "development": 0,
    }

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        calls["cloudflare"] += 1

        assert (
            raw_token
            == "production-token"
        )

        assert (
            audience
            == NORMAL_AUDIENCE
        )

        return {
            "sub": TEST_SUBJECT,
            "email": TEST_EMAIL,
            "type": "app",
        }

    def fake_development_decoder(
        raw_token: str,
    ):
        del raw_token

        calls["development"] += 1

        raise AssertionError(
            "Development decoder must not "
            "run outside development mode."
        )

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_development_admin_token",
        fake_development_decoder,
    )

    identity = decode_admin_token(
        "production-token"
    )

    assert (
        identity.subject
        == TEST_SUBJECT
    )

    assert calls == {
        "cloudflare": 1,
        "development": 0,
    }


def test_development_mode_uses_only_development_decoder(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_development_auth_mode(
        monkeypatch
    )

    calls = {
        "cloudflare": 0,
        "development": 0,
    }

    def fake_development_decoder(
        raw_token: str,
    ):
        calls["development"] += 1

        assert (
            raw_token
            == "development-token"
        )

        return {
            "sub": (
                "development-admin-subject"
            ),
            "email": (
                "dev@example.test"
            ),
        }

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        del raw_token
        del audience

        calls["cloudflare"] += 1

        raise AssertionError(
            "Cloudflare decoder must not "
            "run in explicit development "
            "authentication mode."
        )

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_development_admin_token",
        fake_development_decoder,
    )

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = decode_admin_token(
        "development-token"
    )

    assert (
        identity.subject
        == "development-admin-subject"
    )

    assert (
        identity.email
        == "dev@example.test"
    )

    assert calls == {
        "cloudflare": 0,
        "development": 1,
    }


# ============================================================
# ADMIN TOKEN INPUT VALIDATION
# ============================================================


@pytest.mark.parametrize(
    "raw_token",
    [
        "",
        "   ",
        "\t",
        "\n",
    ],
)
def test_blank_admin_token_is_rejected(
    raw_token: str,
) -> None:
    with pytest.raises(
        AdminAuthenticationError
    ):
        decode_admin_token(
            raw_token
        )


def test_non_string_admin_token_is_rejected() -> None:
    with pytest.raises(
        AdminAuthenticationError
    ):
        decode_admin_token(
            None  # type: ignore[arg-type]
        )


@pytest.mark.parametrize(
    "subject",
    [
        None,
        "",
        "   ",
    ],
)
def test_missing_or_blank_subject_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
    subject,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        del raw_token
        del audience

        return {
            "sub": subject,
            "email": TEST_EMAIL,
            "type": "app",
        }

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    with pytest.raises(
        AdminAuthenticationError
    ):
        decode_admin_token(
            "cloudflare-access-token"
        )


def test_missing_email_is_allowed_at_identity_layer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        del raw_token
        del audience

        return {
            "sub": TEST_SUBJECT,
            "type": "app",
        }

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = decode_admin_token(
        "cloudflare-access-token"
    )

    assert (
        identity.subject
        == TEST_SUBJECT
    )

    assert identity.email is None


# ============================================================
# CLOUDFLARE ACCESS JWT VALIDATION CONTRACT
# ============================================================


def test_cloudflare_decoder_enforces_expected_jwt_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    team_domain = (
        "scanly.cloudflareaccess.com"
    )

    audience = (
        "test-cloudflare-access-audience"
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_team_domain",
        team_domain,
    )

    signing_key = SimpleNamespace(
        key="test-public-key"
    )

    class FakeJWKClient:
        def __init__(
            self,
            url,
            *,
            ssl_context,
        ) -> None:
            assert url == (
                "https://"
                f"{team_domain}"
                "/cdn-cgi/access/certs"
            )

            assert ssl_context is not None

        def get_signing_key_from_jwt(
            self,
            raw_token,
        ):
            assert (
                raw_token
                == "signed-cloudflare-token"
            )

            return signing_key

    decode_calls: list[
        dict[str, object]
    ] = []

    def fake_jwt_decode(
        raw_token,
        key,
        *,
        algorithms,
        audience,
        issuer,
        options,
    ):
        assert (
            raw_token
            == "signed-cloudflare-token"
        )

        assert (
            key
            == signing_key.key
        )

        decode_calls.append(
            {
                "algorithms": algorithms,
                "audience": audience,
                "issuer": issuer,
                "options": options,
            }
        )

        return {
            "sub": TEST_SUBJECT,
            "email": TEST_EMAIL,
            "type": "app",
            "exp": 1,
            "iat": 1,
            "nbf": 1,
            "aud": [
                audience
            ],
            "iss": issuer,
        }

    monkeypatch.setattr(
        admin_auth_service,
        "PyJWKClient",
        FakeJWKClient,
    )

    monkeypatch.setattr(
        admin_auth_service.jwt,
        "decode",
        fake_jwt_decode,
    )

    claims = (
        admin_auth_service
        ._decode_cloudflare_access_token(
            "signed-cloudflare-token",
            audience=audience,
        )
    )

    assert (
        claims["sub"]
        == TEST_SUBJECT
    )

    assert len(
        decode_calls
    ) == 1

    validation = decode_calls[0]

    assert validation[
        "algorithms"
    ] == [
        "RS256"
    ]

    assert (
        validation["audience"]
        == audience
    )

    assert (
        validation["issuer"]
        == f"https://{team_domain}"
    )

    options = validation[
        "options"
    ]

    assert isinstance(
        options,
        dict,
    )

    assert set(
        options["require"]
    ) == {
        "exp",
        "iat",
        "nbf",
        "sub",
        "aud",
        "iss",
    }


@pytest.mark.parametrize(
    "token_type",
    [
        None,
        "",
        "service",
        "user",
        "APP-invalid",
    ],
)
def test_cloudflare_non_application_token_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
    token_type,
) -> None:
    monkeypatch.setattr(
        admin_auth_service,
        "_get_cloudflare_access_team_domain",
        lambda: (
            "scanly.cloudflareaccess.com"
        ),
    )

    signing_key = SimpleNamespace(
        key="test-key"
    )

    class FakeJWKClient:
        def __init__(
            self,
            *args,
            **kwargs,
        ) -> None:
            del args
            del kwargs

        def get_signing_key_from_jwt(
            self,
            raw_token,
        ):
            del raw_token

            return signing_key

    monkeypatch.setattr(
        admin_auth_service,
        "PyJWKClient",
        FakeJWKClient,
    )

    monkeypatch.setattr(
        admin_auth_service.jwt,
        "decode",
        lambda *args, **kwargs: {
            "sub": TEST_SUBJECT,
            "type": token_type,
        },
    )

    with pytest.raises(
        AdminAuthenticationError
    ):
        (
            admin_auth_service
            ._decode_cloudflare_access_token(
                "cloudflare-token",
                audience="test-audience",
            )
        )


# ============================================================
# STEP-UP TOKEN VALIDATION
# ============================================================


def test_step_up_decoder_uses_only_step_up_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    calls: list[
        tuple[str, str]
    ] = []

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        calls.append(
            (
                raw_token,
                audience,
            )
        )

        return {
            "sub": TEST_SUBJECT,
            "email": TEST_EMAIL,
            "type": "app",
        }

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = (
        decode_admin_step_up_token(
            "  step-up-token  "
        )
    )

    assert (
        identity.subject
        == TEST_SUBJECT
    )

    assert (
        identity.email
        == TEST_EMAIL
    )

    assert calls == [
        (
            "step-up-token",
            STEP_UP_AUDIENCE,
        )
    ]


def test_step_up_decoder_does_not_use_normal_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        del raw_token

        assert (
            audience
            != NORMAL_AUDIENCE
        )

        assert (
            audience
            == STEP_UP_AUDIENCE
        )

        return {
            "sub": TEST_SUBJECT,
            "email": TEST_EMAIL,
            "type": "app",
        }

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = (
        decode_admin_step_up_token(
            "step-up-token"
        )
    )

    assert (
        identity.subject
        == TEST_SUBJECT
    )


@pytest.mark.parametrize(
    "raw_token",
    [
        "",
        "   ",
        "\t",
        "\n",
    ],
)
def test_blank_step_up_token_is_rejected(
    raw_token: str,
) -> None:
    with pytest.raises(
        AdminAuthenticationError
    ):
        decode_admin_step_up_token(
            raw_token
        )


def test_non_string_step_up_token_is_rejected() -> None:
    with pytest.raises(
        AdminAuthenticationError
    ):
        decode_admin_step_up_token(
            None  # type: ignore[arg-type]
        )


def test_step_up_requires_configured_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_cloudflare_auth_mode(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        "",
    )

    with pytest.raises(
        AdminAuthenticationError,
        match=(
            "step-up authentication "
            "audience is not configured"
        ),
    ):
        decode_admin_step_up_token(
            "step-up-token"
        )


def test_step_up_does_not_use_development_decoder(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    force_development_auth_mode(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        STEP_UP_AUDIENCE,
    )

    development_calls = 0

    def fake_development_decoder(
        raw_token: str,
    ):
        nonlocal development_calls

        del raw_token

        development_calls += 1

        raise AssertionError(
            "Step-up validation must not use "
            "the development token decoder."
        )

    def fake_cloudflare_decoder(
        raw_token: str,
        *,
        audience: str,
    ):
        assert (
            raw_token
            == "step-up-token"
        )

        assert (
            audience
            == STEP_UP_AUDIENCE
        )

        return {
            "sub": TEST_SUBJECT,
            "email": TEST_EMAIL,
            "type": "app",
        }

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_development_admin_token",
        fake_development_decoder,
    )

    monkeypatch.setattr(
        admin_auth_service,
        "_decode_cloudflare_access_token",
        fake_cloudflare_decoder,
    )

    identity = (
        decode_admin_step_up_token(
            "step-up-token"
        )
    )

    assert (
        identity.subject
        == TEST_SUBJECT
    )

    assert (
        development_calls
        == 0
    )


# ============================================================
# LOCAL ADMINISTRATOR AUTHORIZATION
# ============================================================


@pytest.mark.asyncio
async def test_existing_active_admin_is_authorized() -> None:
    admin = build_admin(
        AdminRole.ADMIN
    )

    db = FakeDatabaseSession(
        admin
    )

    identity = build_identity()

    result = await get_admin_for_identity(
        db,  # type: ignore[arg-type]
        identity=identity,
    )

    assert result is admin

    assert (
        db.execute_count
        == 1
    )


@pytest.mark.asyncio
async def test_valid_external_identity_without_local_admin_is_rejected() -> None:
    db = FakeDatabaseSession(
        None
    )

    identity = build_identity()

    with pytest.raises(
        AdminAuthenticationError
    ):
        await get_admin_for_identity(
            db,  # type: ignore[arg-type]
            identity=identity,
        )

    assert (
        db.execute_count
        == 1
    )


@pytest.mark.asyncio
async def test_disabled_local_admin_is_rejected() -> None:
    admin = build_admin(
        AdminRole.ADMIN,
        is_active=False,
    )

    db = FakeDatabaseSession(
        admin
    )

    identity = build_identity()

    with pytest.raises(
        AdminAccountDisabledError
    ):
        await get_admin_for_identity(
            db,  # type: ignore[arg-type]
            identity=identity,
        )

    assert (
        db.execute_count
        == 1
    )


# ============================================================
# SENSITIVE PERMISSION AUTHORIZATION
# ============================================================


@pytest.mark.asyncio
async def test_sensitive_permission_accepts_authorized_admin() -> None:
    dependency = (
        require_sensitive_permission(
            Permission.ACCESS_GRANT
        )
    )

    admin = build_admin(
        AdminRole.ADMIN
    )

    result = await dependency(
        admin
    )

    assert result is admin


@pytest.mark.asyncio
async def test_sensitive_permission_rejects_unauthorized_role() -> None:
    dependency = (
        require_sensitive_permission(
            Permission.ACCESS_GRANT
        )
    )

    reviewer = build_admin(
        AdminRole.REVIEWER
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependency(
            reviewer
        )

    assert (
        exc_info.value.status_code
        == 403
    )