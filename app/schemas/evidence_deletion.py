from pydantic import BaseModel


class EvidenceDeletionResponse(BaseModel):
    deleted_count: int