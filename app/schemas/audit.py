from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditEventView(BaseModel):
    """
    Existing request-scoped audit representation.

    Kept stable for the verification-request audit endpoint.
    """

    id: UUID
    actor_type: str
    actor_id: str | None
    action: str
    timestamp: datetime
    metadata: dict


class AuditHistoryResponse(BaseModel):
    items: list[AuditEventView]


class AdminAuditEventView(BaseModel):
    """
    Global administrator Audit Activity representation.

    This intentionally exposes only already-redacted audit
    metadata. Authentication tokens, cookies and secret
    credentials are never part of this schema.
    """

    id: UUID

    actor_type: str
    actor_id: str | None

    action: str
    outcome: str

    verification_request_id: UUID | None
    request_id: str | None

    timestamp: datetime
    metadata: dict


class AdminAuditActivityResponse(BaseModel):
    items: list[AdminAuditEventView]

    page: int
    page_size: int
    total: int
    total_pages: int
