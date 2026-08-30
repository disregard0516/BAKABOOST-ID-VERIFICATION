from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.constants import VerificationStatus


class ClaimCaseResponse(BaseModel):
    request_id: UUID
    status: VerificationStatus
    assigned_reviewer_id: UUID
    review_started_at: datetime


class DecisionRequest(BaseModel):
    reason_code: str | None = Field(
        default=None,
        max_length=100,
    )

    internal_note: str | None = Field(
        default=None,
        max_length=5000,
    )

    user_message: str | None = Field(
        default=None,
        max_length=2000,
    )


class DecisionResponse(BaseModel):
    request_id: UUID
    status: VerificationStatus
    decided_at: datetime | None

class EvidenceReviewItem(BaseModel):
    evidence_id: UUID
    evidence_type: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class SubmissionReviewView(BaseModel):
    submission_id: UUID

    legal_name: str | None
    date_of_birth: str | None
    age_result: str | None

    issuing_country: str | None
    document_type: str | None

    submitted_at: datetime

    evidence: list[EvidenceReviewItem]


class ReviewDetailResponse(BaseModel):
    request_id: UUID

    assigned_discord_user_id: str
    discord_username_snapshot: str | None

    status: VerificationStatus

    queue_entered_at: datetime | None
    review_started_at: datetime | None

    assigned_reviewer_id: UUID | None

    submissions: list[SubmissionReviewView]

class EvidencePreviewResponse(BaseModel):
    evidence_id: UUID
    signed_url: str
    expires_in_seconds: int