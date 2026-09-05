import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import AdminRole
from app.db.base import Base
from app.utils.time import utc_now


class AdminInvitation(Base):
    __tablename__ = "admin_invitations"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ========================================================
    # INVITED IDENTITY
    # ========================================================

    #
    # Email is used only to identify who the invitation was
    # intended for during onboarding.
    #
    # Once accepted, authorization must rely on the immutable
    # externally authenticated subject stored on
    # Admin.auth_subject, never email.
    #
    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
        index=True,
    )

    #
    # Role that will be granted after successful invitation
    # acceptance.
    #
    # Service-layer authorization must ensure only an
    # appropriately privileged SUPER_ADMIN can grant privileged
    # administrator roles.
    #
    role: Mapped[AdminRole] = mapped_column(
        Enum(
            AdminRole,
            name="admin_role",
            values_callable=lambda enum_cls: [
                member.value for member in enum_cls
            ],
            create_type=False,
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # INVITATION SECRET
    # ========================================================

    #
    # NEVER store the raw invitation token.
    #
    # Browser/email receives:
    #
    #     high-entropy random invitation token
    #
    # Database stores:
    #
    #     cryptographic hash of that token
    #
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    # ========================================================
    # INVITER
    # ========================================================

    invited_by_admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "admins.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # INVITATION LIFETIME
    # ========================================================

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # ========================================================
    # ACCEPTANCE
    # ========================================================

    #
    #
    # Set exactly once after:
    #
    #   1. invitation token validates
    #   2. invitation is active and unexpired
    #   3. external authentication succeeds
    #   4. authenticated identity is allowed to accept it
    #   5. immutable external subject is bound to an Admin record
    
    
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    #
    # Admin account created/activated by successful acceptance.
    #
    # SET NULL preserves invitation history if an administrator
    # record is ever removed.
    #
    accepted_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "admins.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ========================================================
    # REVOCATION
    # ========================================================

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    revoked_by_admin_id: Mapped[
        uuid.UUID | None
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "admins.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    revoke_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # ========================================================
    # DATABASE INDEXES
    # ========================================================

    __table_args__ = (
        Index(
            "ix_admin_invitations_email_state",
            "email",
            "accepted_at",
            "revoked_at",
            "expires_at",
        ),
        Index(
            "ix_admin_invitations_inviter_created",
            "invited_by_admin_id",
            "created_at",
        ),
    )