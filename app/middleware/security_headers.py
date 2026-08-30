from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next,
    ) -> Response:
        response = await call_next(request)

        response.headers[
            "X-Content-Type-Options"
        ] = "nosniff"

        response.headers[
            "X-Frame-Options"
        ] = "DENY"

        response.headers[
            "Referrer-Policy"
        ] = "no-referrer"

        response.headers[
            "Permissions-Policy"
        ] = (
            "camera=(), microphone=(), "
            "geolocation=(), payment=()"
        )

        response.headers[
            "Cross-Origin-Opener-Policy"
        ] = "same-origin"

        response.headers[
            "Cross-Origin-Resource-Policy"
        ] = "same-site"

        response.headers[
            "Content-Security-Policy"
        ] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'none';"
        )

        if settings.app_environment == "production":
            response.headers[
                "Strict-Transport-Security"
            ] = (
                "max-age=31536000; "
                "includeSubDomains"
            )

        return response