from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_verification_session,
    require_verification_csrf,
)
from app.api.rate_limits import rate_limit
from app.core.config import settings
from app.core.constants import (
    EvidenceType,
    VerificationStatus,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.evidence_upload import (
    EvidenceUploadResponse,
)
from app.services.storage.evidence_service import (
    delete_uncommitted_evidence_object,
    store_temporary_evidence,
)
from app.services.storage.file_validation import (
    InvalidEvidenceFileError,
)
from app.services.verification.evidence_rules import (
    EvidenceNotRequestedError,
    ensure_evidence_type_is_requested,
)
from app.services.verification.request_service import (
    expire_request_if_needed,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


@router.post(
    "/evidence/{evidence_type}",
    response_model=EvidenceUploadResponse,
)
async def upload_evidence(
    evidence_type: EvidenceType,
    upload: Annotated[
        UploadFile,
        File(),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(
            get_verification_session
        ),
    ],
    _csrf: Annotated[
        None,
        Depends(
            require_verification_csrf
        ),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace="evidence_upload",
                limit=(
                    settings
                    .evidence_upload_rate_limit
                ),
            )
        ),
    ],
) -> EvidenceUploadResponse:
    verification_request = (
        await session.get(
            VerificationRequest,
            verification_session
            .verification_request_id,
        )
    )

    if verification_request is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Verification request unavailable."
            ),
        )

    expired = (
        await expire_request_if_needed(
            session,
            request=verification_request,
        )
    )

    if expired:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Evidence upload not permitted."
            ),
        )

    uploaded_object_key: str | None = None
    transaction_committed = False

    try:
        ensure_session_matches_request(
            verification_session=(
                verification_session
            ),
            verification_request=(
                verification_request
            ),
        )

        if (
            verification_request.status
            not in {
                VerificationStatus.PENDING,
                VerificationStatus.MORE_INFO,
            }
        ):
            raise EvidenceNotRequestedError()

        ensure_evidence_type_is_requested(
            request=verification_request,
            evidence_type=evidence_type,
        )

        evidence = (
            await store_temporary_evidence(
                session,
                verification_request=(
                    verification_request
                ),
                evidence_type=(
                    evidence_type.value
                ),
                upload=upload,
            )
        )

        #
        # Save the object key BEFORE commit.
        #
        # If commit fails, SQLAlchemy rollback may
        # expire model attributes, so cleanup should
        # use this plain string.
        #
        uploaded_object_key = (
            evidence.object_key
        )

        await session.commit()

        transaction_committed = True

        await session.refresh(
            evidence
        )

    except (
        InvalidVerificationSessionError,
        EvidenceNotRequestedError,
    ) as exc:
        await session.rollback()

        if (
            uploaded_object_key
            and not transaction_committed
        ):
            await (
                delete_uncommitted_evidence_object(
                    object_key=(
                        uploaded_object_key
                    ),
                )
            )

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Evidence upload not permitted."
            ),
        ) from exc

    except InvalidEvidenceFileError as exc:
        await session.rollback()

        if (
            uploaded_object_key
            and not transaction_committed
        ):
            await (
                delete_uncommitted_evidence_object(
                    object_key=(
                        uploaded_object_key
                    ),
                )
            )

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc

    except Exception:
        await session.rollback()

        if (
            uploaded_object_key
            and not transaction_committed
        ):
            await (
                delete_uncommitted_evidence_object(
                    object_key=(
                        uploaded_object_key
                    ),
                )
            )

        raise

    return EvidenceUploadResponse(
        evidence_id=evidence.id,
        evidence_type=(
            evidence.evidence_type
        ),
        content_type=(
            evidence.content_type
        ),
        size_bytes=(
            evidence.size_bytes
        ),
    )