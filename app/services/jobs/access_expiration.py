from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    AccessGrantStatus,
)
from app.db.models.discord_access_grant import (
    DiscordAccessGrant,
)
from app.utils.time import utc_now


async def expire_due_access_grants(
    session: AsyncSession,
) -> int:
    now = utc_now()

    result = await session.execute(
        select(DiscordAccessGrant).where(
            DiscordAccessGrant.status
            == AccessGrantStatus.ISSUED,
            DiscordAccessGrant.expires_at.is_not(None),
            DiscordAccessGrant.expires_at <= now,
        )
    )

    grants = list(
        result.scalars().all()
    )

    for grant in grants:
        grant.status = AccessGrantStatus.EXPIRED
        grant.updated_at = now

    await session.commit()

    return len(grants)