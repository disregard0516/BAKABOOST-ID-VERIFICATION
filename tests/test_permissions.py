from app.core.constants import AdminRole
from app.core.permissions import (
    Permission,
    role_has_permission,
)


def test_reviewer_can_view_evidence() -> None:
    assert role_has_permission(
        AdminRole.REVIEWER,
        Permission.EVIDENCE_VIEW,
    )


def test_reviewer_cannot_manage_admins() -> None:
    assert not role_has_permission(
        AdminRole.REVIEWER,
        Permission.ADMIN_MANAGE,
    )


def test_reviewer_cannot_create_request() -> None:
    assert not role_has_permission(
        AdminRole.REVIEWER,
        Permission.REQUEST_CREATE,
    )


def test_admin_can_create_request() -> None:
    assert role_has_permission(
        AdminRole.ADMIN,
        Permission.REQUEST_CREATE,
    )


def test_admin_cannot_manage_security() -> None:
    assert not role_has_permission(
        AdminRole.ADMIN,
        Permission.SECURITY_MANAGE,
    )


def test_super_admin_has_every_permission() -> None:
    for permission in Permission:
        assert role_has_permission(
            AdminRole.SUPER_ADMIN,
            permission,
        )