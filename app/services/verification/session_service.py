from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_secure_token, sha256_token
from app.db.models.verification_request import VerificationRequest
from app.db.models.verification_session import VerificationSession
from app.utils.time import utc_now


class InvalidVerificationSessionError(Exception):
    pass


async def create_verification_session(
    session: AsyncSession,
    *,
    verification_request_id,
    discord_user_id: int,
) -> tuple[VerificationSession, str]:
    raw_token = generate_secure_token(32)

    now = utc_now()

    verification_session = VerificationSession(
        verification_request_id=verification_request_id,
        discord_user_id=discord_user_id,
        session_token_hash=sha256_token(raw_token),
        created_at=now,
        expires_at=(
            now
            + timedelta(
                minutes=settings.verification_session_ttl_minutes
            )
        ),
    )

    session.add(verification_session)

    await session.flush()

    return verification_session, raw_token


async def get_valid_verification_session(
    session: AsyncSession,
    *,
    raw_token: str,
) -> VerificationSession:
    token_hash = sha256_token(raw_token)

    result = await session.execute(
        select(VerificationSession).where(
            VerificationSession.session_token_hash == token_hash
        )
    )

    verification_session = result.scalar_one_or_none()

    if verification_session is None:
        raise InvalidVerificationSessionError()

    now = utc_now()

    if verification_session.revoked_at is not None:
        raise InvalidVerificationSessionError()

    if verification_session.expires_at <= now:
        raise InvalidVerificationSessionError()

    verification_session.last_used_at = now

    return verification_session


def ensure_session_matches_request(
    *,
    verification_session: VerificationSession,
    verification_request: VerificationRequest,
) -> None:
    if (
        verification_session.verification_request_id
        != verification_request.id
    ):
        raise InvalidVerificationSessionError()

    if (
        verification_session.discord_user_id
        != verification_request.assigned_discord_user_id
    ):
        raise InvalidVerificationSessionError()

async def revoke_verification_session(
    session: AsyncSession,
    *,
    raw_token: str,
) -> None:
    token_hash = sha256_token(
        raw_token
    )

    result = await session.execute(
        select(VerificationSession).where(
            VerificationSession.session_token_hash
            == token_hash
        )
    )

    verification_session = (
        result.scalar_one_or_none()
    )

    if verification_session is None:
        return

    if verification_session.revoked_at is None:
        verification_session.revoked_at = (
            utc_now()
        )

    await session.commit()

async def rotate_verification_session(
    session: AsyncSession,
    *,
    current_session: VerificationSession,
) -> tuple[VerificationSession, str]:
    now = utc_now()

    current_session.revoked_at = now

    new_session, raw_token = (
        await create_verification_session(
            session,
            verification_request_id=(
                current_session.verification_request_id
            ),
            discord_user_id=(
                current_session.discord_user_id
            ),
        )
    )

    await session.flush()

    return new_session, raw_token