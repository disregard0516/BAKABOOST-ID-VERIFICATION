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
from app.db.models.retention_policy import (
    RetentionPolicy,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.schemas.evidence import RequiredEvidence
from app.schemas.form_config import (
    VerificationFormConfigResponse,
)
from app.services.retention.service import (
    get_default_retention_policy,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification Form"],
)


@router.get(
    "/form-config",
    response_model=VerificationFormConfigResponse,
)
async def get_form_config(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        VerificationSession,
        Depends(get_verification_session),
    ],
) -> VerificationFormConfigResponse:
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

    retention_policy: RetentionPolicy | None = (
        await get_default_retention_policy(
            session
        )
    )

    return VerificationFormConfigResponse(
        required_evidence=(
            RequiredEvidence.model_validate(
                request.required_evidence_json
            )
        ),
        retention_days=(
            retention_policy.raw_evidence_retention_days
            if retention_policy
            else None
        ),
    )