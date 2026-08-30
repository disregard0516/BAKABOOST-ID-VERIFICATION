import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.utils.time import utc_now


class VerificationSubmission(Base):
    __tablename__ = "verification_submissions"

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

    legal_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    age_result: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    issuing_country: Mapped[str | None] = mapped_column(
        String(2),
        nullable=True,
    )

    document_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    evidence_object_refs: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    consent_confirmed: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
    )

    accuracy_confirmed: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
    )

    client_risk_metadata: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    __table_args__ = (
        CheckConstraint(
             "consent_confirmed = true",
            name="ck_submission_consent_required",
        ),
        CheckConstraint(
            "accuracy_confirmed = true",
            name="ck_submission_accuracy_required",
        ),
    )