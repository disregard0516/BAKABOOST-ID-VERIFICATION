import pytest

from app.core.constants import VerificationStatus
from app.services.verification.state_machine import (
    InvalidStateTransitionError,
    can_transition,
    require_transition,
)


def test_pending_can_be_queued() -> None:
    assert can_transition(
        VerificationStatus.PENDING,
        VerificationStatus.QUEUED,
    )


def test_pending_cannot_be_approved_directly() -> None:
    assert not can_transition(
        VerificationStatus.PENDING,
        VerificationStatus.APPROVED,
    )


def test_queued_can_enter_review() -> None:
    assert can_transition(
        VerificationStatus.QUEUED,
        VerificationStatus.IN_REVIEW,
    )


def test_in_review_can_be_approved() -> None:
    assert can_transition(
        VerificationStatus.IN_REVIEW,
        VerificationStatus.APPROVED,
    )


def test_more_info_can_return_to_queue() -> None:
    assert can_transition(
        VerificationStatus.MORE_INFO,
        VerificationStatus.QUEUED,
    )


def test_approved_cannot_return_to_pending() -> None:
    assert not can_transition(
        VerificationStatus.APPROVED,
        VerificationStatus.PENDING,
    )


def test_invalid_transition_raises_exception() -> None:
    with pytest.raises(InvalidStateTransitionError):
        require_transition(
            VerificationStatus.PENDING,
            VerificationStatus.APPROVED,
        )