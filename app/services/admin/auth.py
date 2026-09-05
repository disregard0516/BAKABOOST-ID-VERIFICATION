from __future__ import annotations

import ssl
from dataclasses import dataclass
from typing import Any

import certifi
import jwt
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.admin import Admin

_DEV_ADMIN_ISSUER = (
    "discord-verification-local-dev"
)

_DEV_ADMIN_AUDIENCE = (
    "discord-verification-admin"
)

_CLOUDFLARE_ACCESS_SUFFIX = (
    ".cloudflareaccess.com"
)


# ============================================================
# EXCEPTIONS
# ============================================================


class AdminAuthenticationError(Exception):
    pass


class AdminAccountDisabledError(
    AdminAuthenticationError
):
    pass


# ============================================================
# IDENTITY MODEL
# ============================================================


@dataclass(frozen=True)
class AdminIdentity:
    subject: str
    email: str | None
    claims: dict[str, Any]


# ============================================================
# ENVIRONMENT HELPERS
# ============================================================


def _development_admin_auth_enabled() -> bool:
    """
    Development authentication is available only when:

    - the application is explicitly in development mode;
    - the dedicated development-auth flag is enabled.

    Production runtime validation separately forbids this
    mechanism.
    """

    return (
        settings.app_environment
        .strip()
        .lower()
        == "development"
        and settings.dev_admin_auth_enabled
    )


# ============================================================
# DEVELOPMENT TOKEN VALIDATION
# ============================================================


def _decode_development_admin_token(
    raw_token: str,
) -> dict[str, Any]:
    """
    Validate the dedicated local-development administrator
    token.

    This mechanism is intentionally unavailable unless
    development authentication is explicitly enabled.
    """

    secret = (
        settings.dev_admin_auth_secret
        .strip()
    )

    if len(secret) < 32:
        raise AdminAuthenticationError(
            "Development administrator "
            "authentication is not configured."
        )

    try:
        claims = jwt.decode(
            raw_token,
            secret,
            algorithms=[
                "HS256",
            ],
            audience=_DEV_ADMIN_AUDIENCE,
            issuer=_DEV_ADMIN_ISSUER,
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

    if not isinstance(
        claims,
        dict,
    ):
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    return claims


# ============================================================
# CLOUDFLARE ACCESS CONFIGURATION
# ============================================================


def _get_cloudflare_access_team_domain() -> str:
    team_domain = (
        settings
        .cloudflare_access_team_domain
        .strip()
        .lower()
    )

    if (
        not team_domain
        or not team_domain.endswith(
            _CLOUDFLARE_ACCESS_SUFFIX
        )
    ):
        raise AdminAuthenticationError(
            "Administrator authentication "
            "provider is not configured."
        )

    return team_domain


def _get_cloudflare_access_audience() -> str:
    audience = (
        settings
        .cloudflare_access_audience
        .strip()
    )

    if not audience:
        raise AdminAuthenticationError(
            "Administrator authentication "
            "audience is not configured."
        )

    return audience


def _cloudflare_access_issuer(
    team_domain: str,
) -> str:
    return f"https://{team_domain}"


def _cloudflare_access_jwks_url(
    team_domain: str,
) -> str:
    return (
        f"https://{team_domain}"
        "/cdn-cgi/access/certs"
    )


# ============================================================
# CLOUDFLARE ACCESS JWT VALIDATION
# ============================================================


def _decode_cloudflare_access_token(
    raw_token: str,
) -> dict[str, Any]:
    """
    Cryptographically validate a Cloudflare Access
    application JWT.

    Validation includes:

    - RS256 signature;
    - dynamically retrieved Cloudflare Access signing key;
    - expected Zero Trust team issuer;
    - expected Access application audience;
    - expiration;
    - not-before;
    - issued-at;
    - immutable subject;
    - application-token type.

    MFA is deliberately NOT inferred from this JWT.
    Independent MFA is enforced by the Cloudflare Access
    application/policy boundary.
    """

    team_domain = (
        _get_cloudflare_access_team_domain()
    )

    audience = (
        _get_cloudflare_access_audience()
    )

    issuer = (
        _cloudflare_access_issuer(
            team_domain
        )
    )

    jwks_url = (
        _cloudflare_access_jwks_url(
            team_domain
        )
    )

    try:
        ssl_context = ssl.create_default_context(
            cafile=certifi.where()
        )

        jwks_client = PyJWKClient(
            jwks_url,
            ssl_context=ssl_context,
        )

        signing_key = (
            jwks_client
            .get_signing_key_from_jwt(
                raw_token
            )
        )

        claims = jwt.decode(
            raw_token,
            signing_key.key,
            algorithms=[
                "RS256",
            ],
            audience=audience,
            issuer=issuer,
            options={
                "require": [
                    "exp",
                    "iat",
                    "nbf",
                    "sub",
                    "aud",
                    "iss",
                ],
            },
        )

    except Exception as exc:
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        ) from exc

    if not isinstance(
        claims,
        dict,
    ):
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    token_type = claims.get(
        "type"
    )

    if (
        not isinstance(
            token_type,
            str,
        )
        or token_type.strip().lower()
        != "app"
    ):
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    return claims


# ============================================================
# IDENTITY DECODING
# ============================================================


def decode_admin_token(
    raw_token: str,
) -> AdminIdentity:
    """
    Validate an administrator identity assertion.

    Production uses a Cloudflare Access application JWT.

    Development may use the dedicated local token only when
    development authentication is explicitly enabled.

    External authentication never grants BAKABOOST
    administrator authorization by itself.
    """

    if not isinstance(
        raw_token,
        str,
    ):
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    normalized_token = (
        raw_token.strip()
    )

    if not normalized_token:
        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    if _development_admin_auth_enabled():
        claims = (
            _decode_development_admin_token(
                normalized_token
            )
        )

    else:
        claims = (
            _decode_cloudflare_access_token(
                normalized_token
            )
        )

    subject = claims.get(
        "sub"
    )

    if not isinstance(
        subject,
        str,
    ):
        raise AdminAuthenticationError(
            "Administrator authentication "
            "has no subject."
        )

    normalized_subject = (
        subject.strip()
    )

    if not normalized_subject:
        raise AdminAuthenticationError(
            "Administrator authentication "
            "has no subject."
        )

    email_value = claims.get(
        "email"
    )

    email: str | None = None

    if isinstance(
        email_value,
        str,
    ):
        normalized_email = (
            email_value
            .strip()
            .lower()
        )

        if normalized_email:
            email = normalized_email

    return AdminIdentity(
        subject=normalized_subject,
        email=email,
        claims=claims,
    )


# ============================================================
# LOCAL ADMINISTRATOR AUTHORIZATION
# ============================================================


async def get_admin_for_identity(
    session: AsyncSession,
    *,
    identity: AdminIdentity,
) -> Admin:
    """
    Bind the externally authenticated immutable subject to an
    explicitly provisioned local administrator.

    A valid Cloudflare Access identity is not automatically a
    BAKABOOST administrator.
    """

    result = await session.execute(
        select(
            Admin
        ).where(
            Admin.auth_subject
            == identity.subject
        )
    )

    admin = (
        result.scalar_one_or_none()
    )

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