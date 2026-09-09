from pydantic import BaseModel


class AdminSettingsSecurityResponse(BaseModel):
    production_mode: bool
    secure_cookies: bool
    rate_limiting_enabled: bool

    admin_session_idle_timeout_seconds: int
    admin_session_absolute_lifetime_seconds: int
    admin_session_rotation_interval_seconds: int
    admin_max_active_sessions: int

    sensitive_reauth_max_age_seconds: int

    session_ip_tracking_enabled: bool
    session_user_agent_tracking_enabled: bool


class AdminSettingsVerificationResponse(BaseModel):
    default_request_expiry_hours: int
    max_submissions: int
    verification_session_ttl_minutes: int

    discord_invite_max_age_seconds: int
    discord_invite_max_uses: int


class AdminSettingsEvidenceResponse(BaseModel):
    max_file_size_bytes: int
    allowed_content_types: list[str]

    temporary_upload_ttl_minutes: int
    signed_url_ttl_seconds: int

    automatic_evidence_deletion_enabled: bool
    retain_submitted_evidence_indefinitely: bool
    manual_evidence_deletion_enabled: bool

    raw_evidence_retention_days: int | None


class AdminSettingsIntegrationResponse(BaseModel):
    storage_configured: bool

    discord_oauth_configured: bool
    discord_bot_configured: bool

    cloudflare_access_configured: bool
    cloudflare_step_up_configured: bool

    email_delivery_configured: bool


class AdminSettingsResponse(BaseModel):
    environment: str

    security: AdminSettingsSecurityResponse
    verification: AdminSettingsVerificationResponse
    evidence: AdminSettingsEvidenceResponse
    integrations: AdminSettingsIntegrationResponse
