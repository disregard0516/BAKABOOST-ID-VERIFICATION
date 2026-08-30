import asyncio
from datetime import timedelta

from sqlalchemy import select

from app.core.config import settings
from app.core.constants import AdminRole
from app.core.security import (
    generate_verification_token,
    hash_verification_token,
)
from app.db.models.admin import Admin
from app.db.models.verification_request import VerificationRequest
from app.db.session import AsyncSessionLocal
from app.utils.time import utc_now

TEST_DISCORD_USER_ID = 1491110241851539528
TEST_USERNAME = "development-user"


async def get_or_create_dev_admin(
    session,
) -> Admin:
    result = await session.execute(
        select(Admin).where(
            Admin.auth_subject
            == "local-development-admin"
        )
    )

    admin = result.scalar_one_or_none()

    if admin is not None:
        return admin

    admin = Admin(
        auth_subject="local-development-admin",
        email="dev-admin@example.invalid",
        display_name="Local Development Admin",
        role=AdminRole.SUPER_ADMIN,
        is_active=True,
        mfa_enabled=True,
    )

    session.add(admin)
    await session.flush()

    return admin


async def create_test_request() -> None:
    async with AsyncSessionLocal() as session:
        admin = await get_or_create_dev_admin(
            session
        )

        raw_token = generate_verification_token()
        token_hash = hash_verification_token(
            raw_token
        )

        now = utc_now()

        request = VerificationRequest(
            assigned_discord_user_id=(
                TEST_DISCORD_USER_ID
            ),
            discord_username_snapshot=(
                TEST_USERNAME
            ),
            token_hash=token_hash,
            required_evidence_json={
                "legal_name": True,
                "date_of_birth": True,
                "age_confirmation": False,
                "issuing_country": True,
                "document_type": True,
                "document_front": True,
                "document_back": True,
                "selfie": False,
                "liveness": False,
            },
            expires_at=(
                now + timedelta(hours=24)
            ),
            submission_count=0,
            max_submissions=2,
            created_by_admin_id=admin.id,
            created_at=now,
            updated_at=now,
            last_activity_at=now,
        )

        session.add(request)

        await session.commit()
        await session.refresh(request)

        print()
        print("=" * 72)
        print("TEST VERIFICATION REQUEST CREATED")
        print("=" * 72)

        print(
            "Request ID:",
            request.id,
        )

        print(
            "Assigned Discord User ID:",
            request.assigned_discord_user_id,
        )

        print(
            "Status:",
            request.status.value,
        )

        print(
            "Expires:",
            request.expires_at,
        )

        print()

        print(
            "FRONTEND LINK:"
        )

        print(
            f"{settings.frontend_url.rstrip('/')}/v/{raw_token}"
        )

        print()
        print(
            "IMPORTANT: raw token is shown only here."
        )
        print("=" * 72)
        print()


if __name__ == "__main__":
    asyncio.run(
        create_test_request()
    )