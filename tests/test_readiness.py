import pytest

from app.core.config import settings
from app.services import readiness


@pytest.mark.asyncio
async def test_readiness_when_dependencies_are_healthy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def database_ready() -> bool:
        return True

    async def redis_ready() -> bool:
        return True

    class FakeRedis:
        pass

    monkeypatch.setattr(
        readiness,
        "check_database_ready",
        database_ready,
    )

    monkeypatch.setattr(
        readiness,
        "check_redis_ready",
        redis_ready,
    )

    monkeypatch.setattr(
        readiness,
        "get_redis_client",
        lambda: FakeRedis(),
    )

    result = (
        await readiness
        .get_readiness_status()
    )

    assert result["ready"] is True
    assert result["database"] == "ok"
    assert result["redis"] == "ok"


@pytest.mark.asyncio
async def test_readiness_fails_when_database_is_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def database_ready() -> bool:
        return False

    async def redis_ready() -> bool:
        return True

    class FakeRedis:
        pass

    monkeypatch.setattr(
        readiness,
        "check_database_ready",
        database_ready,
    )

    monkeypatch.setattr(
        readiness,
        "check_redis_ready",
        redis_ready,
    )

    monkeypatch.setattr(
        readiness,
        "get_redis_client",
        lambda: FakeRedis(),
    )

    result = (
        await readiness
        .get_readiness_status()
    )

    assert result["ready"] is False
    assert (
        result["database"]
        == "unavailable"
    )
    assert result["redis"] == "ok"


@pytest.mark.asyncio
async def test_readiness_fails_when_redis_is_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def database_ready() -> bool:
        return True

    async def redis_ready() -> bool:
        return False

    class FakeRedis:
        pass

    monkeypatch.setattr(
        readiness,
        "check_database_ready",
        database_ready,
    )

    monkeypatch.setattr(
        readiness,
        "check_redis_ready",
        redis_ready,
    )

    monkeypatch.setattr(
        readiness,
        "get_redis_client",
        lambda: FakeRedis(),
    )

    result = (
        await readiness
        .get_readiness_status()
    )

    assert result["ready"] is False
    assert result["database"] == "ok"
    assert (
        result["redis"]
        == "unavailable"
    )


@pytest.mark.asyncio
async def test_development_without_redis_can_be_ready(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def database_ready() -> bool:
        return True

    monkeypatch.setattr(
        readiness,
        "check_database_ready",
        database_ready,
    )

    monkeypatch.setattr(
        readiness,
        "get_redis_client",
        lambda: None,
    )

    monkeypatch.setattr(
        settings,
        "app_environment",
        "development",
    )

    result = (
        await readiness
        .get_readiness_status()
    )

    assert result["ready"] is True
    assert result["database"] == "ok"
    assert (
        result["redis"]
        == "not_configured"
    )


@pytest.mark.asyncio
async def test_production_without_redis_is_not_ready(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def database_ready() -> bool:
        return True

    monkeypatch.setattr(
        readiness,
        "check_database_ready",
        database_ready,
    )

    monkeypatch.setattr(
        readiness,
        "get_redis_client",
        lambda: None,
    )

    monkeypatch.setattr(
        settings,
        "app_environment",
        "production",
    )

    result = (
        await readiness
        .get_readiness_status()
    )

    assert result["ready"] is False
    assert result["database"] == "ok"
    assert (
        result["redis"]
        == "unavailable"
    )