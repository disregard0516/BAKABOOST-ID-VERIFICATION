from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    ensure_session_matches_request,
)


def test_matching_discord_identity_passes() -> None:
    request = VerificationRequest(
        assigned_discord_user_id=123456789012345678,
    )

    session = VerificationSession(
        discord_user_id=123456789012345678,
    )

    request.id = session.verification_request_id

    ensure_session_matches_request(
        verification_session=session,
        verification_request=request,
    )


def test_wrong_discord_identity_fails() -> None:
    request = VerificationRequest(
        assigned_discord_user_id=123456789012345678,
    )

    session = VerificationSession(
        discord_user_id=999999999999999999,
    )

    request.id = session.verification_request_id

    try:
        ensure_session_matches_request(
            verification_session=session,
            verification_request=request,
        )

    except InvalidVerificationSessionError:
        return

    raise AssertionError(
        "Wrong Discord account was accepted."
    )