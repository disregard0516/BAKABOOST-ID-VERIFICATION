from app.core.constants import AdminRole
from app.core.permissions import (
    Permission,
    role_has_permission,
)
from app.core.security import (
    generate_secure_token,
    generate_verification_token,
)


def test_tokens_are_not_predictable() -> None:
    values = {
        generate_secure_token()
        for _ in range(100)
    }

    assert len(values) == 100


def test_verification_tokens_are_unique() -> None:
    values = {
        generate_verification_token()
        for _ in range(100)
    }

    assert len(values) == 100

def test_reviewer_cannot_delete_evidence() -> None:
    assert not role_has_permission(
        AdminRole.REVIEWER,
        Permission.EVIDENCE_DELETE,
    )


def test_reviewer_cannot_grant_access() -> None:
    assert not role_has_permission(
        AdminRole.REVIEWER,
        Permission.ACCESS_GRANT,
    )


def test_admin_cannot_manage_security() -> None:
    assert not role_has_permission(
        AdminRole.ADMIN,
        Permission.SECURITY_MANAGE,
    )