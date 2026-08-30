import {
  apiFetch,
} from "@/lib/api";

import type {
  EvidenceType,
} from "@/types/evidence";

import type {
  MobileCaptureCompleteResponse,
  MobileCaptureEvidenceResponse,
  MobileCaptureExchangeResponse,
  MobileCaptureSessionResponse,
} from "@/types/mobile-capture";


export async function exchangeMobileHandoff(
  handoffToken: string,
): Promise<MobileCaptureExchangeResponse> {
  return apiFetch<MobileCaptureExchangeResponse>(
    "/mobile/exchange",
    {
      method: "POST",

      headers: {
        "X-Mobile-Handoff-Token":
          handoffToken,
      },
    },
  );
}


export async function getMobileCaptureSession(): Promise<MobileCaptureSessionResponse> {
  return apiFetch<MobileCaptureSessionResponse>(
    "/mobile/session",
  );
}


export async function uploadMobileEvidence(
  evidenceType: EvidenceType,
  file: File,
): Promise<MobileCaptureEvidenceResponse> {
  const formData =
    new FormData();

  formData.append(
    "upload",
    file,
  );

  return apiFetch<MobileCaptureEvidenceResponse>(
    `/mobile/evidence/${evidenceType}`,
    {
      method: "POST",
      body: formData,
    },
  );
}


export async function completeMobileHandoff(): Promise<MobileCaptureCompleteResponse> {
  return apiFetch<MobileCaptureCompleteResponse>(
    "/mobile/complete",
    {
      method: "POST",
    },
  );
}