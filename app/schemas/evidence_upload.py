from uuid import UUID

from pydantic import BaseModel


class EvidenceUploadResponse(BaseModel):
    evidence_id: UUID
    evidence_type: str
    content_type: str
    size_bytes: int