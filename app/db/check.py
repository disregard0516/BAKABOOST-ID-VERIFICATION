import asyncio

from sqlalchemy import text

from app.db.session import engine


async def check_database() -> None:
    async with engine.connect() as connection:
        result = await connection.execute(
            text("SELECT 1")
        )

        print(
            "DATABASE OK:",
            result.scalar_one(),
        )


if __name__ == "__main__":
    asyncio.run(check_database())