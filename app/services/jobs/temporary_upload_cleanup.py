from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.services.storage.cleanup import (
    cleanup_expired_temporary_uploads,
)


async def expire_temporary_upload_records(
    session: AsyncSession,
) -> int:
    return (
        await cleanup_expired_temporary_uploads(
            session
        )
    )