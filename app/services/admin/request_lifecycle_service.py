from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    AccessGrantStatus,
    ActorType,
    AuditAction,
    VerificationStatus,
)
from app.db.models.admin import Admin
from app.db.models.discord_access_grant import DiscordAccessGrant
from app.db.models.verification_request import VerificationRequest
from app.db.models.verification_result import (
    VerificationResult,
)
from app.services.audit.service import record_audit_event
from app.services.verification.state_machine import require_transition
from app.utils.time import utc_now


class RequestLifecycleError(ValueError):
    pass

async def revoke_request(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    reason: str | None = None,
    ip_address: str | None = None,
) -> VerificationRequest:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise RequestLifecycleError(
            "Verification request not found."
        )

    if request.status == VerificationStatus.REVOKED:
        return request

    if request.status == VerificationStatus.EXPIRED:
        raise RequestLifecycleError(
            "Expired requests cannot be revoked directly."
        )

    require_transition(
        request.status,
        VerificationStatus.REVOKED,
    )

    now = utc_now()

    request.status = VerificationStatus.REVOKED
    request.revoked_at = now
    request.updated_at = now
    request.last_activity_at = now

    grant_result = await session.execute(
        select(DiscordAccessGrant).where(
            DiscordAccessGrant.verification_request_id
            == request.id
        )
    )

    grant = grant_result.scalar_one_or_none()

    if grant is not None:
        grant.status = AccessGrantStatus.REVOKED
        grant.revoked_at = now
        grant.updated_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.REQUEST_REVOKED.value,
        verification_request_id=request.id,
        metadata={
            "reason": reason,
        },
        ip_address=ip_address,
    )

    result_query = await session.execute(
        select(VerificationResult).where(
            VerificationResult.verification_request_id
            == request.id
        )
    )
    verification_result = (
        result_query.scalar_one_or_none()
    )

    if verification_result is not None:
        verification_result.verified = False
        verification_result.revoked_at = now
        verification_result.updated_at = now

    await session.commit()
    await session.refresh(request)

    return request

async def extend_request_expiration(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    expires_at: datetime,
    ip_address: str | None = None,
) -> VerificationRequest:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise RequestLifecycleError(
            "Verification request not found."
        )

    now = utc_now()

    if expires_at <= now:
        raise RequestLifecycleError(
            "New expiration must be in the future."
        )

    if request.status == VerificationStatus.REVOKED:
        raise RequestLifecycleError(
            "Revoked requests cannot be extended."
        )

    old_expiration = request.expires_at

    request.expires_at = expires_at
    request.updated_at = now
    request.last_activity_at = now

    if request.status == VerificationStatus.EXPIRED:
        request.status = VerificationStatus.PENDING

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=(
            AuditAction
            .REQUEST_EXPIRATION_EXTENDED
            .value
        ),
        verification_request_id=request.id,
        metadata={
            "old_expires_at": old_expiration.isoformat(),
            "new_expires_at": expires_at.isoformat(),
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(request)

    return request

async def assign_reviewer(
    session: AsyncSession,
    *,
    request_id: UUID,
    reviewer_admin_id: UUID,
    acting_admin_id: UUID,
    ip_address: str | None = None,
) -> VerificationRequest:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise RequestLifecycleError(
            "Verification request not found."
        )

    reviewer = await session.get(
        Admin,
        reviewer_admin_id,
    )

    if reviewer is None or not reviewer.is_active:
        raise RequestLifecycleError(
            "Reviewer is not available."
        )

    request.assigned_reviewer_id = reviewer_admin_id
    request.updated_at = utc_now()
    request.last_activity_at = utc_now()

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(acting_admin_id),
        action=AuditAction.CASE_ASSIGNED.value,
        verification_request_id=request.id,
        metadata={
            "assigned_reviewer_id": str(
                reviewer_admin_id
            )
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(request)

    return request

