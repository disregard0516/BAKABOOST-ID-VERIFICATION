from datetime import timedelta
from urllib.parse import quote
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import ActorType, AuditAction, VerificationStatus
from app.core.security import (
    generate_verification_token,
    hash_verification_token,
)
from app.db.models.verification_request import VerificationRequest
from app.schemas.verification_request import VerificationRequestCreate
from app.services.audit.service import record_audit_event
from app.services.verification.state_machine import require_transition
from app.utils.time import utc_now


class InvalidVerificationRequestError(ValueError):
    pass


async def create_verification_request(
    session: AsyncSession,
    *,
    payload: VerificationRequestCreate,
    admin_id: UUID,
    ip_address: str | None = None,
) -> tuple[VerificationRequest, str]:
    """
    Create a verification request and return:

        (database request, raw token)

    SECURITY:
    The caller must only expose the raw token once.
    It must never be persisted or logged.
    """

    now = utc_now()

    expires_at = payload.expires_at

    if expires_at is None:
        expires_at = now + timedelta(
            hours=settings.verification_default_expiry_hours
        )

    if expires_at <= now:
        raise InvalidVerificationRequestError(
            "Expiration must be in the future."
        )

    raw_token = generate_verification_token()
    token_hash = hash_verification_token(raw_token)

    request = VerificationRequest(
        assigned_discord_user_id=int(
            payload.assigned_discord_user_id
        ),
        discord_username_snapshot=(
            payload.discord_username_snapshot
        ),
        token_hash=token_hash,
        status=VerificationStatus.PENDING,
        required_evidence_json=(
            payload.required_evidence.model_dump()
        ),
        expires_at=expires_at,
        submission_count=0,
        max_submissions=payload.max_submissions,
        created_by_admin_id=admin_id,
        created_at=now,
        updated_at=now,
        last_activity_at=now,
    )

    session.add(request)

    # Flush gives us database-generated state while remaining
    # inside the current transaction.
    await session.flush()

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.REQUEST_CREATED.value,
        verification_request_id=request.id,
        metadata={
            "status": VerificationStatus.PENDING.value,
            "expires_at": expires_at.isoformat(),
            "max_submissions": payload.max_submissions,
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(request)

    return request, raw_token


def build_verification_url(raw_token: str) -> str:
    safe_token = quote(
        raw_token,
        safe="",
    )

    return (
        f"{settings.frontend_url.rstrip('/')}"
        f"/v/{safe_token}"
    )

async def get_request_by_raw_token(
    session: AsyncSession,
    *,
    raw_token: str,
) -> VerificationRequest | None:
    token_hash = hash_verification_token(raw_token)

    result = await session.execute(
        select(VerificationRequest).where(
            VerificationRequest.token_hash == token_hash
        )
    )

    return result.scalar_one_or_none()

class VerificationRequestUnavailableError(Exception):
    pass


def ensure_request_is_available(
    request: VerificationRequest,
) -> None:
    now = utc_now()

    if request.status == VerificationStatus.REVOKED:
        raise VerificationRequestUnavailableError()

    if request.status == VerificationStatus.EXPIRED:
        raise VerificationRequestUnavailableError()

    if request.expires_at <= now:
        raise VerificationRequestUnavailableError()

async def expire_request_if_needed(
    session: AsyncSession,
    *,
    request: VerificationRequest,
) -> bool:
    if request.status in {
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
        VerificationStatus.EXPIRED,
        VerificationStatus.REVOKED,
    }:
        return False

    if request.expires_at > utc_now():
        return False

    require_transition(
        request.status,
        VerificationStatus.EXPIRED,
    )

    request.status = VerificationStatus.EXPIRED
    request.updated_at = utc_now()
    request.last_activity_at = utc_now()

    await record_audit_event(
        session,
        actor_type=ActorType.SYSTEM.value,
        actor_id=None,
        action=AuditAction.REQUEST_EXPIRED.value,
        verification_request_id=request.id,
    )

    await session.commit()

    return True