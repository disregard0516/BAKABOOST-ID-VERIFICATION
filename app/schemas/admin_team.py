from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from app.core.constants import AdminRole

# ============================================================
# SHARED
# ============================================================


class AdminTeamSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )


# ============================================================
# ADMIN MEMBERS
# ============================================================


class AdminTeamMemberResponse(
    AdminTeamSchema
):
    id: uuid.UUID
    email: str
    display_name: str
    role: AdminRole
    is_active: bool
    mfa_enabled: bool
    last_login_at: datetime | None
    invited_at: datetime | None
    activated_at: datetime | None
    disabled_at: datetime | None
    security_updated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminTeamListResponse(
    AdminTeamSchema
):
    items: list[
        AdminTeamMemberResponse
    ]


# ============================================================
# INVITATIONS
# ============================================================


class CreateAdminInvitationRequest(
    AdminTeamSchema
):
    email: str = Field(
        min_length=3,
        max_length=320,
    )
    role: AdminRole
    expires_at: datetime

    @field_validator(
        "email"
    )
    @classmethod
    def normalize_email(
        cls,
        value: str,
    ) -> str:
        normalized = (
            value.strip().lower()
        )

        if not normalized:
            raise ValueError(
                "Email is required."
            )

        return normalized


class AdminInvitationResponse(
    AdminTeamSchema
):
    id: uuid.UUID
    email: str
    role: AdminRole
    invited_by_admin_id: uuid.UUID
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    accepted_at: datetime | None
    accepted_admin_id: (
        uuid.UUID | None
    )
    revoked_at: datetime | None
    revoked_by_admin_id: (
        uuid.UUID | None
    )
    revoke_reason: str | None


class AdminInvitationListResponse(
    AdminTeamSchema
):
    items: list[
        AdminInvitationResponse
    ]


class CreatedAdminInvitationResponse(
    AdminTeamSchema
):
    """
    Response returned after an administrator invitation has
    been created and its one-time credential has been sent
    through the configured email provider.

    The raw invitation token must never be returned to the
    administrator browser.
    """

    invitation: AdminInvitationResponse


class RevokeAdminInvitationRequest(
    AdminTeamSchema
):
    reason: str | None = Field(
        default=None,
        max_length=255,
    )


# ============================================================
# INVITATION ACCEPTANCE
# ============================================================


class AcceptAdminInvitationRequest(
    AdminTeamSchema
):
    invitation_token: str = Field(
        min_length=32,
        max_length=1024,
    )

    @field_validator(
        "invitation_token"
    )
    @classmethod
    def normalize_token(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized:
            raise ValueError(
                "Invitation token is required."
            )

        return normalized


class AcceptedAdminInvitationResponse(
    AdminTeamSchema
):
    admin_id: uuid.UUID
    role: AdminRole
    activated_at: datetime


# ============================================================
# ROLE MANAGEMENT
# ============================================================


class ChangeAdminRoleRequest(
    AdminTeamSchema
):
    role: AdminRole


class AdminRoleChangeResponse(
    AdminTeamSchema
):
    admin_id: uuid.UUID
    role: AdminRole
    security_version: int


# ============================================================
# ENABLE / DISABLE
# ============================================================


class AdminAccountStateResponse(
    AdminTeamSchema
):
    admin_id: uuid.UUID
    is_active: bool
    disabled_at: datetime | None
    security_version: int


# ============================================================
# SESSION REVOCATION
# ============================================================


class AdminSessionRevocationResponse(
    AdminTeamSchema
):
    admin_id: uuid.UUID
    security_version: int
    sessions_invalidated: bool = True