from datetime import timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_secure_token,
    sha256_token,
)
from app.db.models.discord_oauth_state import (
    DiscordOAuthState,
)
from app.utils.time import utc_now


class InvalidOAuthStateError(Exception):
    pass


async def create_oauth_state(
    session: AsyncSession,
    *,
    verification_request_id: UUID,
) -> str:
    raw_state = generate_secure_token(32)

    now = utc_now()

    state = DiscordOAuthState(
        verification_request_id=(
            verification_request_id
        ),
        state_hash=sha256_token(raw_state),
        created_at=now,
        expires_at=(
            now
            + timedelta(
                seconds=(
                    settings
                    .discord_oauth_state_ttl_seconds
                )
            )
        ),
    )

    session.add(state)

    await session.commit()

    return raw_state

async def consume_oauth_state(
    session: AsyncSession,
    *,
    raw_state: str,
) -> DiscordOAuthState:
    state_hash = sha256_token(raw_state)

    result = await session.execute(
        select(DiscordOAuthState)
        .where(
            DiscordOAuthState.state_hash
            == state_hash
        )
        .with_for_update()
    )

    state = result.scalar_one_or_none()

    if state is None:
        raise InvalidOAuthStateError()

    now = utc_now()

    if state.consumed_at is not None:
        raise InvalidOAuthStateError()

    if state.expires_at <= now:
        raise InvalidOAuthStateError()

    state.consumed_at = now

    await session.flush()

    return state