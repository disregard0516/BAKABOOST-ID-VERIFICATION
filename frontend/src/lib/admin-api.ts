import type {
  AdminQueueResponse,
} from "@/types/admin";

import type {
  AccessGrantResponse,
} from "@/types/admin-access";

import type {
  AssignReviewerPayload,
  CreateVerificationRequestPayload,
  RequestLifecycleResponse,
  VerificationRequestCreatedResponse,
} from "@/types/admin-actions";

import type {
  AdminNotesResponse,
  AuditHistoryResponse,
  DecisionPayload,
  DecisionResponse,
  EvidencePreviewResponse,
  ReviewDetailResponse,
} from "@/types/admin-review";

import type {
  VerificationStatus,
} from "@/types/verification";

import type {
  ReviewerListResponse,
} from "@/types/reviewer";

const ADMIN_TOKEN_STORAGE_KEY =
  "admin_access_token";

export const ADMIN_SESSION_EXPIRED_EVENT =
  "admin-session-expired";


export class AdminApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "AdminApiError";

    this.status =
      status;
  }
}


export function getAdminToken(): string | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return window.sessionStorage.getItem(
    ADMIN_TOKEN_STORAGE_KEY,
  );
}


export function setAdminToken(
  token: string,
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.sessionStorage.setItem(
    ADMIN_TOKEN_STORAGE_KEY,
    token,
  );
}


export function clearAdminToken(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.sessionStorage.removeItem(
    ADMIN_TOKEN_STORAGE_KEY,
  );
}


function signalAdminSessionExpired(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  clearAdminToken();

  window.dispatchEvent(
    new CustomEvent(
      ADMIN_SESSION_EXPIRED_EVENT,
    ),
  );
}


async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    getAdminToken();

  const headers =
    new Headers(
      options.headers,
    );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const baseUrl =
    process.env
      .NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000/api";

  const response =
    await fetch(
      `${baseUrl}${path}`,
      {
        ...options,
        headers,
        credentials:
          "include",
        cache:
          "no-store",
      },
    );

  if (!response.ok) {
    let detail =
      "Admin request failed.";

    try {
      const payload =
        (await response.json()) as {
          detail?: string;
        };

      if (
        typeof payload.detail ===
          "string" &&
        payload.detail.trim()
      ) {
        detail =
          payload.detail;
      }
    } catch {
      // Keep generic error.
    }

    if (
      response.status === 401
    ) {
      signalAdminSessionExpired();
    }

    throw new AdminApiError(
      detail,
      response.status,
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}


interface QueueQuery {
  search?: string;

  statuses?:
    VerificationStatus[];

  limit?: number;
  offset?: number;
}


export async function getAdminQueue({
  search,
  statuses,
  limit = 50,
  offset = 0,
}: QueueQuery): Promise<AdminQueueResponse> {
  const query =
    new URLSearchParams();

  if (search?.trim()) {
    query.set(
      "search",
      search.trim(),
    );
  }

  statuses?.forEach(
    (status) => {
      query.append(
        "status",
        status,
      );
    },
  );

  query.set(
    "limit",
    String(limit),
  );

  query.set(
    "offset",
    String(offset),
  );

  return adminFetch<AdminQueueResponse>(
    `/admin/verification-queue?${query.toString()}`,
  );
}


export async function claimAdminCase(
  requestId: string,
): Promise<void> {
  await adminFetch(
    `/admin/verification-requests/${requestId}/claim`,
    {
      method: "POST",
    },
  );
}


export async function revokeVerificationRequest(
  requestId: string,
  reason?: string,
): Promise<void> {
  await adminFetch(
    `/admin/verification-requests/${requestId}/revoke`,
    {
      method: "POST",

      body:
        JSON.stringify({
          reason:
            reason || null,
        }),
    },
  );
}


export async function createVerificationRequest(
  payload:
    CreateVerificationRequestPayload,
): Promise<VerificationRequestCreatedResponse> {
  return adminFetch<VerificationRequestCreatedResponse>(
    "/admin/verification-requests",
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function extendVerificationExpiration(
  requestId: string,
  expiresAt: string,
): Promise<RequestLifecycleResponse> {
  return adminFetch<RequestLifecycleResponse>(
    `/admin/verification-requests/${requestId}/extend-expiration`,
    {
      method: "POST",

      body:
        JSON.stringify({
          expires_at:
            expiresAt,
        }),
    },
  );
}


export async function assignVerificationReviewer(
  requestId: string,
  payload:
    AssignReviewerPayload,
): Promise<RequestLifecycleResponse> {
  return adminFetch<RequestLifecycleResponse>(
    `/admin/verification-requests/${requestId}/assign-reviewer`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function getReviewDetail(
  requestId: string,
): Promise<ReviewDetailResponse> {
  return adminFetch<ReviewDetailResponse>(
    `/admin/verification-requests/${requestId}`,
  );
}


export async function getEvidencePreview(
  evidenceId: string,
): Promise<EvidencePreviewResponse> {
  return adminFetch<EvidencePreviewResponse>(
    `/admin/verification-requests/evidence/${evidenceId}/preview`,
    {
      method: "POST",
    },
  );
}


export async function getAdminNotes(
  requestId: string,
): Promise<AdminNotesResponse> {
  return adminFetch<AdminNotesResponse>(
    `/admin/verification-requests/${requestId}/notes`,
  );
}


export async function createAdminNote(
  requestId: string,
  note: string,
): Promise<void> {
  await adminFetch(
    `/admin/verification-requests/${requestId}/notes`,
    {
      method: "POST",

      body:
        JSON.stringify({
          note,
        }),
    },
  );
}


export async function getAuditHistory(
  requestId: string,
): Promise<AuditHistoryResponse> {
  return adminFetch<AuditHistoryResponse>(
    `/admin/verification-requests/${requestId}/audit`,
  );
}


export async function approveCase(
  requestId: string,
  payload:
    DecisionPayload,
): Promise<DecisionResponse> {
  return adminFetch<DecisionResponse>(
    `/admin/verification-requests/${requestId}/approve`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function rejectCase(
  requestId: string,
  payload:
    DecisionPayload,
): Promise<DecisionResponse> {
  return adminFetch<DecisionResponse>(
    `/admin/verification-requests/${requestId}/reject`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function requestMoreInfo(
  requestId: string,
  payload:
    DecisionPayload,
): Promise<DecisionResponse> {
  return adminFetch<DecisionResponse>(
    `/admin/verification-requests/${requestId}/more-info`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function grantDiscordAccess(
  requestId: string,
): Promise<AccessGrantResponse> {
  return adminFetch<AccessGrantResponse>(
    `/admin/verification-requests/${requestId}/grant-access`,
    {
      method: "POST",
    },
  );
}


export async function revokeDiscordAccess(
  requestId: string,
): Promise<AccessGrantResponse> {
  return adminFetch<AccessGrantResponse>(
    `/admin/verification-requests/${requestId}/revoke-access`,
    {
      method: "POST",
    },
  );
}


export async function deleteVerificationEvidence(
  requestId: string,
): Promise<{
  deleted_count: number;
}> {
  return adminFetch<{
    deleted_count: number;
  }>(
    `/admin/verification-requests/${requestId}/evidence`,
    {
      method: "DELETE",
    },
  );
}

export async function getReviewers(): Promise<ReviewerListResponse> {
  return adminFetch<ReviewerListResponse>(
    "/admin/reviewers",
  );
}