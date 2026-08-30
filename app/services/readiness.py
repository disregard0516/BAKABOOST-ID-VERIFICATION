import logging
from typing import TypedDict

from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.services.security.redis import (
    get_redis_client,
)

logger = logging.getLogger(__name__)


class ReadinessStatus(TypedDict):
    ready: bool
    database: str
    redis: str


async def check_database_ready() -> bool:
    """
    Verify that the application can establish a
    connection to PostgreSQL and execute a trivial
    query.

    No database metadata or credentials are exposed.
    """

    try:
        async with engine.connect() as connection:
            await connection.execute(
                text("SELECT 1")
            )

        return True

    except Exception:  # noqa: BLE001
        logger.warning(
            "Database readiness check failed."
        )

        return False


async def check_redis_ready() -> bool:
    """
    Verify Redis connectivity when Redis is
    configured.

    Development may intentionally run without Redis.
    Production configuration validation already
    requires Redis.
    """

    redis_client = get_redis_client()

    if redis_client is None:
        return (
            settings.app_environment
            != "production"
        )

    try:
        result = await redis_client.ping()

        return bool(result)

    except Exception:  # noqa: BLE001
        logger.warning(
            "Redis readiness check failed."
        )

        return False


async def get_readiness_status() -> ReadinessStatus:
    """
    Return dependency readiness without exposing
    connection strings, credentials, hostnames, or
    exception details.
    """

    database_ready = (
        await check_database_ready()
    )

    redis_client = get_redis_client()

    if redis_client is None:
        redis_ready = (
            settings.app_environment
            != "production"
        )

        redis_status = (
            "not_configured"
            if redis_ready
            else "unavailable"
        )

    else:
        redis_ready = (
            await check_redis_ready()
        )

        redis_status = (
            "ok"
            if redis_ready
            else "unavailable"
        )

    return ReadinessStatus(
        ready=(
            database_ready
            and redis_ready
        ),
        database=(
            "ok"
            if database_ready
            else "unavailable"
        ),
        redis=redis_status,
    )