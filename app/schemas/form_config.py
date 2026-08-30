from pydantic import BaseModel

from app.schemas.evidence import RequiredEvidence


class VerificationFormConfigResponse(BaseModel):
    required_evidence: RequiredEvidence
    retention_days: int | None