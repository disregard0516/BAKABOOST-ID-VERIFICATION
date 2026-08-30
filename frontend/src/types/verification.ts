export type VerificationStatus =
  | "pending"
  | "queued"
  | "in_review"
  | "more_info"
  | "approved"
  | "rejected"
  | "expired"
  | "revoked";

export type VerificationStep =
  | "account"
  | "identity"
  | "queue"
  | "review"
  | "access";

export interface PublicVerificationRequest {
  status: VerificationStatus;
  expires_at: string;
}

export interface DiscordAccountConfirmation {
  discord_user_id: string;
  username: string;
  avatar_url: string | null;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;

  queue_entered_at: string | null;
  review_started_at: string | null;
  decided_at: string | null;

  expires_at: string;

  user_message: string | null;
}

export interface VerificationAccessResponse {
  status:
    | "not_issued"
    | "issued"
    | "consumed"
    | "expired"
    | "revoked";

  access_available: boolean;

  discord_invite_url: string | null;
  expires_at: string | null;
}

export interface RequiredEvidence {
  legal_name: boolean;
  date_of_birth: boolean;
  age_confirmation: boolean;

  issuing_country: boolean;
  document_type: boolean;

  document_front: boolean;
  document_back: boolean;

  selfie: boolean;
  liveness: boolean;
}