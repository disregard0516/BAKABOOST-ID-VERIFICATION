from app.core.constants import (
    VerificationStatus,
)


def access_is_allowed(
    status: VerificationStatus,
) -> bool:
    return status == VerificationStatus.APPROVED


def test_pending_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.PENDING
    )


def test_queued_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.QUEUED
    )


def test_in_review_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.IN_REVIEW
    )


def test_more_info_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.MORE_INFO
    )


def test_rejected_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.REJECTED
    )


def test_expired_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.EXPIRED
    )


def test_revoked_has_no_access() -> None:
    assert not access_is_allowed(
        VerificationStatus.REVOKED
    )


def test_approved_can_receive_access() -> None:
    assert access_is_allowed(
        VerificationStatus.APPROVED
    )