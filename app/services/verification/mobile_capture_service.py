from datetime import timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_secure_token,
    hash_verification_token,
)
from app.db.models.mobile_capture_session import (
    MobileCaptureSession,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.utils.time import utc_now


class MobileCaptureError(ValueError):
    pass


class MobileCaptureUnavailableError(
    MobileCaptureError
):
    pass


class InvalidMobileCaptureTokenError(
    MobileCaptureError
):
    pass


class InvalidMobileCaptureSessionError(
    MobileCaptureError
):
    pass


def _request_allows_capture(
    request: VerificationRequest,
) -> bool:
    request_status = getattr(
        request.status,
        "value",
        request.status,
    )

    return request_status in {
        "pending",
        "more_info",
    }


def _hash_token(
    raw_token: str,
) -> str:
    # Reuse the project's pepper-backed HMAC-SHA256
    # representation instead of plain SHA-256.
    return hash_verification_token(
        raw_token
    )


async def _validate_parent_authorization(
    session: AsyncSession,
    *,
    mobile_session: MobileCaptureSession,
) -> tuple[
    VerificationRequest,
    VerificationSession,
]:
    now = utc_now()

    verification_request = await session.get(
        VerificationRequest,
        mobile_session.verification_request_id,
    )

    verification_session = await session.get(
        VerificationSession,
        mobile_session.verification_session_id,
    )

    if (
        verification_request is None
        or verification_session is None
    ):
        raise MobileCaptureUnavailableError()

    if not _request_allows_capture(
        verification_request
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_request.expires_at
        is not None
        and verification_request.expires_at
        <= now
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.revoked_at
        is not None
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.expires_at
        <= now
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.verification_request_id
        != verification_request.id
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.discord_user_id
        != verification_request.assigned_discord_user_id
    ):
        raise MobileCaptureUnavailableError()

    return (
        verification_request,
        verification_session,
    )


async def create_mobile_capture_session(
    session: AsyncSession,
    *,
    verification_request: VerificationRequest,
    verification_session: VerificationSession,
) -> tuple[
    MobileCaptureSession,
    str,
]:
    if not _request_allows_capture(
        verification_request
    ):
        raise MobileCaptureUnavailableError()

    now = utc_now()

    if (
        verification_request.expires_at
        is not None
        and verification_request.expires_at
        <= now
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.revoked_at
        is not None
        or verification_session.expires_at
        <= now
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.verification_request_id
        != verification_request.id
    ):
        raise MobileCaptureUnavailableError()

    if (
        verification_session.discord_user_id
        != verification_request.assigned_discord_user_id
    ):
        raise MobileCaptureUnavailableError()

    # Only one usable handoff should exist per authenticated
    # desktop verification session.
    result = await session.execute(
        select(
            MobileCaptureSession
        )
        .where(
            MobileCaptureSession.verification_session_id
            == verification_session.id,
            MobileCaptureSession.revoked_at.is_(
                None
            ),
            MobileCaptureSession.completed_at.is_(
                None
            ),
            MobileCaptureSession.expires_at
            > now,
        )
        .with_for_update()
    )

    existing_sessions = list(
        result.scalars().all()
    )

    for existing in existing_sessions:
        existing.revoked_at = now
        existing.status = "revoked"
        existing.last_activity_at = now

        # Also invalidate any phone credential previously
        # derived from the superseded QR session.
        existing.mobile_session_token_hash = None
        existing.mobile_session_expires_at = None

    raw_handoff_token = generate_secure_token(
        32
    )

    mobile_session = MobileCaptureSession(
        verification_request_id=(
            verification_request.id
        ),
        verification_session_id=(
            verification_session.id
        ),
        token_hash=_hash_token(
            raw_handoff_token
        ),
        mobile_session_token_hash=None,
        status="pending",
        created_at=now,
        expires_at=(
            now
            + timedelta(
                minutes=(
                    settings
                    .mobile_capture_ttl_minutes
                )
            )
        ),
        last_activity_at=now,
    )

    session.add(
        mobile_session
    )

    await session.flush()

    return (
        mobile_session,
        raw_handoff_token,
    )


async def exchange_mobile_capture_token(
    session: AsyncSession,
    *,
    raw_handoff_token: str,
) -> tuple[
    MobileCaptureSession,
    str,
]:
    """
    Atomically consume the QR token and issue a separate
    evidence-only mobile session credential.

    The QR token cannot be exchanged again.
    """

    token_hash = _hash_token(
        raw_handoff_token
    )

    result = await session.execute(
        select(
            MobileCaptureSession
        )
        .where(
            MobileCaptureSession.token_hash
            == token_hash
        )
        .with_for_update()
    )

    mobile_session = (
        result.scalar_one_or_none()
    )

    if mobile_session is None:
        raise InvalidMobileCaptureTokenError()

    now = utc_now()

    if (
        mobile_session.revoked_at
        is not None
        or mobile_session.completed_at
        is not None
        or mobile_session.expires_at
        <= now
        or mobile_session.exchange_consumed_at
        is not None
    ):
        raise InvalidMobileCaptureTokenError()

    (
        _verification_request,
        verification_session,
    ) = await _validate_parent_authorization(
        session,
        mobile_session=mobile_session,
    )

    raw_mobile_token = generate_secure_token(
        32
    )

    mobile_expiry = min(
        mobile_session.expires_at,
        verification_session.expires_at,
    )

    mobile_session.exchange_consumed_at = now

    mobile_session.mobile_session_token_hash = (
        _hash_token(
            raw_mobile_token
        )
    )

    mobile_session.mobile_session_expires_at = (
        mobile_expiry
    )

    mobile_session.connected_at = now
    mobile_session.last_activity_at = now
    mobile_session.status = "connected"

    await session.flush()

    return (
        mobile_session,
        raw_mobile_token,
    )


async def get_valid_mobile_capture_session(
    session: AsyncSession,
    *,
    raw_mobile_token: str,
    lock: bool = False,
) -> MobileCaptureSession:
    mobile_token_hash = _hash_token(
        raw_mobile_token
    )

    statement = select(
        MobileCaptureSession
    ).where(
        MobileCaptureSession.mobile_session_token_hash
        == mobile_token_hash
    )

    if lock:
        statement = (
            statement.with_for_update()
        )

    result = await session.execute(
        statement
    )

    mobile_session = (
        result.scalar_one_or_none()
    )

    if mobile_session is None:
        raise InvalidMobileCaptureSessionError()

    now = utc_now()

    if (
        mobile_session.revoked_at
        is not None
        or mobile_session.completed_at
        is not None
        or mobile_session.exchange_consumed_at
        is None
        or mobile_session.mobile_session_expires_at
        is None
        or mobile_session.mobile_session_expires_at
        <= now
        or mobile_session.expires_at
        <= now
    ):
        raise InvalidMobileCaptureSessionError()

    await _validate_parent_authorization(
        session,
        mobile_session=mobile_session,
    )

    mobile_session.last_activity_at = now

    return mobile_session


async def revoke_mobile_capture_session(
    session: AsyncSession,
    *,
    mobile_capture_id: UUID,
    verification_session: VerificationSession,
) -> MobileCaptureSession:
    mobile_session = await session.get(
        MobileCaptureSession,
        mobile_capture_id,
    )

    if mobile_session is None:
        raise MobileCaptureUnavailableError()

    if (
        mobile_session.verification_session_id
        != verification_session.id
    ):
        raise MobileCaptureUnavailableError()

    now = utc_now()

    mobile_session.revoked_at = now
    mobile_session.status = "revoked"
    mobile_session.last_activity_at = now

    # Make an already-issued phone cookie useless immediately.
    mobile_session.mobile_session_token_hash = None
    mobile_session.mobile_session_expires_at = None

    await session.flush()

    return mobile_session