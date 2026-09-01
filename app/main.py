from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import (
    TrustedHostMiddleware,
)

from app.api.router import api_router
from app.core.config import settings
from app.core.error_handlers import (
    register_error_handlers,
)
from app.core.startup_security import (
    validate_runtime_security,
)
from app.middleware.origin_protection import (
    OriginProtectionMiddleware,
)
from app.middleware.request_context import (
    RequestContextMiddleware,
)
from app.middleware.security_headers import (
    SecurityHeadersMiddleware,
)
from app.services.readiness import (
    get_readiness_status,
)


def create_application() -> FastAPI:
    #
    # Fail closed if production security
    # configuration is unsafe.
    #
    validate_runtime_security()

    application = FastAPI(
        title=settings.app_name,
        description=(
            "Secure pre-Discord identity "
            "verification backend. Verification "
            "users remain outside the protected "
            "Discord server until an authorized "
            "administrator approves their request."
        ),
        version="0.1.0",
        debug=settings.debug,

        #
        # Interactive API documentation is useful
        # during development but is intentionally
        # unavailable in production.
        #
        docs_url=(
            None
            if settings.app_environment
            == "production"
            else "/docs"
        ),
        redoc_url=(
            None
            if settings.app_environment
            == "production"
            else "/redoc"
        ),
        openapi_url=(
            None
            if settings.app_environment
            == "production"
            else "/openapi.json"
        ),
    )

    allowed_origins = [
        origin.strip()
        for origin
        in settings.allowed_origins.split(",")
        if origin.strip()
    ]

    allowed_hosts = [
        host.strip()
        for host
        in settings.allowed_hosts.split(",")
        if host.strip()
    ]

    #
    # Reject unexpected Host headers.
    #
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts,
    )

    #
    # Restrict browser API access to approved
    # frontend origins.
    #
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=[
            "GET",
            "POST",
            "DELETE",
            "OPTIONS",
        ],
        allow_headers=[
            "Authorization",
            "Content-Type",
            settings.csrf_header_name,
            settings.admin_csrf_header_name,
            "X-Mobile-Handoff-Token",
        ],
        expose_headers=[
            "X-Request-ID",
        ],
    )

    #
    # Protect cookie-authenticated state-changing
    # requests from unapproved origins.
    #
    application.add_middleware(
        OriginProtectionMiddleware,
    )

    #
    # Add browser/API security headers.
    #
    application.add_middleware(
        SecurityHeadersMiddleware,
    )
    
    #
    # Generate a trusted server-side correlation ID for every
    # HTTP request.
    #
    # Register this last so it is the outermost application
    # middleware and can establish request.state.request_id
    # before downstream middleware/routes execute.
    #
    application.add_middleware(
        RequestContextMiddleware,
    )

    application.include_router(
        api_router,
        prefix=settings.api_prefix,
    )

    #
    # Do not expose internal exceptions or stack
    # traces through API responses.
    #
    register_error_handlers(
        application
    )

    return application


app = create_application()


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "environment": (
            settings.app_environment
        ),
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Liveness probe.

    A successful response means the Python/FastAPI
    process is alive. It deliberately does not
    contact external dependencies.
    """

    return {
        "status": "healthy",
    }


@app.get("/ready")
async def readiness_check():
    """
    Readiness probe.

    PostgreSQL must be reachable.

    Redis must also be reachable whenever configured.
    Production startup security requires Redis to be
    configured, so production cannot become ready
    without it.
    """

    readiness = (
        await get_readiness_status()
    )

    if not readiness["ready"]:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "database": (
                    readiness["database"]
                ),
                "redis": readiness["redis"],
            },
        )

    return {
        "status": "ready",
        "database": (
            readiness["database"]
        ),
        "redis": readiness["redis"],
    }