import type {
  EvidenceType,
} from "@/types/evidence";


export interface MobileCaptureRequirements {
  document_front:
    boolean;

  document_back:
    boolean;

  selfie:
    boolean;

  liveness:
    boolean;

  extra: Record<
    string,
    unknown
  >;
}


export interface MobileCaptureCreateResponse {
  id: string;

  handoff_token: string;

  expires_at: string;

  status: string;
}


export interface MobileCaptureUploadedEvidence {
  evidence_id: string;

  evidence_type:
    EvidenceType;

  content_type:
    string;

  size_bytes:
    number;

  uploaded_at:
    string;
}


export interface MobileCaptureStatusResponse {
  id: string;

  status: string;

  connected: boolean;

  expires_at: string;

  connected_at:
    | string
    | null;

  completed_at:
    | string
    | null;

  uploads:
    MobileCaptureUploadedEvidence[];
}


export interface MobileCaptureConnectResponse {
  status: string;

  expires_at: string;

  requirements:
    MobileCaptureRequirements;
}


export interface MobileCaptureEvidenceResponse {
  evidence_id: string;

  evidence_type:
    EvidenceType;

  content_type:
    string;

  size_bytes:
    number;
}


export interface MobileCaptureCompleteResponse {
  status: string;

  completed_at:
    string;
}


export interface MobileCaptureExchangeResponse {
  status: string;

  expires_at: string;
}


export interface MobileCaptureSessionResponse {
  id: string;

  status: string;

  expires_at: string;

  requirements:
    MobileCaptureRequirements;

  uploads:
    MobileCaptureUploadedEvidence[];
}