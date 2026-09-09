import logging
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    require_permission,
    require_sensitive_permission,
)
from app.core.config import settings
from app.core.constants import VerificationStatus
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.review import (
    ClaimCaseResponse,
    DecisionRequest,
    DecisionResponse,
    EvidencePreviewResponse,
    EvidenceReviewItem,
    ReviewDetailResponse,
    SubmissionReviewView,
)
from app.services.access.grant_service import (
    issue_access_grant,
)
from app.services.admin.evidence_review_service import (
    EvidenceReviewError,
    create_evidence_preview_url,
    get_previewable_evidence,
    verify_evidence_preview_token,
)
from app.services.admin.review_service import (
    CaseClaimError,
    DecisionError,
    claim_case,
    get_review_detail,
    record_decision,
)
from app.services.storage.s3 import open_private_object

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/verification-requests",
    tags=["Admin Verification Review"],
)



@router.post(
    "/{request_id}/claim",
    response_model=ClaimCaseResponse,
)
async def claim_verification_case(
    request_id: UUID,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.CASE_CLAIM
            )
        ),
    ],
) -> ClaimCaseResponse:
    try:
        verification_request = await claim_case(
            session,
            request_id=request_id,
            admin_id=admin.id,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except CaseClaimError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return ClaimCaseResponse(
        request_id=verification_request.id,
        status=verification_request.status,
        assigned_reviewer_id=admin.id,
        review_started_at=(
            verification_request.review_started_at
        ),
    )

@router.get(
    "/{request_id}",
    response_model=ReviewDetailResponse,
)
async def get_verification_review(
    request_id: UUID,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.REQUEST_VIEW
            )
        ),
    ],
) -> ReviewDetailResponse:
    try:
        verification_request, submissions = (
            await get_review_detail(
                session,
                request_id=request_id,
            )
        )

    except CaseClaimError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    return ReviewDetailResponse(
        request_id=verification_request.id,
        assigned_discord_user_id=str(
            verification_request.assigned_discord_user_id
        ),
        discord_username_snapshot=(
            verification_request.discord_username_snapshot
        ),
        status=verification_request.status,
        queue_entered_at=(
            verification_request.queue_entered_at
        ),
        review_started_at=(
            verification_request.review_started_at
        ),
        assigned_reviewer_id=(
            verification_request.assigned_reviewer_id
        ),
        submissions=[
            SubmissionReviewView(
                submission_id=submission.id,
                legal_name=submission.legal_name,
                date_of_birth=(
                    submission.date_of_birth.isoformat()
                    if submission.date_of_birth
                    else None
                ),
                age_result=submission.age_result,
                issuing_country=(
                    submission.issuing_country
                ),
                document_type=(
                    submission.document_type
                ),
                submitted_at=(
                    submission.submitted_at
                ),
                evidence=[
                    EvidenceReviewItem(
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
                    for evidence in evidence_objects
                ],
            )
            for (
                submission,
                evidence_objects,
            ) in submissions
        ],
    )


@router.post(
    "/evidence/{evidence_id}/preview",
    response_model=EvidencePreviewResponse,
)
async def preview_evidence(
    evidence_id: UUID,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
    Admin,
    Depends(
        require_sensitive_permission(
            Permission.EVIDENCE_VIEW
        )
    ),
],
) -> EvidencePreviewResponse:
    try:
        signed_url = await create_evidence_preview_url(
            session,
            evidence_id=evidence_id,
            admin=admin,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except EvidenceReviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    return EvidencePreviewResponse(
        evidence_id=evidence_id,
        signed_url=signed_url,
        expires_in_seconds=(
            settings.evidence_signed_url_ttl_seconds
        ),
    )

@router.get(
    "/evidence/{evidence_id}/content",
    response_class=StreamingResponse,
)
async def stream_evidence_content(
    evidence_id: UUID,
    token: Annotated[str, Query(min_length=1)],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.EVIDENCE_VIEW
            )
        ),
    ],
) -> StreamingResponse:
    try:
        verify_evidence_preview_token(
            token=token,
            evidence_id=evidence_id,
            admin_id=admin.id,
        )

        evidence = await get_previewable_evidence(
            session,
            evidence_id=evidence_id,
        )

        stored_object = open_private_object(
            object_key=evidence.object_key,
        )
    except EvidenceReviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    body = stored_object["Body"]

    def stream_body():
        try:
            while chunk := body.read(64 * 1024):
                yield chunk
        finally:
            body.close()

    headers = {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
    }

    if evidence.size_bytes > 0:
        headers["Content-Length"] = str(
            evidence.size_bytes
        )

    return StreamingResponse(
        stream_body(),
        media_type=evidence.content_type,
        headers=headers,
    )


async def _perform_decision(
    *,
    request_id: UUID,
    target_status: VerificationStatus,
    payload: DecisionRequest,
    http_request: Request,
    session: AsyncSession,
    admin: Admin,
) -> DecisionResponse:
    try:
        verification_request = await record_decision(
            session,
            request_id=request_id,
            admin_id=admin.id,
            target_status=target_status,
            reason_code=payload.reason_code,
            internal_note=payload.internal_note,
            user_message=payload.user_message,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except DecisionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    if target_status == VerificationStatus.APPROVED:
        try:
            await issue_access_grant(
                session,
                request_id=verification_request.id,
                admin_id=admin.id,
                ip_address=(
                    http_request.client.host
                    if http_request.client
                    else None
                ),
            )
        except Exception:
            logger.exception(
                "Automatic Discord access grant failed after "
                "verification approval for request %s; "
                "the committed approval remains valid.",
                verification_request.id,
            )

    return DecisionResponse(
        request_id=verification_request.id,
        status=verification_request.status,
        decided_at=verification_request.decided_at,
    )

@router.post(
    "/{request_id}/approve",
    response_model=DecisionResponse,
)
async def approve_case(
    request_id: UUID,
    payload: DecisionRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.DECISION_APPROVE
            )
        ),
    ],
) -> DecisionResponse:
    return await _perform_decision(
        request_id=request_id,
        target_status=VerificationStatus.APPROVED,
        payload=payload,
        http_request=http_request,
        session=session,
        admin=admin,
    )

@router.post(
    "/{request_id}/reject",
    response_model=DecisionResponse,
)
async def reject_case(
    request_id: UUID,
    payload: DecisionRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.DECISION_REJECT
            )
        ),
    ],
) -> DecisionResponse:
    return await _perform_decision(
        request_id=request_id,
        target_status=VerificationStatus.REJECTED,
        payload=payload,
        http_request=http_request,
        session=session,
        admin=admin,
    )

@router.post(
    "/{request_id}/more-info",
    response_model=DecisionResponse,
)
async def request_more_information(
    request_id: UUID,
    payload: DecisionRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.DECISION_MORE_INFO
            )
        ),
    ],
) -> DecisionResponse:
    return await _perform_decision(
        request_id=request_id,
        target_status=VerificationStatus.MORE_INFO,
        payload=payload,
        http_request=http_request,
        session=session,
        admin=admin,
    )