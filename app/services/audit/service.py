from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_event import AuditEvent


async def record_audit_event(
    session: AsyncSession,
    *,
    actor_type: str,
    actor_id: str | None,
    action: str,
    verification_request_id: UUID | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    """
    Add an audit event to the current database transaction.

    This function intentionally does not commit. The caller controls
    transaction atomicity.
    """

    event = AuditEvent(
        actor_type=actor_type,
        actor_id=actor_id,
        verification_request_id=verification_request_id,
        action=action,
        metadata_json=metadata or {},
        ip_address=ip_address,
    )

    session.add(event)

    return event