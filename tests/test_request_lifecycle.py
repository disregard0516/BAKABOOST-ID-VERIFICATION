from app.core.constants import VerificationStatus
from app.services.verification.state_machine import (
    can_transition,
)


def test_pending_can_be_revoked() -> None:
    assert can_transition(
        VerificationStatus.PENDING,
        VerificationStatus.REVOKED,
    )


def test_queued_can_be_revoked() -> None:
    assert can_transition(
        VerificationStatus.QUEUED,
        VerificationStatus.REVOKED,
    )


def test_in_review_can_be_revoked() -> None:
    assert can_transition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.REVOKED,
    )


def test_approved_can_be_revoked() -> None:
    assert can_transition(
        VerificationStatus.APPROVED,
        VerificationStatus.REVOKED,
    )


def test_revoked_is_terminal() -> None:
    assert not can_transition(
        VerificationStatus.REVOKED,
        VerificationStatus.PENDING,
    )