
from app.core.constants import (
    VerificationStatus,
)
from app.services.verification.state_machine import (
    can_transition,
)


def test_pending_submission_enters_queue() -> None:
    assert can_transition(
        VerificationStatus.PENDING,
        VerificationStatus.QUEUED,
    )


def test_more_info_can_resubmit_to_queue() -> None:
    assert can_transition(
        VerificationStatus.MORE_INFO,
        VerificationStatus.QUEUED,
    )


def test_submission_cannot_directly_approve() -> None:
    assert not can_transition(
        VerificationStatus.PENDING,
        VerificationStatus.APPROVED,
    )