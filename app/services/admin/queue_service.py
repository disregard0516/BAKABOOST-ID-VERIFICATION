from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.constants import VerificationStatus
from app.db.models.admin import Admin
from app.db.models.verification_request import VerificationRequest


async def list_verification_requests(
    session: AsyncSession,
    *,
    search: str | None = None,
    statuses: list[VerificationStatus] | None = None,
    limit: int = 50,
    offset: int = 0,
):
    creator = aliased(Admin)
    reviewer = aliased(Admin)

    query = (
        select(
            VerificationRequest,
            creator.display_name.label("creator_name"),
            reviewer.display_name.label("reviewer_name"),
        )
        .outerjoin(
            creator,
            creator.id
            == VerificationRequest.created_by_admin_id,
        )
        .outerjoin(
            reviewer,
            reviewer.id
            == VerificationRequest.assigned_reviewer_id,
        )
    )

    count_query = select(
        func.count(VerificationRequest.id)
    )

    filters = []

    if statuses:
        filters.append(
            VerificationRequest.status.in_(statuses)
        )

    if search:
        search = search.strip()

        conditions = [
            VerificationRequest.discord_username_snapshot.ilike(
                f"%{search}%"
            )
        ]

        if search.isdigit():
            conditions.append(
                VerificationRequest.assigned_discord_user_id
                == int(search)
            )

        try:
            request_uuid = UUID(search)

            conditions.append(
                VerificationRequest.id == request_uuid
            )

        except ValueError:
            pass

        filters.append(or_(*conditions))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    query = (
        query
        .order_by(
            VerificationRequest.queue_entered_at.asc().nullslast(),
            VerificationRequest.created_at.asc(),
        )
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    count_result = await session.execute(count_query)

    rows = result.all()
    total = count_result.scalar_one()

    return rows, total