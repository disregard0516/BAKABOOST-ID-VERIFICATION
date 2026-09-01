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
    """
    Existing persisted administrator-role values.

    IMPORTANT:
    These names/values are deliberately preserved because they
    may already exist in PostgreSQL and are referenced by the
    current application.

    Current security meaning:

        SUPER_ADMIN -> owner-level authority
        ADMIN       -> administrator authority
        REVIEWER    -> limited review authority

    A later database migration can introduce the final
    Owner/Admin/Moderator/Support naming without corrupting
    existing administrator records.
    """

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
    # ========================================================
    # VERIFICATION REQUEST LIFECYCLE
    # ========================================================

    REQUEST_CREATED = "request.created"
    REQUEST_VIEWED = "request.viewed"
    REQUEST_REVOKED = "request.revoked"
    REQUEST_EXPIRED = "request.expired"

    REQUEST_EXPIRATION_EXTENDED = (
        "request.expiration_extended"
    )

    # ========================================================
    # DISCORD AUTHENTICATION
    # ========================================================

    DISCORD_AUTH_SUCCEEDED = (
        "discord.auth_succeeded"
    )

    DISCORD_AUTH_DENIED = (
        "discord.auth_denied"
    )

    # ========================================================
    # MOBILE EVIDENCE HANDOFF
    # ========================================================

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

    # ========================================================
    # SUBMISSION
    # ========================================================

    SUBMISSION_CREATED = (
        "submission.created"
    )

    SUBMISSION_RESUBMITTED = (
        "submission.resubmitted"
    )

    # ========================================================
    # REVIEW WORKFLOW
    # ========================================================

    CASE_CLAIMED = "review.claimed"
    CASE_ASSIGNED = "review.assigned"

    # ========================================================
    # EVIDENCE LIFECYCLE / ACCESS
    # ========================================================

    EVIDENCE_UPLOADED = "evidence.uploaded"
    EVIDENCE_VIEWED = "evidence.viewed"
    EVIDENCE_PREVIEWED = "evidence.previewed"
    EVIDENCE_DOWNLOADED = "evidence.downloaded"
    EVIDENCE_DELETED = "evidence.deleted"

    # ========================================================
    # VERIFICATION DECISIONS
    # ========================================================

    MORE_INFO_REQUESTED = (
        "decision.more_info"
    )

    VERIFICATION_APPROVED = (
        "decision.approved"
    )

    VERIFICATION_REJECTED = (
        "decision.rejected"
    )

    # ========================================================
    # DISCORD SERVER ACCESS
    # ========================================================

    ACCESS_GRANTED = "access.granted"
    ACCESS_REVOKED = "access.revoked"
    ACCESS_CONSUMED = "access.consumed"

    # ========================================================
    # ADMIN NOTES
    # ========================================================

    ADMIN_NOTE_CREATED = "note.created"

    # ========================================================
    # ADMIN AUTHENTICATION
    # ========================================================

    ADMIN_AUTH_SUCCEEDED = (
        "admin.auth_succeeded"
    )

    ADMIN_AUTH_DENIED = (
        "admin.auth_denied"
    )

    ADMIN_MFA_REQUIRED = (
        "admin.mfa_required"
    )

    ADMIN_REAUTH_REQUIRED = (
        "admin.reauthentication_required"
    )

    # ========================================================
    # ADMIN SESSION SECURITY
    # ========================================================

    ADMIN_SESSION_CREATED = (
        "admin.session_created"
    )

    ADMIN_SESSION_RESTORED = (
        "admin.session_restored"
    )

    ADMIN_SESSION_ROTATED = (
        "admin.session_rotated"
    )

    ADMIN_SESSION_REVOKED = (
        "admin.session_revoked"
    )

    ADMIN_ALL_SESSIONS_REVOKED = (
        "admin.all_sessions_revoked"
    )

    ADMIN_SESSION_EXPIRED = (
        "admin.session_expired"
    )

    ADMIN_SESSION_IDLE_EXPIRED = (
        "admin.session_idle_expired"
    )

    ADMIN_SESSION_SECURITY_INVALIDATED = (
        "admin.session_security_invalidated"
    )

    # ========================================================
    # ADMIN ACCOUNT LIFECYCLE
    # ========================================================

    ADMIN_CREATED = (
        "admin.created"
    )

    ADMIN_INVITED = (
        "admin.invited"
    )

    ADMIN_ACTIVATED = (
        "admin.activated"
    )

    ADMIN_DISABLED = (
        "admin.disabled"
    )

    ADMIN_ENABLED = (
        "admin.enabled"
    )

    ADMIN_ROLE_CHANGED = (
        "admin.role_changed"
    )

    ADMIN_SECURITY_CHANGED = (
        "admin.security_changed"
    )

    # ========================================================
    # ADMIN PERMISSION / AUTHORIZATION SECURITY
    # ========================================================

    ADMIN_PERMISSION_DENIED = (
        "admin.permission_denied"
    )

    ADMIN_SENSITIVE_ACTION_DENIED = (
        "admin.sensitive_action_denied"
    )

    ADMIN_CSRF_DENIED = (
        "admin.csrf_denied"
    )

    # ========================================================
    # SECURITY / RECOVERY
    # ========================================================

    ADMIN_RECOVERY_STARTED = (
        "admin.recovery_started"
    )

    ADMIN_RECOVERY_COMPLETED = (
        "admin.recovery_completed"
    )

    ADMIN_RECOVERY_DENIED = (
        "admin.recovery_denied"
    )