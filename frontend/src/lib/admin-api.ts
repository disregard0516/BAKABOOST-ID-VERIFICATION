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


/* ============================================================
   CONFIGURATION
============================================================ */

const DEFAULT_API_BASE_URL =
  "http://localhost:8000/api";

const ADMIN_SESSION_PATH =
  "/admin/auth/session";

const ADMIN_CSRF_HEADER =
  "X-Admin-CSRF-Token";


export const ADMIN_SESSION_EXPIRED_EVENT =
  "admin-session-expired";


/* ============================================================
   ERRORS
============================================================ */

export class AdminApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name = "AdminApiError";
    this.status = status;

    Object.setPrototypeOf(
      this,
      AdminApiError.prototype,
    );
  }
}


/* ============================================================
   ADMIN SESSION TYPES
============================================================ */

interface AdminSessionResponse {
  authenticated?: unknown;
  admin?: unknown;
  expires_at?: unknown;
  csrf_token?: unknown;
}


/* ============================================================
   GENERIC API ERROR TYPES
============================================================ */

interface ApiErrorResponse {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
}


/* ============================================================
   IN-MEMORY SESSION STATE
============================================================ */

/*
 * This is NOT the administrator session secret.
 *
 * The real session credential remains in an HttpOnly cookie
 * controlled by FastAPI and cannot be read by this code.
 *
 * Only the CSRF credential is retained in JavaScript memory.
 */
let adminCsrfToken: string | null = null;

/*
 * Deduplicate simultaneous session initialization requests.
 */
let adminSessionInitialization:
  Promise<void> | null = null;


/* ============================================================
   SESSION EVENTS
============================================================ */

function signalAdminSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ADMIN_SESSION_EXPIRED_EVENT,
    ),
  );
}


function clearAdminSessionState(): void {
  adminCsrfToken = null;
  adminSessionInitialization = null;
}


/* ============================================================
   URL HELPERS
============================================================ */

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  const baseUrl =
    configured || DEFAULT_API_BASE_URL;

  return baseUrl.replace(/\/+$/, "");
}


function normalizeApiPath(
  path: string,
): string {
  if (!path) {
    return "/";
  }

  return path.startsWith("/")
    ? path
    : `/${path}`;
}


function getApiUrl(
  path: string,
): string {
  return (
    `${getApiBaseUrl()}${normalizeApiPath(path)}`
  );
}


/* ============================================================
   RESPONSE HELPERS
============================================================ */

function extractCsrfToken(
  payload: AdminSessionResponse,
): string | null {
  if (
    typeof payload.csrf_token === "string" &&
    payload.csrf_token.trim().length > 0
  ) {
    return payload.csrf_token.trim();
  }

  return null;
}


function extractErrorMessage(
  payload: ApiErrorResponse,
): string | null {
  const possibleMessages = [
    payload.detail,
    payload.message,
    payload.error,
  ];

  for (const value of possibleMessages) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return null;
}


async function getResponseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload =
      (await response.json()) as
        ApiErrorResponse;

    return (
      extractErrorMessage(payload) ??
      fallback
    );
  } catch {
    return fallback;
  }
}

/* ============================================================
   EXISTING BAKABOOST SESSION
============================================================ */

async function restoreAdminSession():
  Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(
      getApiUrl(
        ADMIN_SESSION_PATH,
      ),
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",

        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch {
    throw new AdminApiError(
      "Unable to reach the BAKABOOST administrator API.",
      0,
    );
  }

 /*
  * 401 is normal when no valid BAKABOOST administrator
  * session exists yet.
  *
  * If the request is running behind Cloudflare Access,
  * initializeAdminSession() will next attempt to exchange the
  * Cloudflare-authenticated identity for a local session.
 */

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    const message =
      await getResponseErrorMessage(
        response,
        "Unable to restore administrator session.",
      );

    throw new AdminApiError(
      message,
      response.status,
    );
  }

  let payload: AdminSessionResponse;

  try {
    payload =
      (await response.json()) as
        AdminSessionResponse;
  } catch {
    throw new AdminApiError(
      "Administrator session service returned an invalid response.",
      500,
    );
  }

  const csrfToken =
    extractCsrfToken(payload);

  if (!csrfToken) {
    throw new AdminApiError(
      "Administrator request verification could not be initialized.",
      500,
    );
  }

  adminCsrfToken = csrfToken;

  return true;
}


/* ============================================================
   CREATE BAKABOOST SESSION
============================================================ */

async function establishAdminSession():
  Promise<void> {
  /*
   * Production:
   *
   * The browser posts directly to the BAKABOOST API. The
   * request passes through Cloudflare Access, which supplies
   * Cf-Access-Jwt-Assertion at the protected origin boundary.
   *
   * Local development:
   *
   * The browser calls the same-origin Next.js development
   * bridge. That server-only route creates the short-lived
   * development assertion and exchanges it with FastAPI.
   *
   * Browser JavaScript never receives a Cloudflare Access JWT,
   * development bearer token, or development signing secret.
   */
  const development =
    process.env.NODE_ENV === "development";

  const sessionUrl = development
    ? "/api/admin/dev-session"
    : getApiUrl(
        ADMIN_SESSION_PATH,
      );

  let response: Response;

  try {
    response = await fetch(
      sessionUrl,
      {
        method: "POST",

        credentials: "include",
        cache: "no-store",

        headers: {
          Accept: "application/json",
        },
      },
    );
  } catch {
    throw new AdminApiError(
      "Unable to establish the BAKABOOST administrator session.",
      0,
    );
  }

  if (!response.ok) {
    const message =
      await getResponseErrorMessage(
        response,
        "Unable to establish administrator session.",
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      clearAdminSessionState();
      signalAdminSessionExpired();
    }

    throw new AdminApiError(
      message,
      response.status,
    );
  }

  let payload: AdminSessionResponse;

  try {
    payload =
      (await response.json()) as
        AdminSessionResponse;
  } catch {
    throw new AdminApiError(
      "Administrator session service returned an invalid response.",
      500,
    );
  }

  const csrfToken =
    extractCsrfToken(payload);

  if (!csrfToken) {
    throw new AdminApiError(
      "Administrator request verification could not be initialized.",
      500,
    );
  }

  adminCsrfToken = csrfToken;
}

/* ============================================================
   SESSION INITIALIZATION
============================================================ */

async function initializeAdminSession():
  Promise<void> {
  /*
   * First try the existing HttpOnly BAKABOOST session.
   *
   * This allows page reloads without creating unnecessary
   * duplicate administrator sessions.
   */
  const restored =
    await restoreAdminSession();

  if (restored) {
    return;
  }

  /*
   * No BAKABOOST session exists.
   *
   * Establish a new server-managed session from the external
   * identity already authenticated at the origin boundary.
   */
  await establishAdminSession();
}


export async function ensureAdminSession():
  Promise<void> {
  if (adminCsrfToken) {
    return;
  }

  if (!adminSessionInitialization) {
    adminSessionInitialization =
      initializeAdminSession()
        .catch((error: unknown) => {
          adminSessionInitialization = null;

          throw error;
        });
  }

  await adminSessionInitialization;
}


/* ============================================================
   REQUEST METHOD HELPERS
============================================================ */

function normalizeMethod(
  method: string | undefined,
): string {
  return (
    method?.trim().toUpperCase() ||
    "GET"
  );
}


function methodRequiresCsrf(
  method: string,
): boolean {
  return ![
    "GET",
    "HEAD",
    "OPTIONS",
  ].includes(method);
}


/* ============================================================
   ADMIN FETCH
============================================================ */

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  /*
   * Establish or restore the server-managed administrator
   * session before any protected request.
   */
  await ensureAdminSession();

  const headers =
    new Headers(options.headers);

  headers.set(
    "Accept",
    "application/json",
  );

  const method =
    normalizeMethod(
      options.method,
    );

  /*
   * Normal administrator API calls never carry an external
   * identity-provider bearer token.
   *
   * Authentication comes from the FastAPI HttpOnly session
   * cookie.
   */
  headers.delete(
    "Authorization",
  );

  /*
   * State-changing requests require CSRF verification bound
   * to that same server-side administrator session.
   */
  if (
    methodRequiresCsrf(method)
  ) {
    if (!adminCsrfToken) {
      throw new AdminApiError(
        "Administrator request verification is unavailable.",
        403,
      );
    }

    headers.set(
      ADMIN_CSRF_HEADER,
      adminCsrfToken,
    );
  }

  /*
   * Do NOT manually set Content-Type for FormData.
   * The browser generates the multipart boundary.
   */
  if (
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  let response: Response;

  try {
    response = await fetch(
      getApiUrl(path),
      {
        ...options,
        method,
        headers,

        /*
         * Required for the HttpOnly server-managed admin
         * session and API-side CSRF cookie.
         */
        credentials: "include",

        cache: "no-store",
      },
    );
  } catch {
    throw new AdminApiError(
      "Unable to reach the BAKABOOST administrator API.",
      0,
    );
  }

  if (!response.ok) {
    let message =
      await getResponseErrorMessage(
        response,
        "Administrator request failed.",
      );

    if (response.status === 401) {
      /*
       * Do NOT silently attach external identity-provider credentials to a new
       * session here.
       *
       * An idle/expired/revoked administrator session should
       * remain expired and force the administrator through the
       * authentication boundary again.
       */
      clearAdminSessionState();
      signalAdminSessionExpired();

      if (
        message ===
        "Administrator request failed."
      ) {
        message =
          "Administrator session has expired. Please sign in again.";
      }
    }

    if (
      response.status === 403 &&
      message ===
        "Administrator request failed."
    ) {
      message =
        "You do not have permission to perform this administrator action.";
    }

    throw new AdminApiError(
      message,
      response.status,
    );
  }

  if (
    response.status === 204 ||
    response.headers.get(
      "content-length",
    ) === "0"
  ) {
    return undefined as T;
  }

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes("application/json")
  ) {
    throw new AdminApiError(
      "Administrator API returned an unexpected response.",
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new AdminApiError(
      "Administrator API returned invalid JSON.",
      response.status,
    );
  }
}


/* ============================================================
   ADMIN LOGOUT
============================================================ */

export async function logoutAdminSession():
  Promise<void> {
  await ensureAdminSession();

  if (!adminCsrfToken) {
    throw new AdminApiError(
      "Administrator request verification is unavailable.",
      403,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      getApiUrl(
        ADMIN_SESSION_PATH,
      ),
      {
        method: "DELETE",

        credentials: "include",
        cache: "no-store",

        headers: {
          Accept: "application/json",

          [ADMIN_CSRF_HEADER]:
            adminCsrfToken,
        },
      },
    );
  } catch {
    throw new AdminApiError(
      "Unable to reach the BAKABOOST administrator API.",
      0,
    );
  }

  if (!response.ok) {
    const message =
      await getResponseErrorMessage(
        response,
        "Unable to end administrator session.",
      );

    throw new AdminApiError(
      message,
      response.status,
    );
  }

  clearAdminSessionState();
}


/* ============================================================
   QUEUE
============================================================ */

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
    (verificationStatus) => {
      query.append(
        "status",
        verificationStatus,
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


/* ============================================================
   CLAIM CASE
============================================================ */

export async function claimAdminCase(
  requestId: string,
): Promise<void> {
  await adminFetch<void>(
    `/admin/verification-requests/${requestId}/claim`,
    {
      method: "POST",
    },
  );
}


/* ============================================================
   REVOKE REQUEST
============================================================ */

export async function revokeVerificationRequest(
  requestId: string,
  reason?: string,
): Promise<void> {
  await adminFetch<void>(
    `/admin/verification-requests/${requestId}/revoke`,
    {
      method: "POST",

      body: JSON.stringify({
        reason:
          reason?.trim() || null,
      }),
    },
  );
}


/* ============================================================
   CREATE REQUEST
============================================================ */

export async function createVerificationRequest(
  payload:
    CreateVerificationRequestPayload,
): Promise<VerificationRequestCreatedResponse> {
  return adminFetch<VerificationRequestCreatedResponse>(
    "/admin/verification-requests",
    {
      method: "POST",

      body:
        JSON.stringify(payload),
    },
  );
}


/* ============================================================
   EXTEND EXPIRATION
============================================================ */

export async function extendVerificationExpiration(
  requestId: string,
  expiresAt: string,
): Promise<RequestLifecycleResponse> {
  return adminFetch<RequestLifecycleResponse>(
    `/admin/verification-requests/${requestId}/extend-expiration`,
    {
      method: "POST",

      body: JSON.stringify({
        expires_at: expiresAt,
      }),
    },
  );
}


/* ============================================================
   ASSIGN REVIEWER
============================================================ */

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
        JSON.stringify(payload),
    },
  );
}


/* ============================================================
   REVIEW DETAIL
============================================================ */

export async function getReviewDetail(
  requestId: string,
): Promise<ReviewDetailResponse> {
  return adminFetch<ReviewDetailResponse>(
    `/admin/verification-requests/${requestId}`,
  );
}


/* ============================================================
   EVIDENCE PREVIEW
============================================================ */

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


/* ============================================================
   ADMIN NOTES
============================================================ */

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
  const normalizedNote =
    note.trim();

  if (!normalizedNote) {
    throw new AdminApiError(
      "Administrator note cannot be empty.",
      400,
    );
  }

  await adminFetch<void>(
    `/admin/verification-requests/${requestId}/notes`,
    {
      method: "POST",

      body: JSON.stringify({
        note: normalizedNote,
      }),
    },
  );
}


/* ============================================================
   AUDIT HISTORY
============================================================ */

export async function getAuditHistory(
  requestId: string,
): Promise<AuditHistoryResponse> {
  return adminFetch<AuditHistoryResponse>(
    `/admin/verification-requests/${requestId}/audit`,
  );
}


/* ============================================================
   APPROVE
============================================================ */

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
        JSON.stringify(payload),
    },
  );
}


/* ============================================================
   REJECT
============================================================ */

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
        JSON.stringify(payload),
    },
  );
}


/* ============================================================
   REQUEST MORE INFORMATION
============================================================ */

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
        JSON.stringify(payload),
    },
  );
}


/* ============================================================
   DISCORD ACCESS
============================================================ */

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


/* ============================================================
   EVIDENCE DELETION
============================================================ */

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


/* ============================================================
   REVIEWERS
============================================================ */

export async function getReviewers():
  Promise<ReviewerListResponse> {
  return adminFetch<ReviewerListResponse>(
    "/admin/reviewers",
  );
}
