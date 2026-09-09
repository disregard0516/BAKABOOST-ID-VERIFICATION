from functools import lru_cache

from redis.asyncio import Redis

from app.core.config import settings


@lru_cache
def get_redis_client() -> Redis | None:
    if not settings.redis_url:
        return None

    return Redis.from_url(
        settings.redis_url,
        decode_responses=True,
    )

async def close_redis_client() -> None:
    """
    Close and discard the cached asynchronous Redis client.

    The cached client may own connections bound to the asyncio
    event loop that used it. Closing it during application
    shutdown prevents those connections from being reused by a
    later application lifecycle running on another event loop.
    """

    redis_client = get_redis_client()

    try:
        if redis_client is not None:
            await redis_client.aclose()
    finally:
        get_redis_client.cache_clear()
