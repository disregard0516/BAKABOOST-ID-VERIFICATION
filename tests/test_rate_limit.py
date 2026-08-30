from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from redis.exceptions import (
    ConnectionError as RedisConnectionError,
)
from starlette.requests import Request

from app.api import rate_limits
from app.core.config import settings
from app.services.security import rate_limit
from app.services.security.rate_limit import (
    RateLimitExceededError,
    RateLimitUnavailableError,
)


def build_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/test",
        "headers": [],
        "client": (
            "203.0.113.10",
            50000,
        ),
        "server": (
            "testserver",
            80,
        ),
        "scheme": "http",
        "query_string": b"",
    }

    return Request(scope)


@pytest.mark.asyncio
async def test_redis_limit_exceeded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis_client = AsyncMock()

    redis_client.eval.return_value = 6

    monkeypatch.setattr(
        rate_limit,
        "get_redis_client",
        lambda: redis_client,
    )
    monkeypatch.setattr(
        settings,
        "rate_limiting_enabled",
        True,
    )

    with pytest.raises(
        RateLimitExceededError
    ):
        await rate_limit.check_rate_limit(
            key="test:client",
            limit=5,
            window_seconds=60,
        )


@pytest.mark.asyncio
async def test_redis_failure_fails_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis_client = AsyncMock()

    redis_client.eval.side_effect = (
        RedisConnectionError(
            "redis unavailable"
        )
    )

    monkeypatch.setattr(
        rate_limit,
        "get_redis_client",
        lambda: redis_client,
    )
    monkeypatch.setattr(
        settings,
        "rate_limiting_enabled",
        True,
    )

    with pytest.raises(
        RateLimitUnavailableError
    ):
        await rate_limit.check_rate_limit(
            key="test:client",
            limit=5,
            window_seconds=60,
        )


@pytest.mark.asyncio
async def test_http_dependency_returns_429(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def exceed_limit(
        **kwargs,
    ) -> None:
        del kwargs
        raise RateLimitExceededError()

    monkeypatch.setattr(
        rate_limits,
        "check_rate_limit",
        exceed_limit,
    )

    dependency = rate_limits.rate_limit(
        namespace="test",
        limit=5,
        window_seconds=60,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependency(
            build_request()
        )

    assert (
        exc_info.value.status_code
        == 429
    )
    assert (
        exc_info.value.headers[
            "Retry-After"
        ]
        == "60"
    )


@pytest.mark.asyncio
async def test_http_dependency_returns_503_on_redis_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def unavailable(
        **kwargs,
    ) -> None:
        del kwargs
        raise RateLimitUnavailableError()

    monkeypatch.setattr(
        rate_limits,
        "check_rate_limit",
        unavailable,
    )

    dependency = rate_limits.rate_limit(
        namespace="test",
        limit=5,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependency(
            build_request()
        )

    assert (
        exc_info.value.status_code
        == 503
    )

    assert exc_info.value.detail == (
        "Request protection service "
        "is temporarily unavailable."
    )


@pytest.mark.asyncio
async def test_rate_limit_uses_expected_redis_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis_client = AsyncMock()

    redis_client.eval.return_value = 1

    monkeypatch.setattr(
        rate_limit,
        "get_redis_client",
        lambda: redis_client,
    )
    monkeypatch.setattr(
        settings,
        "rate_limiting_enabled",
        True,
    )

    await rate_limit.check_rate_limit(
        key="oauth:203.0.113.10",
        limit=15,
        window_seconds=60,
    )

    redis_client.eval.assert_awaited_once_with(
        rate_limit._RATE_LIMIT_SCRIPT,
        1,
        (
            "ratelimit:"
            "oauth:203.0.113.10"
        ),
        60,
    )