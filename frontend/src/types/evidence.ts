export type EvidenceType =
  | "document_front"
  | "document_back"
  | "selfie"
  | "liveness";

export interface EvidenceUploadResponse {
  evidence_id: string;
  evidence_type: EvidenceType;
  content_type: string;
  size_bytes: number;
}

export interface UploadedEvidence {
  evidenceId: string;
  evidenceType: EvidenceType;
  filename: string;
  contentType: string;
  sizeBytes: number;
}   