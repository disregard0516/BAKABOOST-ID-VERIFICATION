import {
  appConfig,
} from "@/lib/config";


export const VERIFICATION_SESSION_EXPIRED_EVENT =
  "verification-session-expired";


export class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "ApiError";

    this.status =
      status;
  }
}


function readCookie(
  name: string,
): string | null {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const prefix =
    `${name}=`;

  const item =
    document.cookie
      .split("; ")
      .find(
        (cookie) =>
          cookie.startsWith(
            prefix,
          ),
      );

  if (!item) {
    return null;
  }

  return decodeURIComponent(
    item.substring(
      prefix.length,
    ),
  );
}


function signalVerificationSessionExpired(): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      VERIFICATION_SESSION_EXPIRED_EVENT,
    ),
  );
}


function shouldTreatAsVerificationSessionExpiry(
  path: string,
  status: number,
): boolean {
  if (status !== 401) {
    return false;
  }

  if (
    !path.startsWith(
      "/verification/",
    )
  ) {
    return false;
  }

  /*
   * Do not redirect recursively if this
   * page later performs API calls of its own.
   */
  if (
    path.includes(
      "session-expired",
    )
  ) {
    return false;
  }

  return true;
}


export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers =
    new Headers(
      options.headers,
    );

  const method =
    (
      options.method ??
      "GET"
    ).toUpperCase();

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

  if (
    ![
      "GET",
      "HEAD",
      "OPTIONS",
    ].includes(method)
  ) {
    const csrfToken =
      readCookie(
        "verification_csrf",
      );

    if (csrfToken) {
      headers.set(
        "X-CSRF-Token",
        csrfToken,
      );
    }
  }

  const response =
    await fetch(
      `${appConfig.apiBaseUrl}${path}`,
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
    let message =
      "Something went wrong.";

    try {
      const data =
        (await response.json()) as {
          detail?: string;
        };

      if (
        typeof data.detail ===
          "string" &&
        data.detail.trim()
      ) {
        message =
          data.detail;
      }
    } catch {
      // Keep generic message.
    }

    if (
      shouldTreatAsVerificationSessionExpiry(
        path,
        response.status,
      )
    ) {
      signalVerificationSessionExpired();
    }

    throw new ApiError(
      message,
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