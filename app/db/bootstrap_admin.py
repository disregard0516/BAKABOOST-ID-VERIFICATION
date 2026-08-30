import asyncio
import os

from sqlalchemy import select

from app.core.constants import AdminRole
from app.db.models.admin import Admin
from app.db.session import AsyncSessionLocal


async def bootstrap_admin() -> None:
    auth_subject = os.environ.get(
        "BOOTSTRAP_ADMIN_AUTH_SUBJECT"
    )

    email = os.environ.get(
        "BOOTSTRAP_ADMIN_EMAIL"
    )

    if not auth_subject or not email:
        raise RuntimeError(
            "Bootstrap admin environment variables are required."
        )

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Admin).where(
                Admin.auth_subject == auth_subject
            )
        )

        if result.scalar_one_or_none():
            print("Bootstrap admin already exists.")
            return

        admin = Admin(
            auth_subject=auth_subject,
            email=email,
            display_name="Initial Administrator",
            role=AdminRole.SUPER_ADMIN,
            is_active=True,
            mfa_enabled=True,
        )

        session.add(admin)
        await session.commit()

        print("Bootstrap super-admin created.")


if __name__ == "__main__":
    asyncio.run(
        bootstrap_admin()
    )