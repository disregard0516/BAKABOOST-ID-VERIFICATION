import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import EvidenceObjectStatus
from app.db.base import Base
from app.utils.time import utc_now


class EvidenceObject(Base):
    __tablename__ = "evidence_objects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    verification_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "verification_requests.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    verification_submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "verification_submissions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    mobile_capture_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "mobile_capture_sessions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    object_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        unique=True,
    )

    evidence_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    checksum_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    status: Mapped[EvidenceObjectStatus] = mapped_column(
        Enum(
            EvidenceObjectStatus,
            name="evidence_object_status",
            values_callable=lambda enum_cls: [
                member.value for member in enum_cls
            ],
        ),
        nullable=False,
        default=EvidenceObjectStatus.TEMPORARY,
        index=True,
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    attached_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    deletion_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    deletion_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    deleted_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "admins.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "size_bytes > 0",
            name="ck_evidence_size_positive",
        ),
    )