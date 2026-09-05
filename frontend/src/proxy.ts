import { auth0 } from "./lib/auth0";

export async function proxy(
  request: Request,
) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/auth/:path*",
  ],
};