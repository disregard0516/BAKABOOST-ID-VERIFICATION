from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ActorType, EvidenceObjectStatus
from app.db.models.evidence_object import EvidenceObject
from app.services.retention.evidence_deletion import (
    mark_evidence_deleted,
)


class EvidenceDeletionError(ValueError):
    pass


async def delete_request_evidence(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    ip_address: str | None = None,
) -> int:
    result = await session.execute(
        select(EvidenceObject).where(
            EvidenceObject.verification_request_id
            == request_id,
            EvidenceObject.status
            != EvidenceObjectStatus.DELETED,
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    for evidence in evidence_objects:
        await mark_evidence_deleted(
            session,
            evidence=evidence,
            actor_type=ActorType.ADMIN.value,
            actor_id=str(admin_id),
            reason="manual_admin_deletion",
            admin_id=admin_id,
            ip_address=ip_address,
        )

    await session.commit()

    return len(evidence_objects)