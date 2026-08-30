import { apiFetch } from "@/lib/api";
import type {
  PublicVerificationRequest,
} from "@/types/verification";

export interface EntryContextResponse {
  entry_context: string;
}

export async function getPublicVerificationRequest(
  token: string,
): Promise<PublicVerificationRequest> {
  return apiFetch<PublicVerificationRequest>(
    `/v/${encodeURIComponent(token)}`,
  );
}

export async function createEntryContext(
  token: string,
): Promise<EntryContextResponse> {
  return apiFetch<EntryContextResponse>(
    `/v/${encodeURIComponent(token)}/entry-context`,
    {
      method: "POST",
    },
  );
}