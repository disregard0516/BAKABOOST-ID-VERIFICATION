from sqlalchemy.ext.asyncio import AsyncSession

from app.services.jobs.access_expiration import (
    expire_due_access_grants,
)
from app.services.jobs.request_expiration import (
    expire_due_requests,
)
from app.services.jobs.runner import execute_job
from app.services.jobs.temporary_upload_cleanup import (
    expire_temporary_upload_records,
)


async def run_all_lifecycle_jobs(
    session: AsyncSession,
) -> dict[str, int]:
    results = {}

    results["request_expiration"] = (
        await execute_job(
            session,
            job_name="request_expiration",
            job=expire_due_requests,
        )
    )

    results["access_expiration"] = (
        await execute_job(
            session,
            job_name="access_expiration",
            job=expire_due_access_grants,
        )
    )

    results["temporary_upload_cleanup"] = (
        await execute_job(
            session,
            job_name="temporary_upload_cleanup",
            job=expire_temporary_upload_records,
        )
    )

    return results