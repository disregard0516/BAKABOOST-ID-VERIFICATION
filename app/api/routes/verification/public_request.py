from datetime import datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.rate_limits import rate_limit
from app.core.config import settings
from app.core.constants import VerificationStatus
from app.db.session import get_db_session
from app.services.verification.entry_context import (
    create_entry_context,
)
from app.services.verification.request_service import (
    VerificationRequestUnavailableError,
    ensure_request_is_available,
    expire_request_if_needed,
    get_request_by_raw_token,
)

router = APIRouter(
    prefix="/v",
    tags=["Public Verification Request"],
)


class PublicVerificationRequestResponse(BaseModel):
    status: VerificationStatus
    expires_at: datetime


class VerificationEntryContextResponse(BaseModel):
    entry_context: str


@router.get(
    "/{raw_token}",
    response_model=PublicVerificationRequestResponse,
)
async def get_public_verification_request(
    raw_token: str,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace="public_verification_request",
                limit=(
                    settings.public_request_rate_limit
                ),
            )
        ),
    ],
) -> PublicVerificationRequestResponse:
    verification_request = (
        await get_request_by_raw_token(
            session,
            raw_token=raw_token,
        )
    )

    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    expired = await expire_request_if_needed(
        session,
        request=verification_request,
    )

    if expired:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    try:
        ensure_request_is_available(
            verification_request
        )

    except VerificationRequestUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        ) from exc

    return PublicVerificationRequestResponse(
        status=verification_request.status,
        expires_at=verification_request.expires_at,
    )


@router.post(
    "/{raw_token}/entry-context",
    response_model=VerificationEntryContextResponse,
)
async def create_verification_entry_context(
    raw_token: str,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace="verification_entry_context",
                limit=(
                    settings.oauth_start_rate_limit
                ),
            )
        ),
    ],
) -> VerificationEntryContextResponse:
    verification_request = (
        await get_request_by_raw_token(
            session,
            raw_token=raw_token,
        )
    )

    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    expired = await expire_request_if_needed(
        session,
        request=verification_request,
    )

    if expired:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    try:
        ensure_request_is_available(
            verification_request
        )

    except VerificationRequestUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        ) from exc

    raw_context = await create_entry_context(
        session,
        request=verification_request,
    )

    return VerificationEntryContextResponse(
        entry_context=raw_context,
    )