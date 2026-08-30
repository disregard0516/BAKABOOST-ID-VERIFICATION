from typing import (
    Annotated,
    Any,
)

from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_mobile_capture_session,
)
from app.api.rate_limits import rate_limit
from app.core.config import settings
from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
    EvidenceType,
    VerificationStatus,
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
from app.db.session import get_db_session
from app.schemas.mobile_capture import (
    MobileCaptureCompleteResponse,
    MobileCaptureEvidenceResponse,
    MobileCaptureExchangeResponse,
    MobileCaptureRequirements,
    MobileCaptureSessionResponse,
    MobileCaptureUploadedEvidence,
)
from app.services.audit.service import (
    record_audit_event,
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
from app.services.verification.mobile_capture_service import (
    InvalidMobileCaptureTokenError,
    MobileCaptureUnavailableError,
    exchange_mobile_capture_token,
)
from app.services.verification.request_service import (
    expire_request_if_needed,
)
from app.utils.time import utc_now

router = APIRouter(
    prefix="/mobile",
    tags=[
        "Mobile Verification Capture",
    ],
)


def _client_ip(
    request: Request,
) -> str | None:
    if request.client is None:
        return None

    return request.client.host


def _set_private_response_headers(
    response: Response,
) -> None:
    """
    Prevent sensitive verification responses from being
    stored by browsers, proxies, or intermediary caches.
    """

    response.headers[
        "Cache-Control"
    ] = (
        "no-store, no-cache, "
        "must-revalidate, private"
    )

    response.headers[
        "Pragma"
    ] = "no-cache"

    response.headers[
        "Expires"
    ] = "0"

    response.headers[
        "Referrer-Policy"
    ] = "no-referrer"


def _as_bool(
    data: dict[str, Any],
    key: str,
) -> bool:
    value = data.get(key)

    return (
        value
        if isinstance(value, bool)
        else False
    )


def _build_requirements(
    raw_requirements: object,
) -> MobileCaptureRequirements:
    if not isinstance(
        raw_requirements,
        dict,
    ):
        raw_requirements = {}

    requirements: dict[
        str,
        Any,
    ] = raw_requirements

    known_keys = {
        "document_front",
        "document_back",
        "selfie",
        "liveness",
    }

    extra = {
        str(key): value
        for key, value
        in requirements.items()
        if key not in known_keys
    }

    return MobileCaptureRequirements(
        document_front=_as_bool(
            requirements,
            "document_front",
        ),
        document_back=_as_bool(
            requirements,
            "document_back",
        ),
        selfie=_as_bool(
            requirements,
            "selfie",
        ),
        liveness=_as_bool(
            requirements,
            "liveness",
        ),
        extra=extra,
    )


def _require_expected_origin(
    request: Request,
) -> None:
    """
    Require requests that mutate the mobile capture
    session to originate from the configured frontend.

    The HttpOnly SameSite cookie remains the primary
    browser credential. Origin validation provides an
    additional CSRF boundary.
    """

    origin = request.headers.get(
        "origin"
    )

    expected_origin = (
        settings.frontend_url
        .strip()
        .rstrip("/")
    )

    if (
        not origin
        or origin.rstrip("/")
        != expected_origin
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Invalid request origin."
            ),
        )


async def _get_request_for_mobile_session(
    session: AsyncSession,
    mobile_session: MobileCaptureSession,
) -> VerificationRequest:
    verification_request = (
        await session.get(
            VerificationRequest,
            mobile_session.verification_request_id,
        )
    )

    if verification_request is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Mobile capture unavailable."
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
                "Mobile capture unavailable."
            ),
        )

    if (
        verification_request.status
        not in {
            VerificationStatus.PENDING,
            VerificationStatus.MORE_INFO,
        }
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Mobile capture unavailable."
            ),
        )

    return verification_request


@router.post(
    "/exchange",
    response_model=(
        MobileCaptureExchangeResponse
    ),
)
async def exchange_mobile_handoff(
    request: Request,
    response: Response,
    handoff_token: Annotated[
        str | None,
        Header(
            alias=(
                "X-Mobile-Handoff-Token"
            )
        ),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace=(
                    "mobile_capture_exchange"
                ),
                limit=(
                    settings
                    .oauth_start_rate_limit
                ),
            )
        ),
    ],
) -> MobileCaptureExchangeResponse:
    _require_expected_origin(
        request
    )

    if (
        handoff_token is None
        or not handoff_token.strip()
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Mobile capture unavailable."
            ),
        )

    try:
        (
            mobile_session,
            raw_mobile_token,
        ) = (
            await exchange_mobile_capture_token(
                session,
                raw_handoff_token=(
                    handoff_token.strip()
                ),
            )
        )

    except (
        InvalidMobileCaptureTokenError,
        MobileCaptureUnavailableError,
    ) as exc:
        await session.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Mobile capture unavailable."
            ),
        ) from exc

    expires_at = (
        mobile_session
        .mobile_session_expires_at
    )

    if expires_at is None:
        await session.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Mobile capture unavailable."
            ),
        )

    await record_audit_event(
        session,
        actor_type=(
            ActorType
            .VERIFICATION_USER
            .value
        ),
        actor_id=None,
        action=(
            AuditAction
            .MOBILE_CAPTURE_EXCHANGED
            .value
        ),
        verification_request_id=(
            mobile_session
            .verification_request_id
        ),
        metadata={
            "mobile_capture_id": str(
                mobile_session.id
            ),
        },
        ip_address=_client_ip(
            request
        ),
    )

    await session.commit()

    now = utc_now()

    max_age = max(
        1,
        int(
            (
                expires_at - now
            ).total_seconds()
        ),
    )

    response.set_cookie(
        key=(
            settings
            .mobile_capture_cookie_name
        ),
        value=raw_mobile_token,
        max_age=max_age,
        path=(
            f"{settings.api_prefix}/mobile"
        ),
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite="strict",
    )

    _set_private_response_headers(
        response
    )

    return MobileCaptureExchangeResponse(
        status=mobile_session.status,
        expires_at=expires_at,
    )


@router.get(
    "/session",
    response_model=(
        MobileCaptureSessionResponse
    ),
)
async def get_mobile_session(
    response: Response,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    mobile_session: Annotated[
        MobileCaptureSession,
        Depends(
            get_mobile_capture_session
        ),
    ],
) -> MobileCaptureSessionResponse:
    verification_request = (
        await _get_request_for_mobile_session(
            session,
            mobile_session,
        )
    )

    expires_at = (
        mobile_session
        .mobile_session_expires_at
    )

    if expires_at is None:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Mobile capture authentication required."
            ),
        )

    now = utc_now()

    result = await session.execute(
        select(
            EvidenceObject
        )
        .where(
            EvidenceObject
            .mobile_capture_session_id
            == mobile_session.id,

            EvidenceObject.status
            == EvidenceObjectStatus.TEMPORARY,

            (
                EvidenceObject
                .expires_at
                .is_(None)
                |
                (
                    EvidenceObject.expires_at
                    > now
                )
            ),
        )
        .order_by(
            EvidenceObject
            .uploaded_at
            .asc()
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    #
    # Only expose the newest active upload
    # for each evidence type.
    #
    # Retakes remain private and superseded
    # objects are not returned.
    #
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

    _set_private_response_headers(
        response
    )

    return MobileCaptureSessionResponse(
        id=mobile_session.id,
        status=mobile_session.status,
        expires_at=expires_at,
        requirements=(
            _build_requirements(
                getattr(
                    verification_request,
                    "required_evidence_json",
                    {},
                )
            )
        ),
        uploads=uploads,
    )

@router.post(
    "/evidence/{evidence_type}",
    response_model=(
        MobileCaptureEvidenceResponse
    ),
)
async def upload_mobile_evidence(
    request: Request,
    response: Response,
    evidence_type: EvidenceType,
    upload: Annotated[
        UploadFile,
        File(),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    mobile_session: Annotated[
        MobileCaptureSession,
        Depends(
            get_mobile_capture_session
        ),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace=(
                    "mobile_evidence_upload"
                ),
                limit=(
                    settings
                    .evidence_upload_rate_limit
                ),
            )
        ),
    ],
) -> MobileCaptureEvidenceResponse:
    _require_expected_origin(
        request
    )

    verification_request = (
        await _get_request_for_mobile_session(
            session,
            mobile_session,
        )
    )

    uploaded_object_key: str | None = None
    transaction_committed = False

    try:
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
                mobile_capture_session_id=(
                    mobile_session.id
                ),
            )
        )

        uploaded_object_key = (
            evidence.object_key
        )

        #
        # Phone users may retake the same
        # evidence photo.
        #
        # Keep the newest object active.
        # Older objects become immediately
        # eligible for normal cleanup.
        #
        previous_result = (
            await session.execute(
                select(
                    EvidenceObject
                ).where(
                    EvidenceObject
                    .mobile_capture_session_id
                    == mobile_session.id,

                    EvidenceObject
                    .evidence_type
                    == evidence_type.value,

                    EvidenceObject
                    .status
                    == (
                        EvidenceObjectStatus
                        .TEMPORARY
                    ),

                    EvidenceObject.id
                    != evidence.id,
                )
            )
        )

        superseded_evidence = list(
            previous_result.scalars().all()
        )

        superseded_at = utc_now()

        for old_evidence in (
            superseded_evidence
        ):
            old_evidence.expires_at = (
                superseded_at
            )

        now = utc_now()

        mobile_session.status = (
            "connected"
        )

        mobile_session.last_activity_at = (
            now
        )

        await record_audit_event(
            session,
            actor_type=(
                ActorType
                .VERIFICATION_USER
                .value
            ),
            actor_id=None,
            action=(
                AuditAction
                .MOBILE_EVIDENCE_UPLOADED
                .value
            ),
            verification_request_id=(
                verification_request.id
            ),
            metadata={
                "mobile_capture_id": str(
                    mobile_session.id
                ),
                "evidence_id": str(
                    evidence.id
                ),
                "evidence_type": (
                    evidence.evidence_type
                ),
                "size_bytes": (
                    evidence.size_bytes
                ),
            },
            ip_address=_client_ip(
                request
            ),
        )

        await session.commit()

        transaction_committed = True

    except EvidenceNotRequestedError as exc:
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

    _set_private_response_headers(
        response
    )

    return MobileCaptureEvidenceResponse(
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

@router.post(
    "/complete",
    response_model=(
        MobileCaptureCompleteResponse
    ),
)
async def complete_mobile_capture(
    request: Request,
    response: Response,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    mobile_session: Annotated[
        MobileCaptureSession,
        Depends(
            get_mobile_capture_session
        ),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace=(
                    "mobile_capture_complete"
                ),
                limit=(
                    settings
                    .oauth_start_rate_limit
                ),
            )
        ),
    ],
) -> MobileCaptureCompleteResponse:
    _require_expected_origin(
        request
    )

    verification_request = (
        await _get_request_for_mobile_session(
            session,
            mobile_session,
        )
    )
    now = utc_now()

    result = await session.execute(
        select(
            EvidenceObject.evidence_type
        ).where(
            EvidenceObject.mobile_capture_session_id
            == mobile_session.id,
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
    )
    
    uploaded_types = set(
        result.scalars().all()
    )

    requirements = (
        _build_requirements(
            getattr(
                verification_request,
                "required_evidence_json",
                {},
            )
        )
    )

    required_types: set[
        str
    ] = set()

    if requirements.document_front:
        required_types.add(
            EvidenceType
            .DOCUMENT_FRONT
            .value
        )

    if requirements.document_back:
        required_types.add(
            EvidenceType
            .DOCUMENT_BACK
            .value
        )

    if requirements.selfie:
        required_types.add(
            EvidenceType
            .SELFIE
            .value
        )

    if requirements.liveness:
        required_types.add(
            EvidenceType
            .LIVENESS
            .value
        )

    if not required_types.issubset(
        uploaded_types
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Required mobile evidence is incomplete."
            ),
        )

    mobile_session.completed_at = (
        now
    )

    mobile_session.last_activity_at = (
        now
    )

    mobile_session.status = (
        "completed"
    )

    # Destroy the evidence-only phone
    # credential immediately after completion.
    mobile_session.mobile_session_token_hash = (
        None
    )

    mobile_session.mobile_session_expires_at = (
        None
    )

    await record_audit_event(
        session,
        actor_type=(
            ActorType
            .VERIFICATION_USER
            .value
        ),
        actor_id=None,
        action=(
            AuditAction
            .MOBILE_CAPTURE_COMPLETED
            .value
        ),
        verification_request_id=(
            verification_request.id
        ),
        metadata={
            "mobile_capture_id": str(
                mobile_session.id
            ),
            "uploaded_evidence_types": sorted(
                uploaded_types
            ),
        },
        ip_address=_client_ip(
            request
        ),
    )

    await session.commit()

    response.delete_cookie(
        key=(
            settings
            .mobile_capture_cookie_name
        ),
        path=(
            f"{settings.api_prefix}/mobile"
        ),
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite="strict",
    )

    _set_private_response_headers(
        response
    )

    return MobileCaptureCompleteResponse(
        status="completed",
        completed_at=now,
    )