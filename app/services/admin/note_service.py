from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ActorType, AuditAction
from app.db.models.admin_note import AdminNote
from app.db.models.verification_request import VerificationRequest
from app.services.audit.service import record_audit_event


class AdminNoteError(ValueError):
    pass


async def add_admin_note(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    note: str,
    ip_address: str | None = None,
) -> AdminNote:
    request = await session.get(
        VerificationRequest,
        request_id,
    )

    if request is None:
        raise AdminNoteError(
            "Verification request not found."
        )

    admin_note = AdminNote(
        verification_request_id=request_id,
        admin_id=admin_id,
        note=note,
    )

    session.add(admin_note)
    await session.flush()

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.ADMIN_NOTE_CREATED.value,
        verification_request_id=request_id,
        metadata={
            "note_id": str(admin_note.id),
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(admin_note)

    return admin_note


async def list_admin_notes(
    session: AsyncSession,
    *,
    request_id: UUID,
) -> list[AdminNote]:
    result = await session.execute(
        select(AdminNote)
        .where(
            AdminNote.verification_request_id
            == request_id
        )
        .order_by(
            AdminNote.created_at.asc()
        )
    )

    return list(
        result.scalars().all()
    )