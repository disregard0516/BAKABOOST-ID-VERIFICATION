from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_verification_session,
)
from app.core.constants import AccessGrantStatus
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.access import ApplicantAccessResponse
from app.services.access.grant_service import (
    AccessGrantError,
    get_applicant_access,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification Access"],
)

@router.get(
    "/access",
    response_model=ApplicantAccessResponse,
)
async def get_access(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(get_verification_session),
    ],
) -> ApplicantAccessResponse:
    request = await session.get(
        VerificationRequest,
        verification_session.verification_request_id,
    )

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access unavailable.",
        )

    try:
        ensure_session_matches_request(
            verification_session=verification_session,
            verification_request=request,
        )

        access = await get_applicant_access(
            session,
            verification_request=request,
            discord_user_id=(
                verification_session.discord_user_id
            ),
        )

    except (
        InvalidVerificationSessionError,
        AccessGrantError,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access unavailable.",
        )

    if access is None:
        return ApplicantAccessResponse(
            status=AccessGrantStatus.NOT_ISSUED,
            access_available=False,
        )

    grant, invite_code = access

    access_available = (
        grant.status == AccessGrantStatus.ISSUED
        and invite_code is not None
    )

    return ApplicantAccessResponse(
        status=grant.status,
        access_available=access_available,
        discord_invite_url=(
            f"https://discord.gg/{invite_code}"
            if access_available
            else None
        ),
        expires_at=grant.expires_at,
    )