from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_event import AuditEvent


async def get_request_audit_history(
    session: AsyncSession,
    *,
    request_id: UUID,
) -> list[AuditEvent]:
    """
    Return the chronological audit history for one
    verification request.

    This existing behavior remains intentionally unchanged.
    """
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


async def get_admin_audit_activity(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    action: str | None = None,
    outcome: str | None = None,
    actor_type: str | None = None,
    actor_id: str | None = None,
    verification_request_id: UUID | None = None,
    request_id: str | None = None,
) -> tuple[list[AuditEvent], int]:
    """
    Return global append-only audit activity for authorized
    administrators.

    Filters are exact matches intentionally. This avoids
    expensive unrestricted wildcard searches across the
    security audit table.

    Newest events are returned first. UUID is used as a
    deterministic secondary ordering key when timestamps
    happen to match.
    """
    filters = []

    if action is not None:
        filters.append(
            AuditEvent.action == action
        )

    if outcome is not None:
        filters.append(
            AuditEvent.outcome == outcome
        )

    if actor_type is not None:
        filters.append(
            AuditEvent.actor_type == actor_type
        )

    if actor_id is not None:
        filters.append(
            AuditEvent.actor_id == actor_id
        )

    if verification_request_id is not None:
        filters.append(
            AuditEvent.verification_request_id
            == verification_request_id
        )

    if request_id is not None:
        filters.append(
            AuditEvent.request_id == request_id
        )

    count_statement = (
        select(
            func.count(AuditEvent.id)
        )
        .where(*filters)
    )

    total_result = await session.execute(
        count_statement
    )

    total = int(
        total_result.scalar_one()
    )

    offset = (
        page - 1
    ) * page_size

    statement = (
        select(AuditEvent)
        .where(*filters)
        .order_by(
            AuditEvent.created_at.desc(),
            AuditEvent.id.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    result = await session.execute(
        statement
    )

    return (
        list(
            result.scalars().all()
        ),
        total,
    )
