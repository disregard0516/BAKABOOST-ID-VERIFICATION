from __future__ import annotations

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    require_permission,
)
from app.core.config import settings
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.admin_settings import (
    AdminSettingsEvidenceResponse,
    AdminSettingsIntegrationResponse,
    AdminSettingsResponse,
    AdminSettingsSecurityResponse,
    AdminSettingsVerificationResponse,
)

router = APIRouter(
    prefix="/settings",
    tags=["Admin Settings"],
)


def _configured(
    *values: object,
) -> bool:
    """
    Return whether every required configuration value exists.

    Only readiness booleans are exposed. Configuration secrets
    themselves are never serialized.
    """

    for value in values:
        if value is None:
            return False

        if isinstance(value, str):
            if not value.strip():
                return False

            continue

        if not value:
            return False

    return True


@router.get(
    "",
    response_model=AdminSettingsResponse,
)
async def get_admin_settings(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.SECURITY_MANAGE
            )
        ),
    ],
) -> AdminSettingsResponse:
    """
    Return production-safe operational configuration.

    This endpoint is intentionally read-only. It never returns
    database URLs, Redis URLs, API keys, private keys, session
    secrets, verification peppers, OAuth secrets, bot tokens,
    Cloudflare audience values, cookie credentials, or similar
    sensitive configuration.
    """

    allowed_content_types = [
        item.strip()
        for item in (
            settings.evidence_allowed_content_types
            .split(",")
        )
        if item.strip()
    ]

    environment = (
        str(settings.app_environment)
        .strip()
        .lower()
    )

    cloudflare_access_ready = _configured(
        settings.cloudflare_access_team_domain,
        settings.cloudflare_access_audience,
    )

    cloudflare_step_up_ready = _configured(
        settings.cloudflare_access_team_domain,
        settings.cloudflare_access_step_up_audience,
    )

    return AdminSettingsResponse(
        environment=environment,
        security=AdminSettingsSecurityResponse(
            production_mode=(
                environment == "production"
            ),
            secure_cookies=bool(
                settings.cookie_secure
            ),
            rate_limiting_enabled=bool(
                settings.rate_limiting_enabled
            ),
            admin_session_idle_timeout_seconds=(
                settings
                .admin_session_idle_timeout_seconds
            ),
            admin_session_absolute_lifetime_seconds=(
                settings
                .admin_session_absolute_lifetime_seconds
            ),
            admin_session_rotation_interval_seconds=(
                settings
                .admin_session_rotation_interval_seconds
            ),
            admin_max_active_sessions=(
                settings.admin_max_active_sessions
            ),
            sensitive_reauth_max_age_seconds=(
                settings
                .admin_sensitive_reauth_max_age_seconds
            ),
            session_ip_tracking_enabled=bool(
                settings.admin_session_track_ip
            ),
            session_user_agent_tracking_enabled=bool(
                settings
                .admin_session_track_user_agent
            ),
        ),
        verification=AdminSettingsVerificationResponse(
            default_request_expiry_hours=(
                settings.verification_default_expiry_hours
            ),
            max_submissions=(
                settings.verification_max_submissions
            ),
            verification_session_ttl_minutes=(
                settings.verification_session_ttl_minutes
            ),
            discord_invite_max_age_seconds=(
                settings.discord_invite_max_age_seconds
            ),
            discord_invite_max_uses=(
                settings.discord_invite_max_uses
            ),
        ),
        evidence=AdminSettingsEvidenceResponse(
            max_file_size_bytes=(
                settings.evidence_max_file_size_bytes
            ),
            allowed_content_types=(
                allowed_content_types
            ),
            temporary_upload_ttl_minutes=(
                settings.temporary_upload_ttl_minutes
            ),
            signed_url_ttl_seconds=(
                settings.evidence_signed_url_ttl_seconds
            ),
            automatic_evidence_deletion_enabled=False,
            retain_submitted_evidence_indefinitely=True,
            manual_evidence_deletion_enabled=True,
            raw_evidence_retention_days=None,
        ),
        integrations=AdminSettingsIntegrationResponse(
            storage_configured=_configured(
                settings.s3_bucket_name,
                settings.s3_access_key_id,
                settings.s3_secret_access_key,
            ),
            discord_oauth_configured=_configured(
                settings.discord_client_id,
                settings.discord_client_secret,
                settings.discord_redirect_uri,
            ),
            discord_bot_configured=_configured(
                settings.discord_bot_token,
                settings.discord_guild_id,
                settings.discord_invite_channel_id,
            ),
            cloudflare_access_configured=(
                cloudflare_access_ready
            ),
            cloudflare_step_up_configured=(
                cloudflare_step_up_ready
            ),
            email_delivery_configured=(
                settings.email_provider
                .strip()
                .lower()
                == "resend"
                and _configured(
                    settings.resend_api_key,
                    settings.admin_invitation_from_email,
                )
            ),
        ),
    )
