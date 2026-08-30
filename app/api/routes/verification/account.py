from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_verification_session
from app.db.models.verification_request import VerificationRequest
from app.db.models.verification_session import VerificationSession
from app.db.session import get_db_session
from app.schemas.account_confirmation import (
    DiscordAccountConfirmationResponse,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification Account"],
)


@router.get(
    "/account",
    response_model=DiscordAccountConfirmationResponse,
)
async def get_account_confirmation(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(get_verification_session),
    ],
) -> DiscordAccountConfirmationResponse:
    request = await session.get(
        VerificationRequest,
        verification_session.verification_request_id,
    )

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    try:
        ensure_session_matches_request(
            verification_session=verification_session,
            verification_request=request,
        )

    except InvalidVerificationSessionError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification authentication required.",
        )

    avatar_url = None

    if request.discord_avatar_hash_snapshot:
        avatar_url = (
            "https://cdn.discordapp.com/avatars/"
            f"{verification_session.discord_user_id}/"
            f"{request.discord_avatar_hash_snapshot}.png"
        )

    return DiscordAccountConfirmationResponse(
        discord_user_id=str(
            verification_session.discord_user_id
        ),
        username=(
            request.discord_username_snapshot
            or "Discord user"
        ),
        avatar_url=avatar_url,
    )