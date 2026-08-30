from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

SAFE_METHODS = {
    "GET",
    "HEAD",
    "OPTIONS",
}


def _allowed_origin_set() -> set[str]:
    return {
        origin.strip().rstrip("/")
        for origin in settings.allowed_origins.split(",")
        if origin.strip()
    }


class OriginProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next,
    ) -> Response:
        if request.method in SAFE_METHODS:
            return await call_next(request)

        # Admin Bearer APIs do not rely on ambient browser cookies.
        authorization = request.headers.get(
            "authorization",
            ""
        )

        if authorization.lower().startswith(
            "bearer "
        ):
            return await call_next(request)

        origin = request.headers.get("origin")

        if not origin:
            referer = request.headers.get(
                "referer"
            )

            if referer:
                parsed = urlparse(referer)

                origin = (
                    f"{parsed.scheme}://"
                    f"{parsed.netloc}"
                )

        allowed = _allowed_origin_set()

        if (
            not origin
            or origin.rstrip("/") not in allowed
        ):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": (
                        "Request origin not permitted."
                    )
                },
            )

        return await call_next(request)