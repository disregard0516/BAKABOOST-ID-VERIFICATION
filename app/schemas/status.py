from datetime import datetime

from pydantic import BaseModel

from app.core.constants import VerificationStatus


class VerificationStatusResponse(BaseModel):
    status: VerificationStatus
    queue_entered_at: datetime | None
    review_started_at: datetime | None
    decided_at: datetime | None
    expires_at: datetime
    user_message: str | None = None