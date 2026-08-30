from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_permission
from app.core.constants import VerificationStatus
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.admin_queue import (
    AdminQueueItem,
    AdminQueueResponse,
)
from app.services.admin.queue_service import (
    list_verification_requests,
)

router = APIRouter(
    prefix="/verification-queue",
    tags=["Admin Verification Queue"],
)


@router.get(
    "",
    response_model=AdminQueueResponse,
)
async def get_queue(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.QUEUE_VIEW
            )
        ),
    ],
    search: str | None = None,
    status_filter: Annotated[
        list[VerificationStatus] | None,
        Query(alias="status"),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 50,
    offset: Annotated[
        int,
        Query(ge=0),
    ] = 0,
) -> AdminQueueResponse:
    rows, total = (
        await list_verification_requests(
            session,
            search=search,
            statuses=status_filter,
            limit=limit,
            offset=offset,
        )
    )

    return AdminQueueResponse(
    items=[
        AdminQueueItem(
            request_id=item.id,
            assigned_discord_user_id=str(
                item.assigned_discord_user_id
            ),
            discord_username_snapshot=(
                item.discord_username_snapshot
            ),
            status=item.status,
            queue_entered_at=item.queue_entered_at,
            review_started_at=item.review_started_at,
            created_at=item.created_at,
            expires_at=item.expires_at,
            created_by_admin_id=(
                item.created_by_admin_id
            ),
            created_by_admin_name=creator_name,
            assigned_reviewer_id=(
                item.assigned_reviewer_id
            ),
            assigned_reviewer_name=reviewer_name,
            last_activity_at=item.last_activity_at,
        )
        for (
            item,
            creator_name,
            reviewer_name,
        ) in rows
    ],
    total=total,
)