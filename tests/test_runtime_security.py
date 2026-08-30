import pytest

from app.core.config import settings
from app.core.startup_security import (
    UnsafeProductionConfiguration,
    validate_runtime_security,
)


def configure_valid_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "app_environment",
        "production",
    )
    monkeypatch.setattr(
        settings,
        "debug",
        False,
    )
    monkeypatch.setattr(
        settings,
        "frontend_url",
        "https://verify.example.com",
    )
    monkeypatch.setattr(
        settings,
        "backend_url",
        "https://api.example.com",
    )
    monkeypatch.setattr(
        settings,
        "cookie_secure",
        True,
    )
    monkeypatch.setattr(
        settings,
        "session_secret",
        "secure-session-secret-value",
    )
    monkeypatch.setattr(
        settings,
        "verification_token_pepper",
        "secure-verification-pepper",
    )
    monkeypatch.setattr(
        settings,
        "access_grant_encryption_key",
        "secure-access-encryption-key",
    )
    monkeypatch.setattr(
        settings,
        "admin_auth_issuer",
        "https://auth.example.com/",
    )
    monkeypatch.setattr(
        settings,
        "admin_auth_audience",
        "discord-verification-admin",
    )
    monkeypatch.setattr(
        settings,
        "admin_auth_jwks_url",
        (
            "https://auth.example.com/"
            ".well-known/jwks.json"
        ),
    )
    monkeypatch.setattr(
        settings,
        "rate_limiting_enabled",
        True,
    )
    monkeypatch.setattr(
        settings,
        "redis_url",
        "rediss://redis.example.com:6379/0",
    )


def test_valid_production_security_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    validate_runtime_security()


def test_production_cannot_disable_rate_limiting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "rate_limiting_enabled",
        False,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match="Rate limiting must be enabled",
    ):
        validate_runtime_security()


def test_production_requires_redis(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "redis_url",
        "",
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match="Redis is required",
    ):
        validate_runtime_security()


def test_production_rejects_invalid_redis_scheme(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "redis_url",
        "https://redis.example.com",
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match="unsupported scheme",
    ):
        validate_runtime_security()


def test_development_can_run_without_redis(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "app_environment",
        "development",
    )

    monkeypatch.setattr(
        settings,
        "redis_url",
        "",
    )

    validate_runtime_security()