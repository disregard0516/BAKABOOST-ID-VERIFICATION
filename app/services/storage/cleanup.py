from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.core.constants import (
    ActorType,
    EvidenceObjectStatus,
)
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.services.retention.evidence_deletion import (
    mark_evidence_deleted,
)
from app.utils.time import utc_now


async def cleanup_expired_temporary_uploads(
    session: AsyncSession,
) -> int:
    now = utc_now()

    result = await session.execute(
        select(
            EvidenceObject
        ).where(
            EvidenceObject.status
            == EvidenceObjectStatus.TEMPORARY,
            EvidenceObject.expires_at.is_not(
                None
            ),
            EvidenceObject.expires_at
            <= now,
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    cleaned = 0

    for evidence in evidence_objects:
        await mark_evidence_deleted(
            session,
            evidence=evidence,
            actor_type=(
                ActorType.SYSTEM.value
            ),
            actor_id=None,
            reason=(
                "temporary_upload_expired"
            ),
        )

        cleaned += 1

    await session.commit()

    return cleaned  