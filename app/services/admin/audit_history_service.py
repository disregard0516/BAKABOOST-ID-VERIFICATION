from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_event import AuditEvent


async def get_request_audit_history(
    session: AsyncSession,
    *,
    request_id: UUID,
) -> list[AuditEvent]:
    result = await session.execute(
        select(AuditEvent)
        .where(
            AuditEvent.verification_request_id
            == request_id
        )
        .order_by(
            AuditEvent.created_at.asc()
        )
    )

    return list(
        result.scalars().all()
    )