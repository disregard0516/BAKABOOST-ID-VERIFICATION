from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Request,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    CurrentAdminSession,
    require_permission,
    require_sensitive_permission,
)
from app.core.config import settings
from app.core.permissions import Permission
from app.db.models.admin import Admin
from app.db.session import get_db_session
from app.schemas.admin_team import (
    AcceptAdminInvitationRequest,
    AcceptedAdminInvitationResponse,
    AdminAccountStateResponse,
    AdminInvitationListResponse,
    AdminInvitationResponse,
    AdminRoleChangeResponse,
    AdminSessionRevocationResponse,
    AdminTeamListResponse,
    AdminTeamMemberResponse,
    ChangeAdminRoleRequest,
    CreateAdminInvitationRequest,
    CreatedAdminInvitationResponse,
    RevokeAdminInvitationRequest,
)
from app.services.admin.auth import (
    AdminAuthenticationError,
    decode_admin_token,
)
from app.services.admin.invitation_service import (
    AdminInvitationAlreadyAcceptedError,
    AdminInvitationConflictError,
    AdminInvitationError,
    AdminInvitationExpiredError,
    AdminInvitationIdentityError,
    AdminInvitationNotFoundError,
    AdminInvitationPermissionError,
    AdminInvitationRevokedError,
    accept_admin_invitation,
    create_admin_invitation,
    list_admin_invitations,
    revoke_admin_invitation,
)
from app.services.admin.team_service import (
    AdminTeamConflictError,
    AdminTeamError,
    AdminTeamNotFoundError,
    AdminTeamPermissionError,
    change_admin_role,
    disable_admin,
    enable_admin,
    list_admin_team,
    revoke_admin_access_sessions,
)

router = APIRouter(
    prefix="/team",
    tags=["Admin Team & Access"],
)


# ============================================================
# DEPENDENCY TYPES
# ============================================================


DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]


_bearer = HTTPBearer(
    auto_error=False,
)


BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(_bearer),
]


# ============================================================
# REQUEST SECURITY CONTEXT
# ============================================================


def _request_id(
    request: Request,
) -> str | None:
    """
    Return only the server-generated request correlation ID.

    RequestContextMiddleware owns generation of this value.
    Client-supplied X-Request-ID is deliberately ignored.
    """

    value = getattr(
        request.state,
        "request_id",
        None,
    )

    if value is None:
        return None

    normalized = str(
        value
    ).strip()

    return normalized or None


def _client_ip(
    request: Request,
) -> str | None:
    """
    Use the directly-observed socket peer.

    Forwarded headers are not trusted here.
    """

    if request.client is None:
        return None

    value = request.client.host

    if not value:
        return None

    normalized = value.strip()

    return normalized or None


def _user_agent(
    request: Request,
) -> str | None:
    value = request.headers.get(
        "user-agent"
    )

    if value is None:
        return None

    normalized = value.strip()

    return normalized or None


# ============================================================
# RESPONSE MAPPERS
# ============================================================


def _admin_response(
    admin: Admin,
) -> AdminTeamMemberResponse:
    return AdminTeamMemberResponse(
        id=admin.id,
        email=admin.email,
        display_name=admin.display_name,
        role=admin.role,
        is_active=admin.is_active,
        mfa_enabled=admin.mfa_enabled,
        last_login_at=admin.last_login_at,
        invited_at=admin.invited_at,
        activated_at=admin.activated_at,
        disabled_at=admin.disabled_at,
        security_updated_at=(
            admin.security_updated_at
        ),
        created_at=admin.created_at,
        updated_at=admin.updated_at,
    )


def _invitation_response(
    invitation,
) -> AdminInvitationResponse:
    return AdminInvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        invited_by_admin_id=(
            invitation.invited_by_admin_id
        ),
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        updated_at=invitation.updated_at,
        accepted_at=invitation.accepted_at,
        accepted_admin_id=(
            invitation.accepted_admin_id
        ),
        revoked_at=invitation.revoked_at,
        revoked_by_admin_id=(
            invitation.revoked_by_admin_id
        ),
        revoke_reason=(
            invitation.revoke_reason
        ),
    )


# ============================================================
# ERROR HELPERS
# ============================================================


def _raise_team_error(
    exc: AdminTeamError,
) -> None:
    if isinstance(
        exc,
        AdminTeamPermissionError,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied.",
        ) from exc

    if isinstance(
        exc,
        AdminTeamNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrator not found.",
        ) from exc

    if isinstance(
        exc,
        AdminTeamConflictError,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Administrator operation failed.",
    ) from exc


def _raise_invitation_management_error(
    exc: AdminInvitationError,
) -> None:
    if isinstance(
        exc,
        AdminInvitationPermissionError,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied.",
        ) from exc

    if isinstance(
        exc,
        AdminInvitationNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrator invitation not found.",
        ) from exc

    if isinstance(
        exc,
        (
            AdminInvitationConflictError,
            AdminInvitationAlreadyAcceptedError,
        ),
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Administrator invitation operation failed.",
    ) from exc


def _raise_invitation_acceptance_error(
    exc: AdminInvitationError,
) -> None:
    """
    Public enrollment errors deliberately collapse invitation
    state details.

    A caller must not be able to probe whether an invitation
    exists, expired, was revoked, or was previously consumed.
    """

    if isinstance(
        exc,
        AdminInvitationIdentityError,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Authenticated identity cannot "
                "accept this invitation."
            ),
        ) from exc

    if isinstance(
        exc,
        AdminInvitationConflictError,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Administrator identity cannot "
                "be provisioned."
            ),
        ) from exc

    if isinstance(
        exc,
        (
            AdminInvitationNotFoundError,
            AdminInvitationExpiredError,
            AdminInvitationRevokedError,
            AdminInvitationAlreadyAcceptedError,
        ),
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Administrator invitation is "
                "invalid or unavailable."
            ),
        ) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Administrator invitation could not be accepted.",
    ) from exc


# ============================================================
# TEAM LIST
# ============================================================


@router.get(
    "",
    response_model=AdminTeamListResponse,
)
async def get_admin_team(
    session: DatabaseSession,
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.ADMIN_MANAGE
            )
        ),
    ],
) -> AdminTeamListResponse:
    try:
        members = await list_admin_team(
            session,
            acting_admin=admin,
        )

    except AdminTeamError as exc:
        await session.rollback()
        _raise_team_error(
            exc
        )
        raise AssertionError(
            "unreachable"
        )

    return AdminTeamListResponse(
        items=[
            _admin_response(
                member
            )
            for member in members
        ]
    )


# ============================================================
# INVITATION LIST
# ============================================================


@router.get(
    "/invitations",
    response_model=AdminInvitationListResponse,
)
async def get_admin_invitations(
    session: DatabaseSession,
    admin: Annotated[
        Admin,
        Depends(
            require_permission(
                Permission.ADMIN_MANAGE
            )
        ),
    ],
) -> AdminInvitationListResponse:
    try:
        invitations = (
            await list_admin_invitations(
                session,
                acting_admin=admin,
            )
        )

    except AdminInvitationError as exc:
        await session.rollback()

        _raise_invitation_management_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    return AdminInvitationListResponse(
        items=[
            _invitation_response(
                invitation
            )
            for invitation
            in invitations
        ]
    )


# ============================================================
# CREATE INVITATION
# ============================================================


@router.post(
    "/invitations",
    response_model=(
        CreatedAdminInvitationResponse
    ),
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    payload: CreateAdminInvitationRequest,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.ADMIN_MANAGE
            )
        ),
    ],
) -> CreatedAdminInvitationResponse:
    try:
        created = (
            await create_admin_invitation(
                session,
                acting_admin=admin,
                email=payload.email,
                role=payload.role,
                expires_at=(
                    payload.expires_at
                ),
                ip_address=_client_ip(
                    http_request
                ),
                admin_session_id=(
                    current.session.id
                ),
                request_id=_request_id(
                    http_request
                ),
                user_agent=_user_agent(
                    http_request
                ),
            )
        )

        await session.commit()

    except AdminInvitationError as exc:
        await session.rollback()

        _raise_invitation_management_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return CreatedAdminInvitationResponse(
        invitation=_invitation_response(
            created.invitation
        ),
        invitation_token=(
            created.raw_token
        ),
    )


# ============================================================
# REVOKE INVITATION
# ============================================================


@router.post(
    "/invitations/{invitation_id}/revoke",
    response_model=AdminInvitationResponse,
)
async def revoke_invitation(
    invitation_id: UUID,
    payload: RevokeAdminInvitationRequest,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.ADMIN_MANAGE
            )
        ),
    ],
) -> AdminInvitationResponse:
    try:
        invitation = (
            await revoke_admin_invitation(
                session,
                invitation_id=(
                    invitation_id
                ),
                acting_admin=admin,
                reason=payload.reason,
                ip_address=_client_ip(
                    http_request
                ),
                admin_session_id=(
                    current.session.id
                ),
                request_id=_request_id(
                    http_request
                ),
                user_agent=_user_agent(
                    http_request
                ),
            )
        )

        await session.commit()

    except AdminInvitationError as exc:
        await session.rollback()

        _raise_invitation_management_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return _invitation_response(
        invitation
    )


# ============================================================
# INVITATION ACCEPTANCE
# ============================================================

@router.post(
    "/invitations/accept",
    response_model=(
        AcceptedAdminInvitationResponse
    ),
)
async def accept_invitation(
    payload: AcceptAdminInvitationRequest,
    http_request: Request,
    session: DatabaseSession,
    credentials: BearerCredentials,
    cloudflare_access_assertion: Annotated[
        str | None,
        Header(
            alias="Cf-Access-Jwt-Assertion",
        ),
    ] = None,
) -> AcceptedAdminInvitationResponse:
    """
    Cloudflare Access-backed administrator enrollment.

    This endpoint intentionally does NOT require an existing
    BAKABOOST administrator session because the invitee has
    not yet been provisioned locally.

    Production authentication requires a cryptographically
    validated Cloudflare Access application JWT.

    Authorization Bearer credentials are accepted only by the
    explicitly enabled local-development authentication mode.

    External authentication alone remains insufficient.
    Successful enrollment additionally requires a valid,
    unused invitation whose normalized email matches the
    authenticated identity exactly.
    """

    environment = (
        str(settings.app_environment)
        .strip()
        .lower()
    )

    development_auth = (
        environment == "development"
        and settings.dev_admin_auth_enabled
    )

    raw_assertion: str | None = None

    # --------------------------------------------------------
    # Resolve external authentication assertion
    # --------------------------------------------------------

    if development_auth:
        if credentials is not None:
            candidate = (
                credentials.credentials
                .strip()
            )

            if candidate:
                raw_assertion = candidate

        if raw_assertion is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Authentication required.",
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

    else:
        if isinstance(
            cloudflare_access_assertion,
            str,
        ):
            candidate = (
                cloudflare_access_assertion
                .strip()
            )

            if candidate:
                raw_assertion = candidate

        if raw_assertion is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="Authentication required.",
            )

    try:
        # ----------------------------------------------------
        # Verify external identity
        # ----------------------------------------------------

        identity = decode_admin_token(
            raw_assertion
        )

        # ----------------------------------------------------
        # Consume invitation + provision local administrator
        # ----------------------------------------------------

        accepted = (
            await accept_admin_invitation(
                session,
                raw_token=(
                    payload.invitation_token
                ),
                identity=identity,
                ip_address=_client_ip(
                    http_request
                ),
                request_id=_request_id(
                    http_request
                ),
                user_agent=_user_agent(
                    http_request
                ),
            )
        )

        await session.commit()

    except AdminAuthenticationError as exc:
        await session.rollback()

        response_headers: dict[
            str,
            str,
        ] | None = None

        if development_auth:
            response_headers = {
                "WWW-Authenticate": "Bearer",
            }

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid administrator "
                "authentication."
            ),
            headers=response_headers,
        ) from exc

    except AdminInvitationError as exc:
        await session.rollback()

        _raise_invitation_acceptance_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    activated_at = (
        accepted.admin.activated_at
    )

    if activated_at is None:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Administrator activation failed."
            ),
        )

    return AcceptedAdminInvitationResponse(
        admin_id=accepted.admin.id,
        role=accepted.admin.role,
        activated_at=activated_at,
    )

# ============================================================
# ROLE CHANGE
# ============================================================


@router.post(
    "/{admin_id}/role",
    response_model=AdminRoleChangeResponse,
)
async def update_admin_role(
    admin_id: UUID,
    payload: ChangeAdminRoleRequest,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.SECURITY_MANAGE
            )
        ),
    ],
) -> AdminRoleChangeResponse:
    try:
        target = await change_admin_role(
            session,
            target_admin_id=admin_id,
            acting_admin=admin,
            role=payload.role,
            ip_address=_client_ip(
                http_request
            ),
            admin_session_id=(
                current.session.id
            ),
            request_id=_request_id(
                http_request
            ),
            user_agent=_user_agent(
                http_request
            ),
        )

        await session.commit()

    except AdminTeamError as exc:
        await session.rollback()

        _raise_team_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return AdminRoleChangeResponse(
        admin_id=target.id,
        role=target.role,
        security_version=(
            target.security_version
        ),
    )


# ============================================================
# DISABLE ADMIN
# ============================================================


@router.post(
    "/{admin_id}/disable",
    response_model=AdminAccountStateResponse,
)
async def disable_team_admin(
    admin_id: UUID,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.SECURITY_MANAGE
            )
        ),
    ],
) -> AdminAccountStateResponse:
    try:
        target = await disable_admin(
            session,
            target_admin_id=admin_id,
            acting_admin=admin,
            ip_address=_client_ip(
                http_request
            ),
            admin_session_id=(
                current.session.id
            ),
            request_id=_request_id(
                http_request
            ),
            user_agent=_user_agent(
                http_request
            ),
        )

        await session.commit()

    except AdminTeamError as exc:
        await session.rollback()

        _raise_team_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return AdminAccountStateResponse(
        admin_id=target.id,
        is_active=target.is_active,
        disabled_at=target.disabled_at,
        security_version=(
            target.security_version
        ),
    )


# ============================================================
# ENABLE ADMIN
# ============================================================


@router.post(
    "/{admin_id}/enable",
    response_model=AdminAccountStateResponse,
)
async def enable_team_admin(
    admin_id: UUID,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.SECURITY_MANAGE
            )
        ),
    ],
) -> AdminAccountStateResponse:
    try:
        target = await enable_admin(
            session,
            target_admin_id=admin_id,
            acting_admin=admin,
            ip_address=_client_ip(
                http_request
            ),
            admin_session_id=(
                current.session.id
            ),
            request_id=_request_id(
                http_request
            ),
            user_agent=_user_agent(
                http_request
            ),
        )

        await session.commit()

    except AdminTeamError as exc:
        await session.rollback()

        _raise_team_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return AdminAccountStateResponse(
        admin_id=target.id,
        is_active=target.is_active,
        disabled_at=target.disabled_at,
        security_version=(
            target.security_version
        ),
    )


# ============================================================
# FORCE SESSION REVOCATION
# ============================================================


@router.post(
    "/{admin_id}/revoke-sessions",
    response_model=(
        AdminSessionRevocationResponse
    ),
)
async def revoke_team_admin_sessions(
    admin_id: UUID,
    http_request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    admin: Annotated[
        Admin,
        Depends(
            require_sensitive_permission(
                Permission.SECURITY_MANAGE
            )
        ),
    ],
) -> AdminSessionRevocationResponse:
    try:
        target = (
            await revoke_admin_access_sessions(
                session,
                target_admin_id=admin_id,
                acting_admin=admin,
                ip_address=_client_ip(
                    http_request
                ),
                admin_session_id=(
                    current.session.id
                ),
                request_id=_request_id(
                    http_request
                ),
                user_agent=_user_agent(
                    http_request
                ),
            )
        )

        await session.commit()

    except AdminTeamError as exc:
        await session.rollback()

        _raise_team_error(
            exc
        )

        raise AssertionError(
            "unreachable"
        )

    except Exception:
        await session.rollback()
        raise

    return AdminSessionRevocationResponse(
        admin_id=target.id,
        security_version=(
            target.security_version
        ),
        sessions_invalidated=True,
    )