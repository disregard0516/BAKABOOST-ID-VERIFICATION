from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.system_job_run import SystemJobRun
from app.utils.time import utc_now


async def execute_job(
    session: AsyncSession,
    *,
    job_name: str,
    job: Callable[
        [AsyncSession],
        Awaitable[int],
    ],
) -> int:
    run = SystemJobRun(
        job_name=job_name,
        status="running",
        started_at=utc_now(),
    )

    session.add(run)
    await session.commit()
    await session.refresh(run)

    try:
        processed = await job(session)

        run.status = "success"
        run.processed_count = processed
        run.completed_at = utc_now()

        await session.commit()

        return processed

    except Exception as exc:
        await session.rollback()

        run.status = "failed"
        run.error_message = str(exc)[:2000]
        run.completed_at = utc_now()

        session.add(run)
        await session.commit()

        raise