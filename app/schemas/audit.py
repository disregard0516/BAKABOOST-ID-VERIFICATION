from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditEventView(BaseModel):
    id: UUID
    actor_type: str
    actor_id: str | None
    action: str
    timestamp: datetime
    metadata: dict


class AuditHistoryResponse(BaseModel):
    items: list[AuditEventView]