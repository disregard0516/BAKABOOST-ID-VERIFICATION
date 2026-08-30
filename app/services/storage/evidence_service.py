import asyncio
import logging
import uuid
from datetime import timedelta

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import (
    EvidenceObjectStatus,
)
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.services.storage.file_validation import (
    validate_evidence_upload,
)
from app.services.storage.object_keys import (
    build_evidence_object_key,
)
from app.services.storage.s3 import (
    delete_private_object,
    upload_private_object,
)
from app.utils.time import utc_now

logger = logging.getLogger(__name__)


async def delete_uncommitted_evidence_object(
    *,
    object_key: str,
) -> None:
    """
    Best-effort compensation for an S3 object whose
    surrounding database transaction did not commit.

    This function must never replace the original
    database/application exception.
    """

    try:
        await asyncio.to_thread(
            delete_private_object,
            object_key=object_key,
        )

    except Exception:
        logger.exception(
            "Failed to remove uncommitted evidence "
            "object. object_key=%s",
            object_key,
        )


async def store_temporary_evidence(
    session: AsyncSession,
    *,
    verification_request: VerificationRequest,
    evidence_type: str,
    upload: UploadFile,
    mobile_capture_session_id: (
        uuid.UUID | None
    ) = None,
) -> EvidenceObject:
    validated = (
        await validate_evidence_upload(
            upload
        )
    )

    object_key = (
        build_evidence_object_key(
            verification_request_id=(
                verification_request.id
            ),
            evidence_type=evidence_type,
        )
    )

    #
    # boto3 is synchronous, therefore run
    # network I/O outside the FastAPI event loop.
    #
    await asyncio.to_thread(
        upload_private_object,
        object_key=object_key,
        content=validated.content,
        content_type=(
            validated.content_type
        ),
    )

    now = utc_now()

    evidence = EvidenceObject(
        verification_request_id=(
            verification_request.id
        ),
        verification_submission_id=None,
        mobile_capture_session_id=(
            mobile_capture_session_id
        ),
        object_key=object_key,
        evidence_type=evidence_type,
        content_type=(
            validated.content_type
        ),
        size_bytes=(
            validated.size_bytes
        ),
        checksum_sha256=(
            validated.checksum_sha256
        ),
        status=(
            EvidenceObjectStatus.TEMPORARY
        ),
        uploaded_at=now,
        expires_at=(
            now
            + timedelta(
                minutes=(
                    settings
                    .temporary_upload_ttl_minutes
                )
            )
        ),
    )

    session.add(evidence)

    try:
        #
        # The route owns the final transaction.
        #
        # Flush verifies that the DB can accept
        # this row before returning control.
        #
        await session.flush()

    except Exception:
        #
        # S3 succeeded but the DB row could not
        # even be flushed.
        #
        await delete_uncommitted_evidence_object(
            object_key=object_key,
        )

        raise

    return evidence