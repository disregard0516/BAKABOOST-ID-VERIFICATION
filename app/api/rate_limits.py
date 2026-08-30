from collections.abc import Callable

from fastapi import (
    HTTPException,
    Request,
    status,
)

from app.services.security.rate_limit import (
    RateLimitConfigurationError,
    RateLimitExceededError,
    RateLimitUnavailableError,
    check_rate_limit,
)


def rate_limit(
    *,
    namespace: str,
    limit: int,
    window_seconds: int = 60,
) -> Callable:
    async def dependency(
        request: Request,
    ) -> None:
        client_ip = (
            request.client.host
            if request.client
            else "unknown"
        )

        try:
            await check_rate_limit(
                key=(
                    f"{namespace}:"
                    f"{client_ip}"
                ),
                limit=limit,
                window_seconds=(
                    window_seconds
                ),
            )

        except RateLimitExceededError:
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_429_TOO_MANY_REQUESTS
                ),
                detail="Too many requests.",
                headers={
                    "Retry-After": str(
                        window_seconds
                    ),
                },
            ) from None

        except (
            RateLimitUnavailableError,
            RateLimitConfigurationError,
        ):
            #
            # Fail closed instead of silently
            # allowing unlimited traffic.
            #
            # A 503 distinguishes a protection
            # dependency outage from an
            # application bug.
            #
            raise HTTPException(
                status_code=(
                    status
                    .HTTP_503_SERVICE_UNAVAILABLE
                ),
                detail=(
                    "Request protection service "
                    "is temporarily unavailable."
                ),
                headers={
                    "Retry-After": "5",
                },
            ) from None

    return dependency