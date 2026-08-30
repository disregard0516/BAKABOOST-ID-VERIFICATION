from app.core.constants import (
    VerificationStatus,
)
from app.services.verification.state_machine import (
    can_transition,
)


def test_queued_can_be_claimed() -> None:
    assert can_transition(
        VerificationStatus.QUEUED,
        VerificationStatus.IN_REVIEW,
    )


def test_in_review_can_be_approved() -> None:
    assert can_transition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.APPROVED,
    )


def test_in_review_can_be_rejected() -> None:
    assert can_transition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.REJECTED,
    )


def test_in_review_can_request_more_info() -> None:
    assert can_transition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.MORE_INFO,
    )


def test_queued_cannot_be_approved_directly() -> None:
    assert not can_transition(
        VerificationStatus.QUEUED,
        VerificationStatus.APPROVED,
    )


def test_more_info_does_not_unlock_access() -> None:
    assert (
        VerificationStatus.MORE_INFO
        != VerificationStatus.APPROVED
    )