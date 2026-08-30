from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class MobileCaptureCreateResponse(BaseModel):
    id: UUID
    handoff_token: str
    expires_at: datetime
    status: str


class MobileCaptureUploadedEvidence(BaseModel):
    evidence_id: UUID
    evidence_type: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class MobileCaptureStatusResponse(BaseModel):
    id: UUID
    status: str
    connected: bool
    expires_at: datetime
    connected_at: datetime | None
    completed_at: datetime | None

    uploads: list[
        MobileCaptureUploadedEvidence
    ] = Field(
        default_factory=list
    )


class MobileCaptureRequirements(BaseModel):
    document_front: bool = False
    document_back: bool = False
    selfie: bool = False
    liveness: bool = False

    extra: dict[str, Any] = Field(
        default_factory=dict
    )


class MobileCaptureConnectResponse(BaseModel):
    status: str
    expires_at: datetime
    requirements: MobileCaptureRequirements


class MobileCaptureEvidenceResponse(BaseModel):
    evidence_id: UUID
    evidence_type: str
    content_type: str
    size_bytes: int


class MobileCaptureCompleteResponse(BaseModel):
    status: str
    completed_at: datetime


class MobileCaptureRevokeResponse(BaseModel):
    status: str


class MobileCaptureExchangeResponse(BaseModel):
    status: str
    expires_at: datetime


class MobileCaptureSessionResponse(BaseModel):
    id: UUID
    status: str
    expires_at: datetime
    requirements: MobileCaptureRequirements

    uploads: list[
        MobileCaptureUploadedEvidence
    ] = Field(
        default_factory=list
    )