from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import VerificationStatus
from app.schemas.evidence import RequiredEvidence


class VerificationRequestCreate(BaseModel):
    assigned_discord_user_id: str = Field(
        min_length=17,
        max_length=20,
    )

    discord_username_snapshot: str | None = Field(
        default=None,
        max_length=100,
    )

    required_evidence: RequiredEvidence

    expires_at: datetime | None = None

    max_submissions: int = Field(
        default=1,
        ge=1,
        le=10,
    )

    @field_validator("assigned_discord_user_id")
    @classmethod
    def validate_discord_user_id(cls, value: str) -> str:
        value = value.strip()

        if not value.isdigit():
            raise ValueError(
                "Discord User ID must contain digits only."
            )

        discord_id = int(value)

        if discord_id <= 0:
            raise ValueError(
                "Discord User ID must be positive."
            )

        return value


class VerificationRequestCreated(BaseModel):
    request_id: UUID
    assigned_discord_user_id: str
    status: VerificationStatus
    expires_at: datetime
    verification_url: str

    model_config = ConfigDict(
        from_attributes=True,
    )


class VerificationRequestSafeStatus(BaseModel):
    status: VerificationStatus
    expires_at: datetime

class VerificationRequestAdminView(BaseModel):
    request_id: UUID

    assigned_discord_user_id: str
    discord_username_snapshot: str | None

    status: VerificationStatus

    required_evidence: RequiredEvidence

    expires_at: datetime

    submission_count: int
    max_submissions: int

    created_at: datetime
    updated_at: datetime

    queue_entered_at: datetime | None
    review_started_at: datetime | None
    decided_at: datetime | None