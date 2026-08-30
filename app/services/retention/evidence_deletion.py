import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    AuditAction,
    EvidenceObjectStatus,
)
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.storage.s3 import (
    delete_private_object,
)
from app.utils.time import utc_now


class EvidenceDeletionError(ValueError):
    pass


async def mark_evidence_deleted(
    session: AsyncSession,
    *,
    evidence: EvidenceObject,
    actor_type: str,
    actor_id: str | None,
    reason: str,
    admin_id: UUID | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Physically remove evidence from private
    object storage before recording its deleted
    state in PostgreSQL.

    Storage deletion is intentionally performed
    first. If it fails, the exception propagates
    and the database must not claim that the
    evidence was deleted.

    The underlying S3 deletion operation is
    idempotent, so retrying after a partial
    failure is safe.
    """

    #
    # Even if a caller gives us a record already
    # marked DELETED, make the storage deletion
    # call again. This helps make explicit retry
    # operations safe and can clean up legacy
    # records whose old code changed only the DB.
    #
    await asyncio.to_thread(
        delete_private_object,
        object_key=evidence.object_key,
    )

    if (
        evidence.status
        == EvidenceObjectStatus.DELETED
    ):
        return

    now = utc_now()

    evidence.status = (
        EvidenceObjectStatus.DELETED
    )

    evidence.deleted_at = now
    evidence.deletion_reason = reason
    evidence.deleted_by_admin_id = (
        admin_id
    )

    await record_audit_event(
        session,
        actor_type=actor_type,
        actor_id=actor_id,
        action=(
            AuditAction
            .EVIDENCE_DELETED
            .value
        ),
        verification_request_id=(
            evidence.verification_request_id
        ),
        metadata={
            "evidence_id": str(
                evidence.id
            ),
            "evidence_type": (
                evidence.evidence_type
            ),
            "reason": reason,
        },
        ip_address=ip_address,
    )