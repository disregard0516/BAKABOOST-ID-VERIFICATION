from app.core.constants import VerificationStatus

ALLOWED_TRANSITIONS: dict[
    VerificationStatus,
    set[VerificationStatus],
] = {
    VerificationStatus.PENDING: {
        VerificationStatus.QUEUED,
        VerificationStatus.EXPIRED,
        VerificationStatus.REVOKED,
    },

    VerificationStatus.QUEUED: {
        VerificationStatus.IN_REVIEW,
        VerificationStatus.EXPIRED,
        VerificationStatus.REVOKED,
    },

    VerificationStatus.IN_REVIEW: {
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
        VerificationStatus.MORE_INFO,
        VerificationStatus.REVOKED,
    },

    VerificationStatus.MORE_INFO: {
        VerificationStatus.QUEUED,
        VerificationStatus.IN_REVIEW,
        VerificationStatus.REJECTED,
        VerificationStatus.EXPIRED,
        VerificationStatus.REVOKED,
    },

    VerificationStatus.APPROVED: {
        VerificationStatus.REVOKED,
    },

    VerificationStatus.REJECTED: {
        VerificationStatus.MORE_INFO,
    },

    VerificationStatus.EXPIRED: set(),

    VerificationStatus.REVOKED: set(),
}


class InvalidStateTransitionError(ValueError):
    pass


def can_transition(
    current_status: VerificationStatus,
    new_status: VerificationStatus,
) -> bool:
    return new_status in ALLOWED_TRANSITIONS[current_status]


def require_transition(
    current_status: VerificationStatus,
    new_status: VerificationStatus,
) -> None:
    if not can_transition(current_status, new_status):
        raise InvalidStateTransitionError(
            f"Invalid verification transition: "
            f"{current_status.value} -> {new_status.value}"
        )