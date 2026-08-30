from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.constants import VerificationStatus


class ExtendExpirationRequest(BaseModel):
    expires_at: datetime


class AssignReviewerRequest(BaseModel):
    reviewer_admin_id: UUID


class RequestLifecycleResponse(BaseModel):
    request_id: UUID
    status: VerificationStatus
    expires_at: datetime
    assigned_reviewer_id: UUID | None


class RevokeRequest(BaseModel):
    reason: str | None = Field(
        default=None,
        max_length=1000,
    )