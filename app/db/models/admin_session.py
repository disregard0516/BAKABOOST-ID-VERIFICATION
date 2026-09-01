import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.utils.time import utc_now


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ========================================================
    # ADMIN BINDING
    # ========================================================

    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "admins.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # SESSION SECRET
    # ========================================================

    #
    # NEVER store the raw session token.
    #
    # Browser receives:
    #
    #     random high-entropy token
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

    #
    # Separate server-bound CSRF secret hash.
    #
    # This lets us validate that CSRF material belongs to the
    # same authenticated admin session.
    #
    csrf_token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    # ========================================================
    # SECURITY VERSION BINDING
    # ========================================================

    #
    # Snapshot of Admin.security_version at session creation.
    #
    # If Admin.security_version changes later, this session is
    # invalid without needing to find/delete every row first.
    #
    security_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # ========================================================
    # AUTHENTICATION ASSURANCE
    # ========================================================

    #
    # When the primary authentication ceremony occurred.
    #
    authenticated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    #
    # Set only when trusted authentication evidence says MFA
    # was actually completed.
    #
    mfa_verified_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    #
    # Stronger assurance used later for Owner/high-risk policy.
    #
    # Do NOT set this merely because generic MFA succeeded.
    #
    phishing_resistant_verified_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    auth_method: Mapped[
        str | None
    ] = mapped_column(
        String(80),
        nullable=True,
    )

    # ========================================================
    # SESSION LIFETIME
    # ========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    #
    # Used for the 5-minute idle policy.
    #
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )

    #
    # Absolute session expiry.
    #
    # The service will never extend this timestamp just because
    # the session remains active.
    #
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    #
    # Allows periodic token rotation.
    #
    rotated_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ========================================================
    # REVOCATION
    # ========================================================

    revoked_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    revoke_reason: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )

    #
    # Allows explicit distinction between automatic expiry and
    # deliberate administrator/security revocation.
    #
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    # ========================================================
    # LIMITED SESSION CONTEXT
    # ========================================================

    #
    # These are defensive/risk metadata only.
    #
    # Never put access tokens, passwords, authentication
    # secrets or raw CSRF/session tokens here.
    #
    ip_address: Mapped[
        str | None
    ] = mapped_column(
        String(45),
        nullable=True,
    )

    user_agent: Mapped[
        str | None
    ] = mapped_column(
        String(512),
        nullable=True,
    )

    # ========================================================
    # DATABASE INDEXES
    # ========================================================

    __table_args__ = (
        Index(
            "ix_admin_sessions_admin_active",
            "admin_id",
            "is_revoked",
            "expires_at",
        ),
    )