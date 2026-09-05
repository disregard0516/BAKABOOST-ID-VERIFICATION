from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AdminRole,
    AuditAction,
)
from app.core.security import (
    generate_secure_token,
    sha256_token,
)
from app.db.models.admin import Admin
from app.db.models.admin_invitation import (
    AdminInvitation,
)
from app.services.admin.auth import AdminIdentity
from app.services.audit.service import (
    record_audit_event,
)
from app.utils.time import utc_now

# ============================================================
# SECURITY CONSTANTS
# ============================================================


_ADMIN_INVITATION_TOKEN_BYTES = 48
_MAX_EMAIL_LENGTH = 320
_MAX_DISPLAY_NAME_LENGTH = 120
_MAX_REVOKE_REASON_LENGTH = 255


# ============================================================
# EXCEPTIONS
# ============================================================


class AdminInvitationError(Exception):
    """Base administrator-invitation failure."""


class AdminInvitationPermissionError(
    AdminInvitationError
):
    """Actor is not permitted to manage invitations."""


class AdminInvitationNotFoundError(
    AdminInvitationError
):
    """Invitation does not exist or cannot be resolved."""


class AdminInvitationExpiredError(
    AdminInvitationError
):
    """Invitation has expired."""


class AdminInvitationRevokedError(
    AdminInvitationError
):
    """Invitation has been revoked."""


class AdminInvitationAlreadyAcceptedError(
    AdminInvitationError
):
    """Invitation has already been consumed."""


class AdminInvitationIdentityError(
    AdminInvitationError
):
    """
    Authenticated identity is not eligible to consume the
    invitation.
    """


class AdminInvitationConflictError(
    AdminInvitationError
):
    """
    Invitation or administrator conflicts with existing
    persistent state.
    """


# ============================================================
# RESULT OBJECTS
# ============================================================


@dataclass(frozen=True)
class CreatedAdminInvitation:
    """
    Result returned when an invitation is created.

    raw_token is secret material.

    It may be returned to the authorized route exactly once
    so the route can construct/deliver the invitation URL.

    It must never be persisted, audited or logged.
    """

    invitation: AdminInvitation
    raw_token: str


@dataclass(frozen=True)
class AcceptedAdminInvitation:
    """
    Result of successful invitation acceptance.
    """

    invitation: AdminInvitation
    admin: Admin


# ============================================================
# NORMALIZATION
# ============================================================


def _normalize_email(
    value: str,
) -> str:
    if not isinstance(
        value,
        str,
    ):
        raise AdminInvitationError(
            "Administrator email is invalid."
        )

    normalized = value.strip().lower()

    if (
        not normalized
        or len(normalized)
        > _MAX_EMAIL_LENGTH
    ):
        raise AdminInvitationError(
            "Administrator email is invalid."
        )

    #
    # This is intentionally conservative.
    #
    # Do not implement provider-specific transformations such
    # as Gmail dot removal or plus-address stripping.
    #
    if (
        "@" not in normalized
        or normalized.startswith("@")
        or normalized.endswith("@")
    ):
        raise AdminInvitationError(
            "Administrator email is invalid."
        )

    return normalized


def _normalize_display_name(
    value: str | None,
    *,
    fallback_email: str,
) -> str:
    if value is not None:
        normalized = value.strip()

        if normalized:
            return normalized[
                :_MAX_DISPLAY_NAME_LENGTH
            ]

    local_part = fallback_email.split(
        "@",
        1,
    )[0].strip()

    if not local_part:
        local_part = "Administrator"

    return local_part[
        :_MAX_DISPLAY_NAME_LENGTH
    ]


def _normalize_revoke_reason(
    value: str | None,
) -> str:
    if value is None:
        return "revoked_by_super_admin"

    normalized = value.strip()

    if not normalized:
        normalized = "revoked_by_super_admin"

    return normalized[
        :_MAX_REVOKE_REASON_LENGTH
    ]


def _normalized_utc(
    value: datetime,
    *,
    field_name: str,
) -> datetime:
    if value.tzinfo is None:
        raise AdminInvitationError(
            f"{field_name} must be timezone-aware."
        )

    return value.astimezone(
        UTC
    )


# ============================================================
# AUTHORIZATION
# ============================================================


def _require_active_super_admin(
    actor: Admin,
) -> None:
    """
    Team/invitation management is owner-level functionality.

    Authentication alone is insufficient. The actor must be
    an active local SUPER_ADMIN.
    """

    if (
        not actor.is_active
        or actor.role
        != AdminRole.SUPER_ADMIN
    ):
        raise AdminInvitationPermissionError(
            "Super administrator permission required."
        )


# ============================================================
# IDENTITY CLAIM HELPERS
# ============================================================

def _identity_display_name(
    identity: AdminIdentity,
) -> str | None:
    for claim_name in (
        "name",
        "nickname",
        "preferred_username",
    ):
        value = identity.claims.get(
            claim_name
        )

        if isinstance(
            value,
            str,
        ):
            normalized = value.strip()

            if normalized:
                return normalized

    return None


# ============================================================
# INVITATION STATE
# ============================================================


def _invitation_is_expired(
    invitation: AdminInvitation,
    *,
    now: datetime,
) -> bool:
    return invitation.expires_at <= now


def _require_usable_invitation(
    invitation: AdminInvitation,
    *,
    now: datetime,
) -> None:
    if invitation.accepted_at is not None:
        raise (
            AdminInvitationAlreadyAcceptedError(
                "Administrator invitation has "
                "already been accepted."
            )
        )

    if invitation.revoked_at is not None:
        raise AdminInvitationRevokedError(
            "Administrator invitation has "
            "been revoked."
        )

    if _invitation_is_expired(
        invitation,
        now=now,
    ):
        raise AdminInvitationExpiredError(
            "Administrator invitation has "
            "expired."
        )


# ============================================================
# INVITATION CREATION
# ============================================================


async def create_admin_invitation(
    session: AsyncSession,
    *,
    acting_admin: Admin,
    email: str,
    role: AdminRole,
    expires_at: datetime,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> CreatedAdminInvitation:
    """
    Create a one-time administrator invitation.

    SECURITY CONTRACT
    -----------------
    - only an active SUPER_ADMIN may invite
    - raw invitation token is never persisted
    - only SHA-256 token digest is stored
    - invitation must expire in the future
    - duplicate active invitations are rejected
    - existing administrator email is rejected
    - service deliberately does NOT commit

    The caller owns the transaction.
    """

    _require_active_super_admin(
        acting_admin
    )

    normalized_email = (
        _normalize_email(
            email
        )
    )

    if not isinstance(
        role,
        AdminRole,
    ):
        try:
            role = AdminRole(
                role
            )
        except (
            TypeError,
            ValueError,
        ) as exc:
            raise AdminInvitationError(
                "Administrator role is invalid."
            ) from exc

    normalized_expiry = (
        _normalized_utc(
            expires_at,
            field_name="Invitation expiration",
        )
    )

    now = utc_now()

    if normalized_expiry <= now:
        raise AdminInvitationError(
            "Invitation expiration must be "
            "in the future."
        )

    #
    # Serialize invitation creation for matching invitation
    # rows that already exist.
    #
    # Database uniqueness remains the final integrity boundary
    # for concurrent administrator creation.
    #
    existing_admin_result = (
        await session.execute(
            select(
                Admin
            )
            .where(
                Admin.email
                == normalized_email
            )
            .with_for_update()
        )
    )

    existing_admin = (
        existing_admin_result
        .scalar_one_or_none()
    )

    if existing_admin is not None:
        raise AdminInvitationConflictError(
            "An administrator account already "
            "exists for this email."
        )

    invitation_result = (
        await session.execute(
            select(
                AdminInvitation
            )
            .where(
                AdminInvitation.email
                == normalized_email,
                AdminInvitation.accepted_at.is_(
                    None
                ),
                AdminInvitation.revoked_at.is_(
                    None
                ),
                AdminInvitation.expires_at
                > now,
            )
            .with_for_update()
        )
    )

    active_invitation = (
        invitation_result
        .scalars()
        .first()
    )

    if active_invitation is not None:
        raise AdminInvitationConflictError(
            "An active administrator invitation "
            "already exists for this email."
        )

    raw_token = generate_secure_token(
        _ADMIN_INVITATION_TOKEN_BYTES
    )

    invitation = AdminInvitation(
        email=normalized_email,
        role=role,
        token_hash=sha256_token(
            raw_token
        ),
        invited_by_admin_id=(
            acting_admin.id
        ),
        expires_at=normalized_expiry,
        created_at=now,
        updated_at=now,
        accepted_at=None,
        accepted_admin_id=None,
        revoked_at=None,
        revoked_by_admin_id=None,
        revoke_reason=None,
    )

    session.add(
        invitation
    )

    #
    # Flush before exposing raw_token so database integrity
    # errors surface first.
    #
    await session.flush()

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=AuditAction.ADMIN_INVITED.value,
        metadata={
            "invitation_id": str(
                invitation.id
            ),
            "invited_email": (
                normalized_email
            ),
            "invited_role": role.value,
            "expires_at": (
                normalized_expiry
                .isoformat()
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

    return CreatedAdminInvitation(
        invitation=invitation,
        raw_token=raw_token,
    )


# ============================================================
# INVITATION REVOCATION
# ============================================================


async def revoke_admin_invitation(
    session: AsyncSession,
    *,
    invitation_id: uuid.UUID,
    acting_admin: Admin,
    reason: str | None = None,
    ip_address: str | None = None,
    admin_session_id: uuid.UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> AdminInvitation:
    """
    Revoke an unused administrator invitation.

    Revocation is idempotent for an already-revoked
    invitation.

    Accepted invitations cannot be revoked.

    This function deliberately does NOT commit.
    """

    _require_active_super_admin(
        acting_admin
    )

    result = await session.execute(
        select(
            AdminInvitation
        )
        .where(
            AdminInvitation.id
            == invitation_id
        )
        .with_for_update()
    )

    invitation = (
        result.scalar_one_or_none()
    )

    if invitation is None:
        raise AdminInvitationNotFoundError(
            "Administrator invitation "
            "not found."
        )

    if invitation.accepted_at is not None:
        raise (
            AdminInvitationAlreadyAcceptedError(
                "Accepted administrator "
                "invitations cannot be revoked."
            )
        )

    if invitation.revoked_at is not None:
        return invitation

    now = utc_now()
    normalized_reason = (
        _normalize_revoke_reason(
            reason
        )
    )

    invitation.revoked_at = now
    invitation.revoked_by_admin_id = (
        acting_admin.id
    )
    invitation.revoke_reason = (
        normalized_reason
    )
    invitation.updated_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            acting_admin.id
        ),
        action=AuditAction.ADMIN_SECURITY_CHANGED.value,
        metadata={
            "event": (
                "admin_invitation_revoked"
            ),
            "invitation_id": str(
                invitation.id
            ),
            "invited_email": (
                invitation.email
            ),
            "invited_role": (
                invitation.role.value
            ),
            "reason": normalized_reason,
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

    return invitation


# ============================================================
# INVITATION ACCEPTANCE
# ============================================================


async def accept_admin_invitation(
    session: AsyncSession,
    *,
    raw_token: str,
    identity: AdminIdentity,
    ip_address: str | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
) -> AcceptedAdminInvitation:
    """
    Consume a one-time invitation and provision a local
    administrator account.

    SECURITY CONTRACT
    -----------------
    1. Raw token is hashed before lookup.
    2. Matching invitation row is locked.
    3. Invitation must be active and unexpired.
    4. Authenticated identity must expose an immutable subject.
    5. Authenticated identity must expose an email address.
    6. Authenticated email must equal invited email exactly
       after normalization.
    7. Subject/email cannot already belong to another admin.
    8. New Admin is permanently bound to identity.subject.
    9. Invitation is atomically marked accepted.
    10. Raw invitation token is never audited.
    11. Service deliberately does NOT commit.

    The authentication layer is responsible for
    cryptographically validating the external identity before
    this service is called. Production uses Cloudflare Access.

    Future administrator authentication uses auth_subject,
    never email.
    """

    if not isinstance(
        raw_token,
        str,
    ):
        raise AdminInvitationNotFoundError(
            "Administrator invitation "
            "is invalid."
        )

    normalized_token = (
        raw_token.strip()
    )

    if not normalized_token:
        raise AdminInvitationNotFoundError(
            "Administrator invitation "
            "is invalid."
        )

    token_hash = sha256_token(
        normalized_token
    )

    result = await session.execute(
        select(
            AdminInvitation
        )
        .where(
            AdminInvitation.token_hash
            == token_hash
        )
        .with_for_update()
    )

    invitation = (
        result.scalar_one_or_none()
    )

    #
    # Deliberately generic lookup failure. Never disclose
    # whether a particular invitation/email exists.
    #
    if invitation is None:
        raise AdminInvitationNotFoundError(
            "Administrator invitation "
            "is invalid."
        )

    now = utc_now()

    _require_usable_invitation(
        invitation,
        now=now,
    )

    subject = identity.subject.strip()

    if not subject:
        raise AdminInvitationIdentityError(
            "Authenticated administrator "
            "identity is invalid."
        )

    if identity.email is None:
        raise AdminInvitationIdentityError(
            "An authenticated email address is "
            "required to accept this invitation."
        )

    authenticated_email = (
        _normalize_email(
            identity.email
        )
    )

    invited_email = _normalize_email(
        invitation.email
    )

    if authenticated_email != invited_email:
        raise AdminInvitationIdentityError(
            "Authenticated identity does not "
            "match this invitation."
        )

    #
    # Lock any existing administrator associated with either
    # identity binding.
    #
    existing_result = (
        await session.execute(
            select(
                Admin
            )
            .where(
                or_(
                    Admin.auth_subject
                    == subject,
                    Admin.email
                    == authenticated_email,
                )
            )
            .with_for_update()
        )
    )

    existing_admins = list(
        existing_result.scalars().all()
    )

    if existing_admins:
        #
        # We intentionally do not silently attach an invitation
        # to an existing account. That could turn email reuse
        # or identity-provider account changes into privilege
        # escalation.
        #
        raise AdminInvitationConflictError(
            "Administrator identity is already "
            "provisioned."
        )

    display_name = (
        _normalize_display_name(
            _identity_display_name(
                identity
            ),
            fallback_email=(
                authenticated_email
            ),
        )
    )

    admin = Admin(
        auth_subject=subject,
        email=authenticated_email,
        display_name=display_name,
        role=invitation.role,
        is_active=True,
        mfa_enabled=False,
        security_version=1,
        last_login_at=None,
        invited_at=(
            invitation.created_at
        ),
        activated_at=now,
        disabled_at=None,
        security_updated_at=now,
        created_at=now,
        updated_at=now,
    )

    session.add(
        admin
    )

    #
    # Flush first so database uniqueness constraints remain
    # the final defense against concurrent identity/email
    # provisioning.
    #
    await session.flush()

    invitation.accepted_at = now
    invitation.accepted_admin_id = (
        admin.id
    )
    invitation.updated_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.SYSTEM.value,
        actor_id=None,
        action=AuditAction.ADMIN_CREATED.value,
        metadata={
            "admin_id": str(
                admin.id
            ),
            "invitation_id": str(
                invitation.id
            ),
            "role": (
                admin.role.value
            ),
            #
            # Do NOT record identity.subject here.
            #
            # It is the permanent authentication identifier
            # and does not need to be duplicated throughout
            # audit metadata.
            #
            "activation_source": (
                "admin_invitation"
            ),
        },
        ip_address=ip_address,
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await record_audit_event(
        session,
        actor_type=ActorType.SYSTEM.value,
        actor_id=None,
        action=AuditAction.ADMIN_ACTIVATED.value,
        metadata={
            "admin_id": str(
                admin.id
            ),
            "invitation_id": str(
                invitation.id
            ),
            "role": (
                admin.role.value
            ),
        },
        ip_address=ip_address,
        request_id=request_id,
        user_agent=user_agent,
        outcome="success",
    )

    await session.flush()

    return AcceptedAdminInvitation(
        invitation=invitation,
        admin=admin,
    )


# ============================================================
# INVITATION LOOKUP
# ============================================================


async def get_admin_invitation(
    session: AsyncSession,
    *,
    invitation_id: uuid.UUID,
    acting_admin: Admin,
) -> AdminInvitation:
    """
    Retrieve invitation information for Team & Access.

    Only active SUPER_ADMIN accounts may inspect invitation
    administration records.

    This function deliberately does NOT commit.
    """

    _require_active_super_admin(
        acting_admin
    )

    result = await session.execute(
        select(
            AdminInvitation
        ).where(
            AdminInvitation.id
            == invitation_id
        )
    )

    invitation = (
        result.scalar_one_or_none()
    )

    if invitation is None:
        raise AdminInvitationNotFoundError(
            "Administrator invitation "
            "not found."
        )

    return invitation


async def list_admin_invitations(
    session: AsyncSession,
    *,
    acting_admin: Admin,
) -> list[AdminInvitation]:
    """
    Return administrator invitations newest-first.

    This function deliberately does NOT commit.
    """

    _require_active_super_admin(
        acting_admin
    )

    result = await session.execute(
        select(
            AdminInvitation
        ).order_by(
            AdminInvitation.created_at.desc(),
            AdminInvitation.id.desc(),
        )
    )

    return list(
        result.scalars().all()
    )