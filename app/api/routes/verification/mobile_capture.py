from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_verification_session,
    require_verification_csrf,
)
from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
)
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.db.models.mobile_capture_session import (
    MobileCaptureSession,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.mobile_capture import (
    MobileCaptureCreateResponse,
    MobileCaptureRevokeResponse,
    MobileCaptureStatusResponse,
    MobileCaptureUploadedEvidence,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.verification.mobile_capture_service import (
    MobileCaptureUnavailableError,
    create_mobile_capture_session,
    revoke_mobile_capture_session,
)
from app.utils.time import utc_now

router = APIRouter(
    prefix="/verification/mobile-capture",
    tags=["Verification Mobile Capture"],
)


def _client_ip(
    request: Request,
) -> str | None:
    if request.client is None:
        return None

    return request.client.host


@router.post(
    "",
    response_model=MobileCaptureCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_mobile_capture(
    request: Request,
    response: Response,
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
) -> MobileCaptureCreateResponse:
    verification_request = await session.get(
        VerificationRequest,
        verification_session.verification_request_id,
    )

    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Verification request unavailable."
            ),
        )

    try:
        (
            mobile_capture,
            raw_token,
        ) = await create_mobile_capture_session(
            session,
            verification_request=verification_request,
            verification_session=verification_session,
        )

    except MobileCaptureUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Mobile capture is unavailable."
            ),
        ) from exc

    await record_audit_event(
        session,
        actor_type=(
            ActorType.VERIFICATION_USER.value
        ),
        actor_id=str(
            verification_session.discord_user_id
        ),
        action=(
            AuditAction
            .MOBILE_CAPTURE_CREATED
            .value
        ),
        verification_request_id=(
            verification_request.id
        ),
        metadata={
            "mobile_capture_id": str(
                mobile_capture.id
            ),
            "expires_at": (
                mobile_capture
                .expires_at
                .isoformat()
            ),
        },
        ip_address=_client_ip(
            request
        ),
    )

    await session.commit()

    await session.refresh(
        mobile_capture
    )

    response.headers[
        "Cache-Control"
    ] = "no-store"

    response.headers[
        "Pragma"
    ] = "no-cache"

    return MobileCaptureCreateResponse(
        id=mobile_capture.id,
        handoff_token=raw_token,
        expires_at=(
            mobile_capture.expires_at
        ),
        status=mobile_capture.status,
    )


@router.get(
    "/{mobile_capture_id}",
    response_model=(
        MobileCaptureStatusResponse
    ),
)
async def get_mobile_capture_status(
    mobile_capture_id: UUID,
    response: Response,
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
) -> MobileCaptureStatusResponse:
    mobile_capture = await session.get(
        MobileCaptureSession,
        mobile_capture_id,
    )

    if (
        mobile_capture is None
        or (
            mobile_capture
            .verification_session_id
            != verification_session.id
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Mobile capture session unavailable."
            ),
        )

    now = utc_now()

    result = await session.execute(
        select(EvidenceObject)
        .where(
            EvidenceObject.mobile_capture_session_id
            == mobile_capture.id,
            EvidenceObject.status
            == EvidenceObjectStatus.TEMPORARY,
            (
                EvidenceObject.expires_at.is_(None)
                | (
                    EvidenceObject.expires_at
                    > now
                )
            ),
        )
        .order_by(
            EvidenceObject.uploaded_at.asc()
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    newest_by_type: dict[
        str,
        EvidenceObject,
    ] = {}

    for evidence in evidence_objects:
        newest_by_type[
            evidence.evidence_type
        ] = evidence

    uploads = [
        MobileCaptureUploadedEvidence(
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
            uploaded_at=(
                evidence.uploaded_at
            ),
        )
        for evidence
        in newest_by_type.values()
    ]

    response.headers[
        "Cache-Control"
    ] = "no-store"

    return MobileCaptureStatusResponse(
        id=mobile_capture.id,
        status=mobile_capture.status,
        connected=(
            mobile_capture.connected_at
            is not None
        ),
        expires_at=(
            mobile_capture.expires_at
        ),
        connected_at=(
            mobile_capture.connected_at
        ),
        completed_at=(
            mobile_capture.completed_at
        ),
        uploads=uploads,
    )


@router.delete(
    "/{mobile_capture_id}",
    response_model=(
        MobileCaptureRevokeResponse
    ),
)
async def revoke_mobile_capture(
    mobile_capture_id: UUID,
    request: Request,
    response: Response,
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
) -> MobileCaptureRevokeResponse:
    try:
        mobile_capture = (
            await revoke_mobile_capture_session(
                session,
                mobile_capture_id=(
                    mobile_capture_id
                ),
                verification_session=(
                    verification_session
                ),
            )
        )

    except MobileCaptureUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Mobile capture session unavailable."
            ),
        ) from exc

    await record_audit_event(
        session,
        actor_type=(
            ActorType.VERIFICATION_USER.value
        ),
        actor_id=str(
            verification_session.discord_user_id
        ),
        action=(
            AuditAction
            .MOBILE_CAPTURE_REVOKED
            .value
        ),
        verification_request_id=(
            mobile_capture
            .verification_request_id
        ),
        metadata={
            "mobile_capture_id": str(
                mobile_capture.id
            ),
        },
        ip_address=_client_ip(
            request
        ),
    )

    await session.commit()

    response.headers[
        "Cache-Control"
    ] = "no-store"

    return MobileCaptureRevokeResponse(
        status=mobile_capture.status
    )