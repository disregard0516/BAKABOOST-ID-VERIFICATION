from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_verification_session,
    require_verification_csrf,
)
from app.api.rate_limits import rate_limit
from app.core.config import settings
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.submission import (
    VerificationSubmissionCreate,
    VerificationSubmissionCreated,
)
from app.services.security.csrf import (
    generate_csrf_token,
)
from app.services.verification.request_service import (
    expire_request_if_needed,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
    rotate_verification_session,
)
from app.services.verification.submission_rules import (
    SubmissionValidationError,
)
from app.services.verification.submission_service import (
    create_submission,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


@router.post(
    "/submit",
    response_model=VerificationSubmissionCreated,
    status_code=status.HTTP_201_CREATED,
)
async def submit_verification(
    payload: VerificationSubmissionCreate,
    response: Response,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(get_verification_session),
    ],
    _csrf: Annotated[
        None,
        Depends(require_verification_csrf),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace="verification_submission",
                limit=(
                    settings.submission_rate_limit
                ),
            )
        ),
    ],
) -> VerificationSubmissionCreated:
    verification_request = await session.get(
        VerificationRequest,
        verification_session.verification_request_id,
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission is not available.",
        )

    try:
        ensure_session_matches_request(
            verification_session=(
                verification_session
            ),
            verification_request=(
                verification_request
            ),
        )

        submission = await create_submission(
            session,
            verification_request=(
                verification_request
            ),
            verification_session=(
                verification_session
            ),
            payload=payload,
        )

        # Rotate applicant authentication after a
        # security-sensitive state transition.
        _, new_raw_session = (
            await rotate_verification_session(
                session,
                current_session=(
                    verification_session
                ),
            )
        )

        await session.commit()

    except InvalidVerificationSessionError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification authentication required.",
        )

    except SubmissionValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # Rotate CSRF token together with the session.
    new_csrf_token = generate_csrf_token()

    response.set_cookie(
        key="verification_session",
        value=new_raw_session,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=(
            settings.verification_session_ttl_minutes
            * 60
        ),
        path="/",
        domain=settings.cookie_domain,
    )

    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=new_csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=(
            settings.verification_session_ttl_minutes
            * 60
        ),
        path="/",
        domain=settings.cookie_domain,
    )

    return VerificationSubmissionCreated(
        submission_id=submission.id,
        status="queued",
    )