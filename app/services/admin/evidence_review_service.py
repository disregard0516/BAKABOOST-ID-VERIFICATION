from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
)
from app.db.models.admin import Admin
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.storage.s3 import (
    create_signed_read_url,
)


class EvidenceReviewError(ValueError):
    pass


async def create_evidence_preview_url(
    session: AsyncSession,
    *,
    evidence_id: UUID,
    admin: Admin,
    ip_address: str | None = None,
) -> str:
    evidence = await session.get(
        EvidenceObject,
        evidence_id,
    )

    if evidence is None:
        raise EvidenceReviewError(
            "Evidence not found."
        )

    if (
        evidence.status
        != EvidenceObjectStatus.ATTACHED
    ):
        raise EvidenceReviewError(
            "Evidence unavailable."
        )

    signed_url = create_signed_read_url(
        object_key=evidence.object_key
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin.id),
        action=(
            AuditAction.EVIDENCE_PREVIEWED.value
        ),
        verification_request_id=(
            evidence.verification_request_id
        ),
        metadata={
            "evidence_id": str(evidence.id),
            "evidence_type": evidence.evidence_type,
        },
        ip_address=ip_address,
    )

    await session.commit()

    return signed_url


async def record_evidence_download(
    session: AsyncSession,
    *,
    evidence_id: UUID,
    admin: Admin,
    ip_address: str | None = None,
) -> None:
    evidence = await session.get(
        EvidenceObject,
        evidence_id,
    )

    if evidence is None:
        raise EvidenceReviewError(
            "Evidence not found."
        )

    if (
        evidence.status
        != EvidenceObjectStatus.ATTACHED
    ):
        raise EvidenceReviewError(
            "Evidence unavailable."
        )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin.id),
        action=(
            AuditAction.EVIDENCE_DOWNLOADED.value
        ),
        verification_request_id=(
            evidence.verification_request_id
        ),
        metadata={
            "evidence_id": str(evidence.id),
            "evidence_type": evidence.evidence_type,
        },
        ip_address=ip_address,
    )

    await session.commit()