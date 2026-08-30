import asyncio

from sqlalchemy import select

from app.db.models.retention_policy import (
    RetentionPolicy,
)
from app.db.session import AsyncSessionLocal


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RetentionPolicy).where(
                RetentionPolicy.is_default.is_(True)
            )
        )

        existing = result.scalar_one_or_none()

        if existing is None:
            policy = RetentionPolicy(
                name="Default MVP Policy",
                raw_evidence_retention_days=30,
                temporary_upload_retention_minutes=60,
                retain_verification_result=True,
                is_default=True,
                is_active=True,
            )

            session.add(policy)

            await session.commit()

            print(
                "Created default retention policy."
            )

        else:
            print(
                "Default retention policy already exists."
            )


if __name__ == "__main__":
    asyncio.run(seed())