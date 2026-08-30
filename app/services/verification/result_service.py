from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_result import (
    VerificationResult,
)
from app.utils.time import utc_now


async def upsert_approved_result(
    session: AsyncSession,
    *,
    request: VerificationRequest,
) -> VerificationResult:
    result = await session.execute(
        select(VerificationResult).where(
            VerificationResult.verification_request_id
            == request.id
        )
    )

    verification_result = (
        result.scalar_one_or_none()
    )

    if verification_result is None:
        verification_result = VerificationResult(
            verification_request_id=request.id,
            discord_user_id=(
                request.assigned_discord_user_id
            ),
            verified=True,
            method="manual",
            reviewer_admin_id=(
                request.assigned_reviewer_id
            ),
            verified_at=utc_now(),
        )

        session.add(verification_result)

    else:
        verification_result.verified = True
        verification_result.reviewer_admin_id = (
            request.assigned_reviewer_id
        )
        verification_result.verified_at = utc_now()
        verification_result.revoked_at = None

    await session.flush()

    return verification_result