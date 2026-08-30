from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.rate_limits import rate_limit
from app.core.config import settings
from app.core.constants import (
    ActorType,
    AuditAction,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.session import get_db_session
from app.services.audit.service import (
    record_audit_event,
)
from app.services.discord.oauth import (
    DiscordOAuthError,
    build_discord_authorization_url,
    exchange_discord_code,
    fetch_discord_user,
)
from app.services.discord.state import (
    InvalidOAuthStateError,
    consume_oauth_state,
    create_oauth_state,
)
from app.services.security.csrf import (
    generate_csrf_token,
)
from app.services.verification.entry_context import (
    InvalidEntryContextError,
    consume_entry_context,
)
from app.services.verification.request_service import (
    VerificationRequestUnavailableError,
    ensure_request_is_available,
    expire_request_if_needed,
)
from app.services.verification.session_service import (
    create_verification_session,
)

router = APIRouter(
    prefix="/auth/discord",
    tags=["Discord Authentication"],
)


@router.get("/start")
async def start_discord_oauth(
    entry_context: Annotated[
        str,
        Query(
            min_length=20,
            max_length=512,
        ),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    _rate_limit: Annotated[
        None,
        Depends(
            rate_limit(
                namespace="discord_oauth_start",
                limit=settings.oauth_start_rate_limit,
            )
        ),
    ],
) -> RedirectResponse:
    try:
        context = await consume_entry_context(
            session,
            raw_context=entry_context,
        )

        # Persist one-time consumption immediately.
        await session.commit()

    except InvalidEntryContextError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification request unavailable.",
        ) from exc

    verification_request = await session.get(
        VerificationRequest,
        context.verification_request_id,
    )

    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    expired = await expire_request_if_needed(
        session,
        request=verification_request,
    )

    if expired:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        )

    try:
        ensure_request_is_available(
            verification_request
        )

    except VerificationRequestUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request unavailable.",
        ) from exc

    raw_state = await create_oauth_state(
        session,
        verification_request_id=(
            verification_request.id
        ),
    )

    authorization_url = (
        build_discord_authorization_url(
            state=raw_state
        )
    )

    return RedirectResponse(
        authorization_url,
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/callback")
async def discord_oauth_callback(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    if (
        error is not None
        or code is None
        or state is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Discord authentication was not completed."
            ),
        )

    try:
        oauth_state = await consume_oauth_state(
            session,
            raw_state=state,
        )

        # SECURITY:
        # state becomes permanently one-time before any
        # external Discord request happens.
        await session.commit()

    except InvalidOAuthStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication request invalid.",
        ) from exc

    verification_request = await session.get(
        VerificationRequest,
        oauth_state.verification_request_id,
    )

    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication request invalid.",
        )

    expired = await expire_request_if_needed(
        session,
        request=verification_request,
    )

    if expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication request invalid.",
        )

    try:
        ensure_request_is_available(
            verification_request
        )

    except VerificationRequestUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication request invalid.",
        ) from exc

    try:
        token = await exchange_discord_code(
            code=code
        )

        discord_user = await fetch_discord_user(
            access_token=token.access_token
        )

    except DiscordOAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discord authentication failed.",
        ) from exc

    try:
        authenticated_discord_id = int(
            discord_user.id
        )

    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discord authentication failed.",
        ) from exc

    if (
        authenticated_discord_id
        != verification_request.assigned_discord_user_id
    ):
        await record_audit_event(
            session,
            actor_type=(
                ActorType.VERIFICATION_USER.value
            ),
            actor_id=str(
                authenticated_discord_id
            ),
            action=(
                AuditAction.DISCORD_AUTH_DENIED.value
            ),
            verification_request_id=(
                verification_request.id
            ),
            metadata={
                "reason": (
                    "discord_user_id_mismatch"
                ),
            },
        )

        await session.commit()

        return RedirectResponse(
            (
                f"{settings.frontend_url.rstrip('/')}"
                "/verification/access-denied"
            ),
            status_code=status.HTTP_302_FOUND,
        )

    _, raw_session_token = (
        await create_verification_session(
            session,
            verification_request_id=(
                verification_request.id
            ),
            discord_user_id=(
                authenticated_discord_id
            ),
        )
    )

    # Display-only snapshots.
    # Discord User ID remains authoritative.
    verification_request.discord_username_snapshot = (
        discord_user.username
    )

    verification_request.discord_avatar_hash_snapshot = (
        discord_user.avatar
    )

    await record_audit_event(
        session,
        actor_type=(
            ActorType.VERIFICATION_USER.value
        ),
        actor_id=str(
            authenticated_discord_id
        ),
        action=(
            AuditAction.DISCORD_AUTH_SUCCEEDED.value
        ),
        verification_request_id=(
            verification_request.id
        ),
    )

    await session.commit()

    csrf_token = generate_csrf_token()

    response = RedirectResponse(
        (
            f"{settings.frontend_url.rstrip('/')}"
            "/verification/account-confirmed"
        ),
        status_code=status.HTTP_302_FOUND,
    )

    response.set_cookie(
        key="verification_session",
        value=raw_session_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=(
            settings.verification_session_ttl_minutes
            * 60
        ),
        path="/",
        domain=settings.cookie_domain,
    )

    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=(
            settings.verification_session_ttl_minutes
            * 60
        ),
        path="/",
        domain=settings.cookie_domain,
    )

    return response