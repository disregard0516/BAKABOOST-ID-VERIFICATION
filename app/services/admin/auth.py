from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import jwt
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.admin import Admin

_AUTH_TIME_CLOCK_SKEW_SECONDS = 60

_DEV_ADMIN_ISSUER = "discord-verification-local-dev"
_DEV_ADMIN_AUDIENCE = "discord-verification-admin"


class AdminAuthenticationError(Exception):
    pass


class AdminAccountDisabledError(
    AdminAuthenticationError
):
    pass


class AdminMFARequiredError(
    AdminAuthenticationError
):
    pass


class AdminReauthenticationRequiredError(
    AdminAuthenticationError
):
    pass


@dataclass(frozen=True)
class AdminIdentity:
    subject: str
    email: str | None
    claims: dict[str, Any]


def _development_admin_auth_enabled() -> bool:
    return (
        settings.app_environment.strip().lower()
        == "development"
        and settings.dev_admin_auth_enabled
    )


def _decode_development_admin_token(
    raw_token: str,
) -> dict[str, Any]:
    secret = (
        settings.dev_admin_auth_secret.strip()
    )

    if len(secret) < 32:
        raise AdminAuthenticationError(
            "Development administrator "
            "authentication is not configured."
        )

    try:
        return jwt.decode(
            raw_token,
            secret,
            algorithms=["HS256"],
            audience=_DEV_ADMIN_AUDIENCE,
            issuer=_DEV_ADMIN_ISSUER,
            options={
                "require": [
                    "exp",
                    "iat",
                    "sub",
                    "auth_time",
                ],
            },
        )

    except Exception as exc:
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        ) from exc


def _decode_oidc_admin_token(
    raw_token: str,
) -> dict[str, Any]:
    if not settings.admin_auth_jwks_url:
        raise AdminAuthenticationError(
            "Admin authentication provider "
            "is not configured."
        )

    if not settings.admin_auth_issuer:
        raise AdminAuthenticationError(
            "Admin authentication issuer "
            "is not configured."
        )

    if not settings.admin_auth_audience:
        raise AdminAuthenticationError(
            "Admin authentication audience "
            "is not configured."
        )

    try:
        jwks_client = PyJWKClient(
            settings.admin_auth_jwks_url
        )

        signing_key = (
            jwks_client
            .get_signing_key_from_jwt(
                raw_token
            )
        )

        return jwt.decode(
            raw_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=(
                settings.admin_auth_audience
            ),
            issuer=(
                settings.admin_auth_issuer
            ),
            options={
                "require": [
                    "exp",
                    "iat",
                    "sub",
                ],
            },
        )

    except Exception as exc:
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        ) from exc


def decode_admin_token(
    raw_token: str,
) -> AdminIdentity:
    if _development_admin_auth_enabled():
        claims = (
            _decode_development_admin_token(
                raw_token
            )
        )
    else:
        claims = (
            _decode_oidc_admin_token(
                raw_token
            )
        )

    subject = claims.get("sub")

    if not subject:
        raise AdminAuthenticationError(
            "Administrator token has no "
            "subject."
        )

    return AdminIdentity(
        subject=str(subject),
        email=claims.get("email"),
        claims=claims,
    )


def admin_token_has_mfa(
    claims: dict[str, Any],
) -> bool:
    amr = claims.get("amr")

    if isinstance(amr, list):
        normalized = {
            str(value).lower()
            for value in amr
        }

        if {
            "mfa",
            "otp",
            "webauthn",
            "hwk",
        } & normalized:
            return True

    acr = claims.get("acr")

    if isinstance(acr, str):
        lowered = acr.lower()

        if (
            "mfa" in lowered
            or "multi" in lowered
        ):
            return True

    return False


def require_admin_mfa(
    identity: AdminIdentity,
) -> None:
    if not settings.admin_auth_required_mfa:
        return

    if not admin_token_has_mfa(
        identity.claims
    ):
        raise AdminMFARequiredError(
            "Administrator MFA is required."
        )


async def get_admin_for_identity(
    session: AsyncSession,
    *,
    identity: AdminIdentity,
) -> Admin:
    result = await session.execute(
        select(Admin).where(
            Admin.auth_subject
            == identity.subject
        )
    )

    admin = result.scalar_one_or_none()

    if admin is None:
        raise AdminAuthenticationError(
            "Administrator account is not "
            "authorized."
        )

    if not admin.is_active:
        raise AdminAccountDisabledError(
            "Administrator account is "
            "disabled."
        )

    return admin


def require_recent_admin_authentication(
    identity: AdminIdentity,
) -> None:
    auth_time = identity.claims.get(
        "auth_time"
    )

    if auth_time is None:
        raise (
            AdminReauthenticationRequiredError(
                "Recent authentication "
                "required."
            )
        )

    try:
        authenticated_at = (
            datetime.fromtimestamp(
                int(auth_time),
                tz=UTC,
            )
        )

    except (
        TypeError,
        ValueError,
        OverflowError,
        OSError,
    ):
        raise (
            AdminReauthenticationRequiredError(
                "Recent authentication "
                "required."
            )
        ) from None

    age_seconds = (
        datetime.now(UTC)
        - authenticated_at
    ).total_seconds()

    if (
        age_seconds
        < -_AUTH_TIME_CLOCK_SKEW_SECONDS
    ):
        raise (
            AdminReauthenticationRequiredError(
                "Recent authentication "
                "required."
            )
        )

    if (
        age_seconds
        > settings
        .admin_sensitive_reauth_max_age_seconds
    ):
        raise (
            AdminReauthenticationRequiredError(
                "Recent authentication "
                "required."
            )
        )