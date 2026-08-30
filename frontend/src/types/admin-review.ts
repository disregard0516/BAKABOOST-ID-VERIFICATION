import type {
  VerificationStatus,
} from "@/types/verification";

export interface EvidenceReviewItem {
  evidence_id: string;
  evidence_type: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface SubmissionReviewView {
  submission_id: string;

  legal_name: string | null;
  date_of_birth: string | null;
  age_result: string | null;

  issuing_country: string | null;
  document_type: string | null;

  submitted_at: string;

  evidence: EvidenceReviewItem[];
}

export interface ReviewDetailResponse {
  request_id: string;

  assigned_discord_user_id: string;
  discord_username_snapshot: string | null;

  status: VerificationStatus;

  queue_entered_at: string | null;
  review_started_at: string | null;

  assigned_reviewer_id: string | null;

  submissions: SubmissionReviewView[];
}

export interface EvidencePreviewResponse {
  evidence_id: string;
  signed_url: string;
  expires_in_seconds: number;
}

export interface DecisionPayload {
  reason_code: string | null;
  internal_note: string | null;
  user_message: string | null;
}

export interface DecisionResponse {
  request_id: string;
  status: VerificationStatus;
  decided_at: string | null;
}

export interface AdminNoteView {
  id: string;
  admin_id: string;
  note: string;
  created_at: string;
}

export interface AdminNotesResponse {
  items: AdminNoteView[];
}

export interface AuditEventView {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  timestamp: string;
  metadata: Record<
    string,
    unknown
  >;
}

export interface AuditHistoryResponse {
  items: AuditEventView[];
}