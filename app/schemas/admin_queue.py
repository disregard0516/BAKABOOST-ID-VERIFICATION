from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.constants import VerificationStatus


class AdminQueueItem(BaseModel):
    request_id: UUID

    assigned_discord_user_id: str
    discord_username_snapshot: str | None

    status: VerificationStatus

    queue_entered_at: datetime | None
    review_started_at: datetime | None

    created_at: datetime
    expires_at: datetime

    created_by_admin_id: UUID | None
    created_by_admin_name: str | None

    assigned_reviewer_id: UUID | None
    assigned_reviewer_name: str | None

    last_activity_at: datetime


class AdminQueueResponse(BaseModel):
    items: list[AdminQueueItem]
    total: int