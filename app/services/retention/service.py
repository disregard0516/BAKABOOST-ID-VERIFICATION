from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ActorType, EvidenceObjectStatus
from app.db.models.evidence_object import EvidenceObject
from app.db.models.retention_policy import RetentionPolicy
from app.services.retention.evidence_deletion import (
    mark_evidence_deleted,
)
from app.utils.time import utc_now


async def get_default_retention_policy(
    session: AsyncSession,
) -> RetentionPolicy | None:
    result = await session.execute(
        select(RetentionPolicy)
        .where(
            RetentionPolicy.is_default.is_(True),
            RetentionPolicy.is_active.is_(True),
        )
        .limit(1)
    )

    return result.scalar_one_or_none()


async def schedule_evidence_retention(
    session: AsyncSession,
    *,
    evidence: EvidenceObject,
    retention_days: int,
) -> None:
    if evidence.attached_at is None:
        return

    evidence.deletion_due_at = (
        evidence.attached_at
        + timedelta(days=retention_days)
    )


async def process_due_evidence_deletions(
    session: AsyncSession,
) -> int:
    now = utc_now()

    result = await session.execute(
        select(EvidenceObject).where(
            EvidenceObject.status
            == EvidenceObjectStatus.ATTACHED,
            EvidenceObject.deletion_due_at.is_not(None),
            EvidenceObject.deletion_due_at <= now,
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    for evidence in evidence_objects:
        await mark_evidence_deleted(
            session,
            evidence=evidence,
            actor_type=ActorType.SYSTEM.value,
            actor_id=None,
            reason="retention_policy",
        )

    await session.commit()

    return len(evidence_objects)