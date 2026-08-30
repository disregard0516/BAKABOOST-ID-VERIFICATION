from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.api.dependencies import (
    require_sensitive_permission,
)
from app.core.config import settings
from app.core.constants import AdminRole
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.services.admin.auth import (
    AdminIdentity,
    AdminMFARequiredError,
    AdminReauthenticationRequiredError,
    admin_token_has_mfa,
    require_admin_mfa,
    require_recent_admin_authentication,
)


def build_identity(
    *,
    auth_time: int | None = None,
    amr: list[str] | None = None,
) -> AdminIdentity:
    claims: dict[str, object] = {
        "sub": "admin-test-subject",
    }

    if auth_time is not None:
        claims["auth_time"] = auth_time

    if amr is not None:
        claims["amr"] = amr

    return AdminIdentity(
        subject="admin-test-subject",
        email="admin@example.com",
        claims=claims,
    )


def build_admin(
    role: AdminRole,
) -> Admin:
    return Admin(
        auth_subject="admin-test-subject",
        email="admin@example.com",
        display_name="Test Admin",
        role=role,
        is_active=True,
    )


def test_mfa_amr_is_recognized() -> None:
    identity = build_identity(
        amr=["pwd", "webauthn"],
    )

    assert admin_token_has_mfa(
        identity.claims
    )


def test_missing_mfa_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "admin_auth_required_mfa",
        True,
    )

    identity = build_identity(
        amr=["pwd"],
    )

    with pytest.raises(
        AdminMFARequiredError
    ):
        require_admin_mfa(identity)


def test_recent_authentication_is_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        (
            "admin_sensitive_"
            "reauth_max_age_seconds"
        ),
        900,
    )

    auth_time = int(
        datetime.now(UTC).timestamp()
    )

    identity = build_identity(
        auth_time=auth_time,
    )

    require_recent_admin_authentication(
        identity
    )


def test_stale_authentication_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        (
            "admin_sensitive_"
            "reauth_max_age_seconds"
        ),
        900,
    )

    auth_time = int(
        (
            datetime.now(UTC)
            - timedelta(minutes=30)
        ).timestamp()
    )

    identity = build_identity(
        auth_time=auth_time,
    )

    with pytest.raises(
        AdminReauthenticationRequiredError
    ):
        require_recent_admin_authentication(
            identity
        )


def test_future_authentication_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        (
            "admin_sensitive_"
            "reauth_max_age_seconds"
        ),
        900,
    )

    auth_time = int(
        (
            datetime.now(UTC)
            + timedelta(minutes=5)
        ).timestamp()
    )

    identity = build_identity(
        auth_time=auth_time,
    )

    with pytest.raises(
        AdminReauthenticationRequiredError
    ):
        require_recent_admin_authentication(
            identity
        )


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

    result = await dependency(admin)

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
        await dependency(reviewer)

    assert (
        exc_info.value.status_code
        == 403
    )