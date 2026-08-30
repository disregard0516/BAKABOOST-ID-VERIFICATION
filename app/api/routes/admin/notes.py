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

from app.api.dependencies import require_permission
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.admin_notes import (
    AdminNotesResponse,
    AdminNoteView,
    CreateAdminNoteRequest,
)
from app.services.admin.note_service import (
    AdminNoteError,
    add_admin_note,
    list_admin_notes,
)

router = APIRouter(
    prefix="/verification-requests",
    tags=["Admin Notes"],
)

@router.post(
    "/{request_id}/notes",
    response_model=AdminNoteView,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    request_id: UUID,
    payload: CreateAdminNoteRequest,
    http_request: Request,
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
) -> AdminNoteView:
    try:
        note = await add_admin_note(
            session,
            request_id=request_id,
            admin_id=admin.id,
            note=payload.note,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except AdminNoteError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    return AdminNoteView(
        id=note.id,
        admin_id=note.admin_id,
        note=note.note,
        created_at=note.created_at,
    )

@router.get(
    "/{request_id}/notes",
    response_model=AdminNotesResponse,
)
async def get_notes(
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
) -> AdminNotesResponse:
    notes = await list_admin_notes(
        session,
        request_id=request_id,
    )

    return AdminNotesResponse(
        items=[
            AdminNoteView(
                id=note.id,
                admin_id=note.admin_id,
                note=note.note,
                created_at=note.created_at,
            )
            for note in notes
        ]
    )