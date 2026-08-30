from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AuditAction,
    VerificationStatus,
)
from app.db.models.verification_request import VerificationRequest
from app.services.audit.service import record_audit_event
from app.services.verification.state_machine import require_transition
from app.utils.time import utc_now


async def expire_due_requests(
    session: AsyncSession,
) -> int:
    now = utc_now()

    result = await session.execute(
        select(VerificationRequest).where(
            VerificationRequest.status.in_(
                [
                    VerificationStatus.PENDING,
                    VerificationStatus.QUEUED,
                    VerificationStatus.MORE_INFO,
                ]
            ),
            VerificationRequest.expires_at <= now,
        )
    )

    requests = list(
        result.scalars().all()
    )

    processed = 0

    for request in requests:
        require_transition(
            request.status,
            VerificationStatus.EXPIRED,
        )

        request.status = VerificationStatus.EXPIRED
        request.updated_at = now
        request.last_activity_at = now

        await record_audit_event(
            session,
            actor_type=ActorType.SYSTEM.value,
            actor_id=None,
            action=AuditAction.REQUEST_EXPIRED.value,
            verification_request_id=request.id,
        )

        processed += 1

    await session.commit()

    return processed