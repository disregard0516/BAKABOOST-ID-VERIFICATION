from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)

from app.api.dependencies import (
    DatabaseSession,
    require_permission,
)
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.schemas.verification_request import (
    VerificationRequestCreate,
    VerificationRequestCreated,
)
from app.services.verification.request_service import (
    build_verification_url,
    create_verification_request,
)

router = APIRouter(
    prefix="/verification-requests",
    tags=["Admin Verification Requests"],
)


RequestCreatorAdmin = Annotated[
    Admin,
    Depends(
        require_permission(
            Permission.REQUEST_CREATE
        )
    ),
]


@router.post(
    "",
    response_model=VerificationRequestCreated,
    status_code=status.HTTP_201_CREATED,
)
async def create_request(
    payload: VerificationRequestCreate,
    http_request: Request,
    session: DatabaseSession,
    admin: RequestCreatorAdmin,
) -> VerificationRequestCreated:
    verification_request, raw_token = (
        await create_verification_request(
            session,
            payload=payload,
            admin_id=admin.id,
            ip_address=(
                http_request.client.host
                if http_request.client
                else None
            ),
        )
    )

    return VerificationRequestCreated(
        request_id=verification_request.id,
        assigned_discord_user_id=str(
            verification_request.assigned_discord_user_id
        ),
        status=verification_request.status,
        expires_at=verification_request.expires_at,
        verification_url=build_verification_url(
            raw_token
        ),
    )