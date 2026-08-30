from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateAdminNoteRequest(BaseModel):
    note: str = Field(
        min_length=1,
        max_length=5000,
    )


class AdminNoteView(BaseModel):
    id: UUID
    admin_id: UUID
    note: str
    created_at: datetime


class AdminNotesResponse(BaseModel):
    items: list[AdminNoteView]