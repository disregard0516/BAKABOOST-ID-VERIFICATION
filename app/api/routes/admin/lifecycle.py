from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    require_permission,
    require_sensitive_permission,
)
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.audit import (
    AuditEventView,
    AuditHistoryResponse,
)
from app.schemas.evidence_deletion import (
    EvidenceDeletionResponse,
)
from app.schemas.request_lifecycle import (
    AssignReviewerRequest,
    ExtendExpirationRequest,
    RequestLifecycleResponse,
    RevokeRequest,
)
from app.services.admin.audit_history_service import (
    get_request_audit_history,
)
from app.services.admin.evidence_deletion_service import (
    delete_request_evidence,
)
from app.services.admin.request_lifecycle_service import (
    RequestLifecycleError,
    assign_reviewer,
    extend_request_expiration,
    revoke_request,
)

router = APIRouter(
    prefix="/verification-requests",
    tags=["Admin Verification Lifecycle"],
)


@router.post(
    "/{request_id}/revoke",
    response_model=RequestLifecycleResponse,
)
async def revoke_verification_request(
    request_id: UUID,
    payload: RevokeRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.REQUEST_REVOKE
            )
        ),
    ],
) -> RequestLifecycleResponse:
    try:
        verification_request = await revoke_request(
            session,
            request_id=request_id,
            admin_id=admin.id,
            reason=payload.reason,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except RequestLifecycleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return RequestLifecycleResponse(
        request_id=verification_request.id,
        status=verification_request.status,
        expires_at=verification_request.expires_at,
        assigned_reviewer_id=(
            verification_request.assigned_reviewer_id
        ),
    )


@router.post(
    "/{request_id}/extend-expiration",
    response_model=RequestLifecycleResponse,
)
async def extend_expiration(
    request_id: UUID,
    payload: ExtendExpirationRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.REQUEST_EXTEND
            )
        ),
    ],
) -> RequestLifecycleResponse:
    try:
        verification_request = (
            await extend_request_expiration(
                session,
                request_id=request_id,
                admin_id=admin.id,
                expires_at=payload.expires_at,
                ip_address=(
                    http_request.client.host
                    if http_request.client
                    else None
                ),
            )
        )

    except RequestLifecycleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return RequestLifecycleResponse(
        request_id=verification_request.id,
        status=verification_request.status,
        expires_at=verification_request.expires_at,
        assigned_reviewer_id=(
            verification_request.assigned_reviewer_id
        ),
    )


@router.post(
    "/{request_id}/assign-reviewer",
    response_model=RequestLifecycleResponse,
)
async def assign_verification_reviewer(
    request_id: UUID,
    payload: AssignReviewerRequest,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.CASE_ASSIGN
            )
        ),
    ],
) -> RequestLifecycleResponse:
    try:
        verification_request = await assign_reviewer(
            session,
            request_id=request_id,
            reviewer_admin_id=(
                payload.reviewer_admin_id
            ),
            acting_admin_id=admin.id,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except RequestLifecycleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return RequestLifecycleResponse(
        request_id=verification_request.id,
        status=verification_request.status,
        expires_at=verification_request.expires_at,
        assigned_reviewer_id=(
            verification_request.assigned_reviewer_id
        ),
    )


@router.get(
    "/{request_id}/audit",
    response_model=AuditHistoryResponse,
)
async def get_audit_history(
    request_id: UUID,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.AUDIT_VIEW
            )
        ),
    ],
) -> AuditHistoryResponse:
    events = await get_request_audit_history(
        session,
        request_id=request_id,
    )

    return AuditHistoryResponse(
        items=[
            AuditEventView(
                id=event.id,
                actor_type=event.actor_type,
                actor_id=event.actor_id,
                action=event.action,
                timestamp=event.created_at,
                metadata=event.metadata_json,
            )
            for event in events
        ]
    )

@router.delete(
    "/{request_id}/evidence",
    response_model=EvidenceDeletionResponse,
)
async def delete_evidence(
    request_id: UUID,
    http_request: Request,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.EVIDENCE_DELETE
            )
        ),
    ],
) -> EvidenceDeletionResponse:
    deleted_count = await delete_request_evidence(
        session,
        request_id=request_id,
        admin_id=admin.id,
        ip_address=(
            http_request.client.host
            if http_request.client
            else None
        ),
    )

    return EvidenceDeletionResponse(
        deleted_count=deleted_count,
    )