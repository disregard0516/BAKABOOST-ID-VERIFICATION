from enum import StrEnum

from app.core.constants import AdminRole


class Permission(StrEnum):
    REQUEST_CREATE = "request:create"
    REQUEST_VIEW = "request:view"
    REQUEST_REVOKE = "request:revoke"
    REQUEST_EXTEND = "request:extend"

    QUEUE_VIEW = "queue:view"
    CASE_CLAIM = "case:claim"
    CASE_ASSIGN = "case:assign"

    EVIDENCE_VIEW = "evidence:view"
    EVIDENCE_DOWNLOAD = "evidence:download"
    EVIDENCE_DELETE = "evidence:delete"

    DECISION_APPROVE = "decision:approve"
    DECISION_REJECT = "decision:reject"
    DECISION_MORE_INFO = "decision:more_info"

    AUDIT_VIEW = "audit:view"

    ACCESS_GRANT = "access:grant"
    ACCESS_REVOKE = "access:revoke"

    ADMIN_MANAGE = "admin:manage"
    SECURITY_MANAGE = "security:manage"


ROLE_PERMISSIONS: dict[AdminRole, set[Permission]] = {
    AdminRole.REVIEWER: {
        Permission.REQUEST_VIEW,
        Permission.QUEUE_VIEW,
        Permission.CASE_CLAIM,
        Permission.EVIDENCE_VIEW,
        Permission.DECISION_APPROVE,
        Permission.DECISION_REJECT,
        Permission.DECISION_MORE_INFO,
        Permission.AUDIT_VIEW,
    },

    AdminRole.ADMIN: {
        Permission.REQUEST_CREATE,
        Permission.REQUEST_VIEW,
        Permission.REQUEST_REVOKE,
        Permission.REQUEST_EXTEND,
        Permission.QUEUE_VIEW,
        Permission.CASE_CLAIM,
        Permission.CASE_ASSIGN,
        Permission.EVIDENCE_VIEW,
        Permission.EVIDENCE_DOWNLOAD,
        Permission.EVIDENCE_DELETE,
        Permission.DECISION_APPROVE,
        Permission.DECISION_REJECT,
        Permission.DECISION_MORE_INFO,
        Permission.AUDIT_VIEW,
        Permission.ACCESS_GRANT,
        Permission.ACCESS_REVOKE,
    },

    AdminRole.SUPER_ADMIN: set(Permission),
}


def role_has_permission(
    role: AdminRole,
    permission: Permission,
) -> bool:
    return permission in ROLE_PERMISSIONS[role]