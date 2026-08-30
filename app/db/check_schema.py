import asyncio

from sqlalchemy import text

from app.db.session import engine


async def check_schema() -> None:
    async with engine.connect() as connection:
        enum_result = await connection.execute(
            text(
                """
                SELECT typname
                FROM pg_type
                WHERE typname = 'evidence_object_status'
                """
            )
        )

        print(
            "ENUM:",
            enum_result.scalar_one_or_none(),
        )

        columns_result = await connection.execute(
            text(
                """
                SELECT
                    column_name,
                    data_type,
                    udt_name
                FROM information_schema.columns
                WHERE table_name = 'evidence_objects'
                ORDER BY ordinal_position
                """
            )
        )

        print("\nEVIDENCE OBJECT COLUMNS:")

        for row in columns_result:
            print(row)


if __name__ == "__main__":
    asyncio.run(check_schema())