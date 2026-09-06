import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const DEV_ADMIN_ISSUER =
  "discord-verification-local-dev";

const DEV_ADMIN_AUDIENCE =
  "discord-verification-admin";

const DEFAULT_BACKEND_API_BASE_URL =
  "http://127.0.0.1:8000/api";

const TOKEN_LIFETIME_SECONDS = 60;

function isExplicitDevelopmentMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.BAKABOOST_DEV_ADMIN_AUTH_ENABLED ===
      "true"
  );
}

function getRequiredEnvironmentValue(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required development environment variable: ${name}`,
    );
  }

  return value;
}

function getBackendApiBaseUrl(): string {
  const configured =
    process.env.BAKABOOST_BACKEND_API_BASE_URL?.trim();

  const value =
    configured || DEFAULT_BACKEND_API_BASE_URL;

  const url = new URL(value);

  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(
      url.hostname,
    )
  ) {
    throw new Error(
      "Development backend API URL must use local HTTP.",
    );
  }

  return value.replace(/\/+$/, "");
}

function requestHasTrustedOrigin(
  request: NextRequest,
): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);

    return (
      parsedOrigin.origin ===
      request.nextUrl.origin
    );
  } catch {
    return false;
  }
}

async function createDevelopmentToken(): Promise<string> {
  const secret = getRequiredEnvironmentValue(
    "BAKABOOST_DEV_ADMIN_AUTH_SECRET",
  );

  if (secret.length < 32) {
    throw new Error(
      "Development administrator secret must be at least 32 characters.",
    );
  }

  const subject = getRequiredEnvironmentValue(
    "BAKABOOST_DEV_ADMIN_AUTH_SUBJECT",
  );

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer(DEV_ADMIN_ISSUER)
    .setAudience(DEV_ADMIN_AUDIENCE)
    .setSubject(subject)
    .setIssuedAt(now)
    .setExpirationTime(
      now + TOKEN_LIFETIME_SECONDS,
    )
    .sign(
      new TextEncoder().encode(secret),
    );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  /*
   * This endpoint exists only to make local development
   * possible without exposing the development bearer token
   * or signing secret to browser JavaScript.
   *
   * Production administrator authentication is owned by
   * Cloudflare Access and must never use this route.
   */

  if (!isExplicitDevelopmentMode()) {
    return NextResponse.json(
      {
        detail: "Not found.",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!requestHasTrustedOrigin(request)) {
    return NextResponse.json(
      {
        detail: "Invalid request origin.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const token =
      await createDevelopmentToken();

    const backendApiBaseUrl =
      getBackendApiBaseUrl();

    const upstream = await fetch(
      `${backendApiBaseUrl}/admin/auth/session`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const body = await upstream.text();

    const response = new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ??
          "application/json",
        "Cache-Control": "no-store",
      },
    });

    /*
     * FastAPI creates the real BAKABOOST HttpOnly
     * administrator session and CSRF cookies.
     *
     * Forward every Set-Cookie header to the browser while
     * keeping the development bearer token server-side.
     */
    const setCookies =
      upstream.headers.getSetCookie();

    for (const cookie of setCookies) {
      response.headers.append(
        "Set-Cookie",
        cookie,
      );
    }

    return response;
  } catch {
    /*
     * Do not expose secrets, JWT contents, configuration
     * values, or backend exception details to the browser.
     */
    return NextResponse.json(
      {
        detail:
          "Development administrator authentication failed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}