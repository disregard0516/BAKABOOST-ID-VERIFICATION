from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.services.security.redis import (
    get_redis_client,
)


class RateLimitExceededError(Exception):
    pass


class RateLimitConfigurationError(
    RuntimeError
):
    pass


class RateLimitUnavailableError(
    RuntimeError
):
    pass


_RATE_LIMIT_SCRIPT = """
local current = redis.call(
    'INCR',
    KEYS[1]
)

if current == 1 then
    redis.call(
        'EXPIRE',
        KEYS[1],
        ARGV[1]
    )
end

return current
"""


async def check_rate_limit(
    *,
    key: str,
    limit: int,
    window_seconds: int = 60,
) -> None:
    if limit <= 0:
        raise RateLimitConfigurationError(
            "Rate limit must be greater than zero."
        )

    if window_seconds <= 0:
        raise RateLimitConfigurationError(
            "Rate limit window must be "
            "greater than zero."
        )

    if not settings.rate_limiting_enabled:
        if (
            settings.app_environment
            == "production"
        ):
            raise (
                RateLimitConfigurationError(
                    "Production rate limiting "
                    "cannot be disabled."
                )
            )

        return

    redis_client: Redis | None = (
        get_redis_client()
    )

    if redis_client is None:
        if (
            settings.app_environment
            == "production"
        ):
            raise (
                RateLimitConfigurationError(
                    "Production rate limiting "
                    "requires Redis."
                )
            )

        #
        # Development deliberately has no
        # fake distributed limiter.
        #
        return

    redis_key = (
        f"ratelimit:{key}"
    )

    try:
        #
        # INCR + first-key expiry happen
        # atomically inside Redis.
        #
        value = await redis_client.eval(
            _RATE_LIMIT_SCRIPT,
            1,
            redis_key,
            window_seconds,
        )

    except RedisError as exc:
        #
        # Never silently bypass abuse
        # protection because Redis is down.
        #
        raise RateLimitUnavailableError(
            "Rate limiting service unavailable."
        ) from exc

    if int(value) > limit:
        raise RateLimitExceededError()