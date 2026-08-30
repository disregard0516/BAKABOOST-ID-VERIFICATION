import { apiFetch } from "@/lib/api";

import type {
  EvidenceType,
  EvidenceUploadResponse,
} from "@/types/evidence";

export interface VerificationSubmissionPayload {
  legal_name: string | null;
  date_of_birth: string | null;
  age_result: string | null;

  issuing_country: string | null;
  document_type: string | null;

  evidence_ids: string[];

  consent_confirmed: boolean;
  accuracy_confirmed: boolean;
}

export interface VerificationSubmissionResponse {
  submission_id: string;
  status: "queued";
}

export async function uploadEvidence(
  evidenceType: EvidenceType,
  file: File,
): Promise<EvidenceUploadResponse> {
  const formData = new FormData();

  formData.append(
    "upload",
    file,
  );

  return apiFetch<EvidenceUploadResponse>(
    `/verification/evidence/${evidenceType}`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function submitVerification(
  payload: VerificationSubmissionPayload,
): Promise<VerificationSubmissionResponse> {
  return apiFetch<VerificationSubmissionResponse>(
    "/verification/submit",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}   