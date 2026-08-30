from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_verification_session,
)
from app.db.models.verification_decision import (
    VerificationDecision,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.status import (
    VerificationStatusResponse,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


@router.get(
    "/status",
    response_model=VerificationStatusResponse,
)
async def get_verification_status(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(get_verification_session),
    ],
) -> VerificationStatusResponse:
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

    decision_result = await session.execute(
        select(VerificationDecision)
        .where(
            VerificationDecision.verification_request_id
            == request.id
        )
        .order_by(
            VerificationDecision.created_at.desc()
        )
        .limit(1)
    )

    decision = (
        decision_result.scalar_one_or_none()
    )

    return VerificationStatusResponse(
        status=request.status,
        queue_entered_at=request.queue_entered_at,
        review_started_at=request.review_started_at,
        decided_at=request.decided_at,
        expires_at=request.expires_at,
        user_message=(
            decision.user_message
            if decision
            else None
        ),
    )