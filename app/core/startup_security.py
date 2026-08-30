from urllib.parse import urlparse

from app.core.config import settings


class UnsafeProductionConfiguration(RuntimeError):
    pass


def _require_https(
    name: str,
    value: str,
) -> None:
    parsed = urlparse(value)

    if parsed.scheme != "https":
        raise UnsafeProductionConfiguration(
            f"{name} must use HTTPS in production."
        )


def validate_runtime_security() -> None:
    if (
        settings.app_environment
        != "production"
    ):
        return

    if settings.debug:
        raise UnsafeProductionConfiguration(
            "DEBUG must be false in production."
        )

    _require_https(
        "FRONTEND_URL",
        settings.frontend_url,
    )

    _require_https(
        "BACKEND_URL",
        settings.backend_url,
    )

    if not settings.cookie_secure:
        raise UnsafeProductionConfiguration(
            "COOKIE_SECURE must be true in production."
        )

    forbidden_secrets = {
        "",
        "CHANGE_ME_IN_ENV",
        (
            "replace-this-with-a-long-"
            "random-secret"
        ),
    }

    secret_values = {
        "SESSION_SECRET": (
            settings.session_secret
        ),
        "VERIFICATION_TOKEN_PEPPER": (
            settings
            .verification_token_pepper
        ),
        "ACCESS_GRANT_ENCRYPTION_KEY": (
            settings
            .access_grant_encryption_key
        ),
    }

    for name, value in (
        secret_values.items()
    ):
        if (
            value.strip()
            in forbidden_secrets
        ):
            raise (
                UnsafeProductionConfiguration(
                    f"{name} is not securely "
                    "configured."
                )
            )

    if not settings.admin_auth_issuer:
        raise UnsafeProductionConfiguration(
            "Admin authentication issuer is missing."
        )

    if not settings.admin_auth_audience:
        raise UnsafeProductionConfiguration(
            "Admin authentication audience is missing."
        )

    if not settings.admin_auth_jwks_url:
        raise UnsafeProductionConfiguration(
            "Admin JWKS URL is missing."
        )

    #
    # Production rate limiting is mandatory.
    #
    # An operator must not be able to bypass
    # abuse protection by setting
    # RATE_LIMITING_ENABLED=false.
    #
    if not settings.rate_limiting_enabled:
        raise UnsafeProductionConfiguration(
            "Rate limiting must be enabled "
            "in production."
        )

    if not settings.redis_url.strip():
        raise UnsafeProductionConfiguration(
            "Redis is required for production "
            "rate limiting."
        )

    #
    # Reject obviously invalid Redis URLs
    # before the application starts serving
    # traffic.
    #
    redis_scheme = urlparse(
        settings.redis_url
    ).scheme.lower()

    if redis_scheme not in {
        "redis",
        "rediss",
        "unix",
    }:
        raise UnsafeProductionConfiguration(
            "REDIS_URL has an unsupported scheme."
        )