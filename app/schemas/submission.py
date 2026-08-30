from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class VerificationSubmissionCreate(BaseModel):
    legal_name: str | None = Field(
        default=None,
        max_length=255,
    )

    date_of_birth: date | None = None

    age_result: str | None = Field(
        default=None,
        max_length=50,
    )

    issuing_country: str | None = Field(
        default=None,
        min_length=2,
        max_length=2,
    )

    document_type: str | None = Field(
        default=None,
        max_length=50,
    )

    evidence_ids: list[UUID]

    consent_confirmed: bool
    accuracy_confirmed: bool


class VerificationSubmissionCreated(BaseModel):
    submission_id: UUID
    status: str