import type {
  VerificationStatus,
} from "@/types/verification";

export interface CreateVerificationRequestPayload {
  assigned_discord_user_id: string;

  discord_username_snapshot:
    | string
    | null;

  required_evidence: {
    legal_name: boolean;
    date_of_birth: boolean;
    age_confirmation: boolean;

    issuing_country: boolean;
    document_type: boolean;

    document_front: boolean;
    document_back: boolean;

    selfie: boolean;
    liveness: boolean;
  };

  expires_at: string | null;

  max_submissions: number;
}

export interface VerificationRequestCreatedResponse {
  request_id: string;

  assigned_discord_user_id: string;

  status: VerificationStatus;

  expires_at: string;

  verification_url: string;
}

export interface RequestLifecycleResponse {
  request_id: string;

  status: VerificationStatus;

  expires_at: string;

  assigned_reviewer_id:
    | string
    | null;
}

export interface AssignReviewerPayload {
  reviewer_admin_id: string;
}