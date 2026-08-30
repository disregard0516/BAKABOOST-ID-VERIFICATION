import {
  apiFetch,
} from "@/lib/api";

import type {
  MobileCaptureCreateResponse,
  MobileCaptureStatusResponse,
} from "@/types/mobile-capture";


export async function createMobileCapture(): Promise<MobileCaptureCreateResponse> {
  return apiFetch<MobileCaptureCreateResponse>(
    "/verification/mobile-capture",
    {
      method: "POST",
    },
  );
}


export async function getMobileCaptureStatus(
  mobileCaptureId: string,
): Promise<MobileCaptureStatusResponse> {
  return apiFetch<MobileCaptureStatusResponse>(
    `/verification/mobile-capture/${encodeURIComponent(
      mobileCaptureId,
    )}`,
  );
}


export async function revokeMobileCapture(
  mobileCaptureId: string,
): Promise<void> {
  await apiFetch(
    `/verification/mobile-capture/${encodeURIComponent(
      mobileCaptureId,
    )}`,
    {
      method: "DELETE",
    },
  );
}