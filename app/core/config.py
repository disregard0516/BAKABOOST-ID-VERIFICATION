from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Discord Verification API"
    app_environment: str = "development"
    debug: bool = True

    api_prefix: str = "/api"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/discord_verification"
    )

    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = (
        "http://localhost:8000/api/auth/discord/callback"
    )
    discord_api_base_url: str = "https://discord.com/api/v10"
    discord_authorize_url: str = "https://discord.com/oauth2/authorize"
    discord_token_url: str = "https://discord.com/api/oauth2/token"

    discord_oauth_scope: str = "identify"

    discord_oauth_state_ttl_seconds: int = 600
    verification_session_ttl_minutes: int = 30

    mobile_capture_ttl_minutes: int = 10

    mobile_capture_cookie_name: str = (
        "mobile_capture_session"
    )


    # --------------------------------------------------------
    # Cloudflare Access administrator authentication
    # --------------------------------------------------------

    # Example:
    # bakaboost.cloudflareaccess.com
    #
    # Store the hostname only. The backend derives the
    # expected issuer and signing-certificate endpoint from it.
    cloudflare_access_team_domain: str = ""

    # Cloudflare Access Application Audience (AUD) tag.
    # This binds assertions to the specific BAKABOOST
    # administrator Access application.
    cloudflare_access_audience: str = ""

        # --------------------------------------------------------
    # Administrator session security
    # --------------------------------------------------------

    # Production authentication cookie.
    #
    # __Host- requires:
    # - Secure
    # - Path=/
    # - no Domain attribute
    #
    admin_session_cookie_name: str = (
        "__Host-bakaboost_admin_session"
    )

    # Local development runs over plain HTTP, where __Host-
    # cookies cannot be used.
    admin_session_development_cookie_name: str = (
        "bakaboost_admin_session"
    )

    # Production administrator CSRF cookie.
    admin_csrf_cookie_name: str = (
        "__Host-bakaboost_admin_csrf"
    )

    # Local-development CSRF cookie.
    admin_csrf_development_cookie_name: str = (
        "bakaboost_admin_csrf"
    )

    admin_csrf_header_name: str = (
        "X-Admin-CSRF-Token"
    )

    # secrets.token_urlsafe() receives a byte count.
    # Keep both credentials at >= 32 bytes of entropy.
    admin_session_token_bytes: int = 48
    admin_csrf_token_bytes: int = 32

    # Session expires after 30 minutes without activity.
    admin_session_idle_timeout_seconds: int = 30 * 60

    # Hard maximum lifetime of an administrator session:
    # 8 hours regardless of activity.
    admin_session_absolute_lifetime_seconds: int = 8 * 60 * 60

    # Rotate session credentials/security material
    # periodically during an active session.
    admin_session_rotation_interval_seconds: int = 15 * 60

    # Limit concurrent sessions for one administrator.
    admin_max_active_sessions: int = 3

    # Keep security context for session validation/auditing.
    admin_session_track_ip: bool = True
    admin_session_track_user_agent: bool = True

    dev_admin_auth_enabled: bool = False
    dev_admin_auth_secret: str = ""
    dev_admin_auth_subject: str = "local-e2e-admin"

    session_secret: str = "CHANGE_ME_IN_ENV"

    verification_token_pepper: str = ""
    verification_token_bytes: int = 32
    verification_default_expiry_hours: int = 24
    verification_max_submissions: int = 1

    evidence_max_file_size_bytes: int = 10 * 1024 * 1024
    evidence_allowed_content_types: str = (
        "image/jpeg,image/png,image/webp,application/pdf"
    )

    temporary_upload_ttl_minutes: int = 60

    evidence_signed_url_ttl_seconds: int = 300

    s3_endpoint_url: str = ""
    s3_region: str = "auto"
    s3_bucket_name: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""

    discord_bot_token: str = ""

    discord_guild_id: str = ""
    discord_invite_channel_id: str = ""

    discord_invite_max_age_seconds: int = 900
    discord_invite_max_uses: int = 1

    access_grant_encryption_key: str = ""

    allowed_origins: str = "http://localhost:3000"
    allowed_hosts: str = "localhost,127.0.0.1"

    redis_url: str = ""

    rate_limiting_enabled: bool = True

    public_request_rate_limit: int = 60
    oauth_start_rate_limit: int = 15
    evidence_upload_rate_limit: int = 20
    submission_rate_limit: int = 10
    admin_api_rate_limit: int = 120

    admin_sensitive_reauth_max_age_seconds: int = 900

    cookie_secure: bool = False
    cookie_domain: str | None = None

    csrf_cookie_name: str = "verification_csrf"
    csrf_header_name: str = "X-CSRF-Token"

    csrf_token_bytes: int = 32

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
