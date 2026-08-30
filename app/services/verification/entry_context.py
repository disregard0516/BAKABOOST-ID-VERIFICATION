from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_secure_token, sha256_token
from app.db.models.verification_entry_context import (
    VerificationEntryContext,
)
from app.db.models.verification_request import VerificationRequest
from app.utils.time import utc_now


class InvalidEntryContextError(Exception):
    pass


async def create_entry_context(
    session: AsyncSession,
    *,
    request: VerificationRequest,
) -> str:
    raw_context = generate_secure_token(32)
    now = utc_now()

    context = VerificationEntryContext(
        verification_request_id=request.id,
        context_token_hash=sha256_token(
            raw_context
        ),
        created_at=now,
        expires_at=now + timedelta(minutes=10),
    )

    session.add(context)
    await session.commit()

    return raw_context


async def consume_entry_context(
    session: AsyncSession,
    *,
    raw_context: str,
) -> VerificationEntryContext:
    result = await session.execute(
        select(VerificationEntryContext)
        .where(
            VerificationEntryContext.context_token_hash
            == sha256_token(raw_context)
        )
        .with_for_update()
    )

    context = result.scalar_one_or_none()

    now = utc_now()

    if (
        context is None
        or context.consumed_at is not None
        or context.expires_at <= now
    ):
        raise InvalidEntryContextError()

    context.consumed_at = now

    await session.flush()

    return context