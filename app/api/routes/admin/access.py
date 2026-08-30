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
    require_sensitive_permission,
)
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.access import AccessGrantResponse
from app.services.access.grant_service import (
    AccessGrantError,
    issue_access_grant,
    revoke_access_grant,
)

router = APIRouter(
    prefix="/verification-requests",
    tags=["Admin Discord Access"],
)

@router.post(
    "/{request_id}/grant-access",
    response_model=AccessGrantResponse,
)
async def grant_discord_access(
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
                Permission.ACCESS_GRANT
            )
        ),
    ],
) -> AccessGrantResponse:
    try:
        grant = await issue_access_grant(
            session,
            request_id=request_id,
            admin_id=admin.id,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except AccessGrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return AccessGrantResponse(
        grant_id=grant.id,
        discord_user_id=str(
            grant.discord_user_id
        ),
        status=grant.status,
        issued_at=grant.issued_at,
        expires_at=grant.expires_at,
    )

@router.post(
    "/{request_id}/revoke-access",
    response_model=AccessGrantResponse,
)
async def revoke_discord_access(
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
                Permission.ACCESS_REVOKE
            )
        ),
    ],
) -> AccessGrantResponse:
    try:
        grant = await revoke_access_grant(
            session,
            request_id=request_id,
            admin_id=admin.id,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )

    except AccessGrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return AccessGrantResponse(
        grant_id=grant.id,
        discord_user_id=str(
            grant.discord_user_id
        ),
        status=grant.status,
        issued_at=grant.issued_at,
        expires_at=grant.expires_at,
    )