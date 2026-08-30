from typing import Annotated

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    require_verification_csrf,
)
from app.core.config import settings
from app.db.session import get_db_session
from app.services.verification.session_service import (
    revoke_verification_session,
)

router = APIRouter(
    prefix="/verification",
    tags=["Verification Session"],
)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout_verification_session(
    response: Response,
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _csrf: Annotated[
        None,
        Depends(require_verification_csrf),
    ],
    verification_session: Annotated[
        str | None,
        Cookie(
            alias="verification_session"
        ),
    ] = None,
) -> None:
    if verification_session:
        await revoke_verification_session(
            session,
            raw_token=verification_session,
        )

    response.delete_cookie(
        key="verification_session",
        path="/",
        domain=settings.cookie_domain,
    )

    response.delete_cookie(
        key=settings.csrf_cookie_name,
        path="/",
        domain=settings.cookie_domain,
    )