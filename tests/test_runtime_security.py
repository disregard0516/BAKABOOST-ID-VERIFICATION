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
        "dev_admin_auth_enabled",
        False,
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_access_team_domain",
        "scanly.cloudflareaccess.com",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_access_audience",
        "scanly-admin-access-audience",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        "scanly-admin-step-up-audience",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_access_enrollment_audience",
        "scanly-admin-enrollment-audience",
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


def test_production_rejects_debug(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "debug",
        True,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match="DEBUG must be false",
    ):
        validate_runtime_security()


@pytest.mark.parametrize(
    ("setting_name", "value", "expected"),
    [
        (
            "frontend_url",
            "http://verify.example.com",
            "FRONTEND_URL must use a valid HTTPS URL",
        ),
        (
            "backend_url",
            "http://api.example.com",
            "BACKEND_URL must use a valid HTTPS URL",
        ),
    ],
)
def test_production_requires_https_application_urls(
    monkeypatch: pytest.MonkeyPatch,
    setting_name: str,
    value: str,
    expected: str,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        setting_name,
        value,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=expected,
    ):
        validate_runtime_security()


def test_production_requires_secure_cookies(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cookie_secure",
        False,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match="COOKIE_SECURE must be true",
    ):
        validate_runtime_security()


def test_production_rejects_development_admin_auth(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "dev_admin_auth_enabled",
        True,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "Development administrator "
            "authentication must be disabled"
        ),
    ):
        validate_runtime_security()


def test_production_requires_cloudflare_access_team_domain(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_team_domain",
        "",
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "Cloudflare Access team domain "
            "is missing"
        ),
    ):
        validate_runtime_security()


@pytest.mark.parametrize(
    "value",
    [
        "example.com",
        "https://scanly.cloudflareaccess.com",
        "scanly.cloudflareaccess.com/path",
        "scanly.cloudflareaccess.com:443",
        "scanly.cloudflareaccess.com?test=1",
        "scanly.cloudflareaccess.com#fragment",
    ],
)
def test_production_rejects_invalid_cloudflare_access_team_domain(
    monkeypatch: pytest.MonkeyPatch,
    value: str,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_team_domain",
        value,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "CLOUDFLARE_ACCESS_TEAM_DOMAIN "
            "must be a valid "
            "cloudflareaccess.com hostname"
        ),
    ):
        validate_runtime_security()


def test_production_requires_cloudflare_access_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_audience",
        "",
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "Cloudflare Access audience "
            "is missing"
        ),
    ):
        validate_runtime_security()

def test_production_requires_cloudflare_access_step_up_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        "",
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "Cloudflare Access step-up audience "
            "is missing"
        ),
    ):
        validate_runtime_security()


def test_production_requires_distinct_cloudflare_access_step_up_audience(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_valid_production(
        monkeypatch
    )

    monkeypatch.setattr(
        settings,
        "cloudflare_access_step_up_audience",
        settings.cloudflare_access_audience,
    )

    with pytest.raises(
        UnsafeProductionConfiguration,
        match=(
            "Cloudflare Access step-up audience must be "
            "different"
        ),
    ):
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


def test_development_can_run_without_production_security(
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

    monkeypatch.setattr(
        settings,
        "dev_admin_auth_enabled",
        True,
    )

    validate_runtime_security()