from enum import StrEnum


class VerificationStatus(StrEnum):
    PENDING = "pending"
    QUEUED = "queued"
    IN_REVIEW = "in_review"
    MORE_INFO = "more_info"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    REVOKED = "revoked"


class DecisionType(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_MORE_INFO = "request_more_info"


class ActorType(StrEnum):
    SYSTEM = "system"
    VERIFICATION_USER = "verification_user"
    ADMIN = "admin"
    REVIEWER = "reviewer"


class AccessGrantStatus(StrEnum):
    NOT_ISSUED = "not_issued"
    ISSUED = "issued"
    CONSUMED = "consumed"
    EXPIRED = "expired"
    REVOKED = "revoked"


class AdminRole(StrEnum):
    REVIEWER = "reviewer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class EvidenceType(StrEnum):
    DOCUMENT_FRONT = "document_front"
    DOCUMENT_BACK = "document_back"
    SELFIE = "selfie"
    LIVENESS = "liveness"


class EvidenceObjectStatus(StrEnum):
    TEMPORARY = "temporary"
    ATTACHED = "attached"
    DELETED = "deleted"


class AuditAction(StrEnum):
    # Verification request lifecycle
    REQUEST_CREATED = "request.created"
    REQUEST_VIEWED = "request.viewed"
    REQUEST_REVOKED = "request.revoked"
    REQUEST_EXPIRED = "request.expired"
    REQUEST_EXPIRATION_EXTENDED = (
        "request.expiration_extended"
    )

    # Discord authentication
    DISCORD_AUTH_SUCCEEDED = (
        "discord.auth_succeeded"
    )
    DISCORD_AUTH_DENIED = (
        "discord.auth_denied"
    )

    # Mobile evidence handoff
    MOBILE_CAPTURE_CREATED = (
        "mobile_capture.created"
    )
    MOBILE_CAPTURE_EXCHANGED = (
        "mobile_capture.exchanged"
    )
    MOBILE_EVIDENCE_UPLOADED = (
        "mobile_capture.evidence_uploaded"
    )
    MOBILE_CAPTURE_COMPLETED = (
        "mobile_capture.completed"
    )
    MOBILE_CAPTURE_REVOKED = (
        "mobile_capture.revoked"
    )

    # Submission
    SUBMISSION_CREATED = (
        "submission.created"
    )
    SUBMISSION_RESUBMITTED = (
        "submission.resubmitted"
    )

    # Review workflow
    CASE_CLAIMED = "review.claimed"
    CASE_ASSIGNED = "review.assigned"

    # Evidence lifecycle / access
    EVIDENCE_UPLOADED = "evidence.uploaded"
    EVIDENCE_VIEWED = "evidence.viewed"
    EVIDENCE_PREVIEWED = "evidence.previewed"
    EVIDENCE_DOWNLOADED = "evidence.downloaded"
    EVIDENCE_DELETED = "evidence.deleted"

    # Decisions
    MORE_INFO_REQUESTED = (
        "decision.more_info"
    )
    VERIFICATION_APPROVED = (
        "decision.approved"
    )
    VERIFICATION_REJECTED = (
        "decision.rejected"
    )

    # Discord server access
    ACCESS_GRANTED = "access.granted"
    ACCESS_REVOKED = "access.revoked"
    ACCESS_CONSUMED = "access.consumed"

    # Admin notes
    ADMIN_NOTE_CREATED = "note.created"