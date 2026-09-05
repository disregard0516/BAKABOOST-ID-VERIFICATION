from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AdminRole,
    AuditAction,
)
from app.db.models.admin import Admin
from app.services.admin.session_service import (
    invalidate_admin_security_state,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.utils.time import utc_now

# ============================================================
# EXCEPTIONS
# ============================================================


class AdminTeamError(Exception):
    """Base Team & Access management failure."""


class AdminTeamPermissionError(
    AdminTeamError
):
    """Actor lacks Team & Access permission."""


class AdminTeamNotFoundError(
    AdminTeamError
):
    """Requested administrator does not exist."""


class AdminTeamConflictError(
    AdminTeamError
):
    """Requested administrator mutation is unsafe."""


# ============================================================
# AUTHORIZATION / LOCKING
# ============================================================


def _require_active_super_admin(
    actor: Admin,
) -> None:
    """
    Lightweight permission check for read-only operations.

    Mutating operations additionally revalidate the actor
    against locked database state.
    """

    if (
        not actor.is_active
        or actor.role
        != AdminRole.SUPER_ADMIN
    ):
        raise AdminTeamPermissionError(
            "Super administrator permission required."
        )


async def _lock_active_super_admins(
    session: AsyncSession,
    *,
    acting_admin_id: uuid.UUID,
) -> list[Admin]:
    """
    Lock every currently-active SUPER_ADMIN in deterministic
    order.

    This serves two purposes:

    1. Revalidate that the acting administrator still has
       owner-level authority inside this transaction.
    2. Serialize operations that could remove owner-level
       administrators, preventing two concurrent transactions
       from each removing a different "last" SUPER_ADMIN.

    This function deliberately does NOT commit.
    """

    result = await session.execute(
        select(
            Admin
        )
        .where(
            Admin.is_active.is_(True),
            Admin.role
            == AdminRole.SUPER_ADMIN,
        )
        .order_by(
            Admin.id
        )
        .with_for_update()
    )

    super_admins = list(
        result.scalars().all()
    )

    actor_is_authorized = any(
        admin.id == acting_admin_id
        for admin in super_admins
    )

    if not actor_is_authorized:
        raise AdminTeamPermissionError(
            "Super administrator permission required."
        )

    return super_admins


async def _lock_target_admin(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
) -> Admin:
    result = await session.execute(
        select(
            Admin
        )
        .where(
            Admin.id == admin_id
        )
        .with_for_update()
    )

    admin = result.scalar_one_or_none()

    if admin is None:
        raise AdminTeamNotFoundError(
            "Administrator not found."
        )

    return admin


def _normalize_role(
    role: AdminRole | str,
) -> AdminRole:
    if isinstance(
        role,
        AdminRole,
    ):
        return role

    try:
        return AdminRole(
            role
        )
    except (
        TypeError,
        ValueError,
    ) as exc:
        raise AdminTeamError(
            "Administrator role is invalid."
        ) from exc


def _would_remove_last_super_admin(
    *,
    target: Admin,
    active_super_admins: list[Admin],
) -> bool:
    """
    Return True when removing SUPER_ADMIN capability from the
    target would leave no active SUPER_ADMIN account.
    """

    if (
        not target.is_active
        or target.role
        != AdminRole.SUPER_ADMIN
    ):
        return False

    return len(
        active_super_admins
    ) <= 1


# ============================================================
# TEAM READ OPERATIONS
# ============================================================


async def list_admin_team(
    session: AsyncSession,
    *,
    acting_admin: Admin,
) -> list[Admin]:
    """
    Return Team & Access members.

    Only active SUPER_ADMIN accounts may inspect the complete
    administrator roster.

    This function deliberately does NOT commit.
    """

    _require_active_super_admin(
        acting_admin
    )

    result = await session.execute(
        select(
            Admin
        )
        .order_by(
            Admin.created_at.asc(),
            Admin.id.asc(),
        )
    )

    return list(
        result.scalars().all()
    )


async def get_team_admin(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
    acting_admin: Admin,
) -> Admin:
    """
    Retrieve one administrator for Team & Access.

    This function deliberately does NOT commit.
    """

    _require_active_super_admin(
        acting_admin
    )

    result = await session.execute(
        select(
            Admin
        ).where(
            Admin.id == admin_id
        )
    )

    admin = result.scalar_one_or_none()

    if admin is None:
        raise AdminTeamNotFoundError(
            "Administrator not found."
        )

    return admin


# ============================================================
# ROLE MANAGEMENT
# ============================================================


async def change_admin_role(
    session: AsyncSession,
    *,
    target_admin_id: uuid.UUID,
    acting_admin: Admin,
    role: AdminRole | str,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> Admin:
    """
    Change an administrator's role.

    SECURITY CONTRACT
    -----------------
    - only an active SUPER_ADMIN may change roles
    - active SUPER_ADMIN rows are locked first
    - the last active SUPER_ADMIN cannot be demoted
    - role changes invalidate target security state
    - all target sessions are revoked
    - audit event is written
    - auth_subject is never changed
    - service deliberately does NOT commit
    """

    normalized_role = _normalize_role(
        role
    )

    active_super_admins = (
        await _lock_active_super_admins(
            session,
            acting_admin_id=(
                acting_admin.id
            ),
        )
    )

    target = await _lock_target_admin(
        session,
        admin_id=target_admin_id,
    )

    old_role = target.role

    if old_role == normalized_role:
        return target

    if (
        normalized_role
        != AdminRole.SUPER_ADMIN
        and _would_remove_last_super_admin(
            target=target,
            active_super_admins=(
                active_super_admins
            ),
        )
    ):
        raise AdminTeamConflictError(
            "The last active super administrator "
            "cannot be demoted."
        )

    now = utc_now()

    target.role = normalized_role
    target.updated_at = now

    await invalidate_admin_security_state(
        session,
        admin=target,
        reason="admin_role_changed",
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=(
            AuditAction
            .ADMIN_ROLE_CHANGED
            .value
        ),
        metadata={
            "target_admin_id": str(
                target.id
            ),
            "old_role": old_role.value,
            "new_role": (
                normalized_role.value
            ),
        },
        ip_address=ip_address,
        admin_session_id=(
            admin_session_id
        ),
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await session.flush()

    return target


# ============================================================
# ACCOUNT DISABLE
# ============================================================


async def disable_admin(
    session: AsyncSession,
    *,
    target_admin_id: uuid.UUID,
    acting_admin: Admin,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> Admin:
    """
    Disable an administrator account.

    Existing sessions are immediately invalidated inside the
    caller-owned transaction.

    The final active SUPER_ADMIN can never be disabled.

    This function deliberately does NOT commit.
    """

    active_super_admins = (
        await _lock_active_super_admins(
            session,
            acting_admin_id=(
                acting_admin.id
            ),
        )
    )

    target = await _lock_target_admin(
        session,
        admin_id=target_admin_id,
    )

    if not target.is_active:
        return target

    if _would_remove_last_super_admin(
        target=target,
        active_super_admins=(
            active_super_admins
        ),
    ):
        raise AdminTeamConflictError(
            "The last active super administrator "
            "cannot be disabled."
        )

    now = utc_now()

    target.is_active = False
    target.disabled_at = now
    target.updated_at = now

    await invalidate_admin_security_state(
        session,
        admin=target,
        reason="admin_disabled",
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=AuditAction.ADMIN_DISABLED.value,
        metadata={
            "target_admin_id": str(
                target.id
            ),
            "role": target.role.value,
        },
        ip_address=ip_address,
        admin_session_id=(
            admin_session_id
        ),
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await session.flush()

    return target


# ============================================================
# ACCOUNT ENABLE
# ============================================================


async def enable_admin(
    session: AsyncSession,
    *,
    target_admin_id: uuid.UUID,
    acting_admin: Admin,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> Admin:
    """
    Re-enable a disabled administrator.

    Security state is rotated even when enabling so credentials
    or sessions associated with the previous account state
    cannot become valid again.

    This function deliberately does NOT commit.
    """

    await _lock_active_super_admins(
        session,
        acting_admin_id=(
            acting_admin.id
        ),
    )

    target = await _lock_target_admin(
        session,
        admin_id=target_admin_id,
    )

    if target.is_active:
        return target

    now = utc_now()

    target.is_active = True
    target.disabled_at = None
    target.updated_at = now

    await invalidate_admin_security_state(
        session,
        admin=target,
        reason="admin_enabled",
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=AuditAction.ADMIN_ENABLED.value,
        metadata={
            "target_admin_id": str(
                target.id
            ),
            "role": target.role.value,
        },
        ip_address=ip_address,
        admin_session_id=(
            admin_session_id
        ),
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await session.flush()

    return target


# ============================================================
# EXPLICIT SESSION REVOCATION
# ============================================================


async def revoke_admin_access_sessions(
    session: AsyncSession,
    *,
    target_admin_id: uuid.UUID,
    acting_admin: Admin,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> Admin:
    """
    Force account-level administrator session invalidation.

    security_version is incremented in addition to revoking
    existing sessions. This protects against a concurrent
    session being created with the old security state.

    The account itself remains enabled.

    This function deliberately does NOT commit.
    """

    await _lock_active_super_admins(
        session,
        acting_admin_id=(
            acting_admin.id
        ),
    )

    target = await _lock_target_admin(
        session,
        admin_id=target_admin_id,
    )

    await invalidate_admin_security_state(
        session,
        admin=target,
        reason="sessions_revoked_by_super_admin",
    )

    target.updated_at = utc_now()

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=(
            AuditAction
            .ADMIN_SECURITY_CHANGED
            .value
        ),
        metadata={
            "event": (
                "admin_sessions_revoked"
            ),
            "target_admin_id": str(
                target.id
            ),
            "role": target.role.value,
        },
        ip_address=ip_address,
        admin_session_id=(
            admin_session_id
        ),
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await session.flush()

    return target