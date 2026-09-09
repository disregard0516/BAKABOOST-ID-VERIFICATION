from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    require_permission,
)
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.audit import (
    AdminAuditActivityResponse,
    AdminAuditEventView,
)
from app.services.admin.audit_history_service import (
    get_admin_audit_activity,
)

router = APIRouter(
    prefix="/audit",
    tags=["Admin Audit Activity"],
)


@router.get(
    "",
    response_model=AdminAuditActivityResponse,
)
async def get_global_audit_activity(
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
    page: Annotated[
        int,
        Query(
            ge=1,
        ),
    ] = 1,
    page_size: Annotated[
        int,
        Query(
            ge=1,
            le=100,
        ),
    ] = 25,
    action: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=100,
        ),
    ] = None,
    outcome: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=32,
        ),
    ] = None,
    actor_type: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=50,
        ),
    ] = None,
    actor_id: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=255,
        ),
    ] = None,
    verification_request_id: UUID | None = None,
    request_id: Annotated[
        str | None,
        Query(
            min_length=1,
            max_length=128,
        ),
    ] = None,
) -> AdminAuditActivityResponse:
    events, total = (
        await get_admin_audit_activity(
            session,
            page=page,
            page_size=page_size,
            action=action,
            outcome=outcome,
            actor_type=actor_type,
            actor_id=actor_id,
            verification_request_id=(
                verification_request_id
            ),
            request_id=request_id,
        )
    )

    total_pages = (
        (
            total + page_size - 1
        )
        // page_size
        if total > 0
        else 0
    )

    return AdminAuditActivityResponse(
        items=[
            AdminAuditEventView(
                id=event.id,
                actor_type=event.actor_type,
                actor_id=event.actor_id,
                action=event.action,
                outcome=event.outcome,
                verification_request_id=(
                    event.verification_request_id
                ),
                request_id=event.request_id,
                timestamp=event.created_at,
                metadata=event.metadata_json,
            )
            for event in events
        ],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )
