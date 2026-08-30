from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.constants import AccessGrantStatus


class AccessGrantResponse(BaseModel):
    grant_id: UUID

    discord_user_id: str

    status: AccessGrantStatus

    issued_at: datetime | None
    expires_at: datetime | None


class ApplicantAccessResponse(BaseModel):
    status: AccessGrantStatus

    access_available: bool

    discord_invite_url: str | None = None

    expires_at: datetime | None = None