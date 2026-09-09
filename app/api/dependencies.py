from __future__ import annotations

from typing import Annotated

from fastapi import (
    Cookie,
    Depends,
    Header,
    HTTPException,
    Request,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import ActorType, AuditAction
from app.core.permissions import (
    Permission,
    role_has_permission,
)
from app.db.models.admin import Admin
from app.db.models.mobile_capture_session import (
    MobileCaptureSession,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.services.admin.session_service import (
    AdminSessionError,
    InvalidAdminSessionError,
    ValidatedAdminSession,
    get_admin_csrf_cookie_name,
    get_admin_session_cookie_name,
    get_valid_admin_session,
    revoke_admin_session_by_id,
    validate_admin_session_csrf,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.security.csrf import (
    CSRFValidationError,
    validate_csrf_token,
)
from app.services.verification.mobile_capture_service import (
    InvalidMobileCaptureSessionError,
    get_valid_mobile_capture_session,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    get_valid_verification_session,
)

# ============================================================
# DATABASE
# ============================================================


DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]


# ============================================================
# REQUEST / AUDIT CONTEXT
# ============================================================


def _request_id(
    request: Request,
) -> str | None:
    """
    Return the server-generated request correlation ID.

    The RequestContextMiddleware owns generation of this value;
    inbound client X-Request-ID values are not trusted.
    """

    value = getattr(
        request.state,
        "request_id",
        None,
    )

    if value is None:
        return None

    normalized = str(value).strip()

    if not normalized:
        return None

    return normalized


def _user_agent(
    request: Request,
) -> str | None:
    value = request.headers.get(
        "user-agent"
    )

    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    return normalized


def _client_ip(
    request: Request,
) -> str | None:
    """
    Return the directly observed peer IP.

    Forwarded-IP headers are deliberately not trusted here.
    Trusted-proxy handling can be introduced centrally later
    if deployment architecture requires it.
    """

    if request.client is None:
        return None

    value = request.client.host

    if not value:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    return normalized


def _automatic_invalidation_action(
    reason: str | None,
) -> AuditAction:
    if reason == "absolute_expiry":
        return (
            AuditAction
            .ADMIN_SESSION_EXPIRED
        )

    if reason == "idle_timeout":
        return (
            AuditAction
            .ADMIN_SESSION_IDLE_EXPIRED
        )

    return (
        AuditAction
        .ADMIN_SESSION_SECURITY_INVALIDATED
    )


async def _persist_admin_session_invalidation(
    session: AsyncSession,
    *,
    request: Request,
    exc: InvalidAdminSessionError,
) -> None:
    """
    Persist an automatic session invalidation after the failed
    validation transaction has been rolled back.

    Revocation and its audit event are committed atomically.
    """

    if not exc.requires_revocation:
        return

    if (
        exc.admin_id is None
        or exc.admin_session_id is None
    ):
        return

    reason = (
        exc.reason
        or "security_state_changed"
    )

    await revoke_admin_session_by_id(
        session,
        admin_session_id=(
            exc.admin_session_id
        ),
        admin_id=exc.admin_id,
        reason=reason,
    )

    action = (
        _automatic_invalidation_action(
            reason
        )
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            exc.admin_id
        ),
        action=action.value,
        metadata={
            "reason": reason,
        },
        ip_address=_client_ip(
            request
        ),
        admin_session_id=(
            exc.admin_session_id
        ),
        request_id=_request_id(
            request
        ),
        user_agent=_user_agent(
            request
        ),
        outcome="failure",
    )

    await session.commit()


async def _record_admin_security_denial(
    session: AsyncSession,
    *,
    request: Request,
    current: ValidatedAdminSession,
    action: AuditAction,
    reason: str,
) -> None:
    """
    Record a security denial for an already-authenticated
    administrator session.

    No authentication credentials or secret assurance material
    are written to audit metadata.
    """

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(
            current.admin.id
        ),
        action=action.value,
        metadata={
            "reason": reason,
        },
        ip_address=_client_ip(
            request
        ),
        admin_session_id=(
            current.session.id
        ),
        request_id=_request_id(
            request
        ),
        user_agent=_user_agent(
            request
        ),
        outcome="failure",
    )

    await session.commit()


# ============================================================
# ADMIN SESSION
# ============================================================


async def get_current_admin_session(
    request: Request,
    session: DatabaseSession,
    admin_session_token: Annotated[
        str | None,
        Cookie(
            alias=(
                get_admin_session_cookie_name()
            ),
        ),
    ] = None,
) -> ValidatedAdminSession:
    """
    Authenticate an administrator using the server-managed
    BAKABOOST administrator session.

    External OIDC bearer tokens are not accepted as the final
    authentication boundary for protected administrator
    routes.

    Successful validation persists the session activity touch
    before the protected route executes.

    Automatic expiry/security invalidation is persisted and
    audited in a fresh transaction after rollback.
    """

    if not admin_session_token:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        )

    try:
        validated = (
            await get_valid_admin_session(
                session,
                raw_token=(
                    admin_session_token
                ),
                touch=True,
            )
        )

        #
        # get_valid_admin_session(touch=True) updates
        # last_seen_at but deliberately does not commit.
        #
        # Commit here because this dependency is the common
        # authentication boundary for protected admin routes.
        #
        await session.commit()

    except InvalidAdminSessionError as exc:
        #
        # Always discard the failed validation transaction
        # before attempting persistent security invalidation.
        #
        await session.rollback()

        await _persist_admin_session_invalidation(
            session,
            request=request,
            exc=exc,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        ) from exc

    except AdminSessionError as exc:
        await session.rollback()

        #
        # Configuration/internal administrator-session errors
        # remain generic to the client.
        #
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        ) from exc

    return validated


CurrentAdminSession = Annotated[
    ValidatedAdminSession,
    Depends(get_current_admin_session),
]


# ============================================================
# CURRENT ADMIN
# ============================================================


async def get_current_admin(
    current: CurrentAdminSession,
) -> Admin:
    return current.admin


CurrentAdmin = Annotated[
    Admin,
    Depends(get_current_admin),
]


# ============================================================
# ADMIN CSRF
# ============================================================


async def require_admin_csrf(
    request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
    csrf_cookie: Annotated[
        str | None,
        Cookie(
            alias=(
                get_admin_csrf_cookie_name()
            ),
        ),
    ] = None,
    csrf_header: Annotated[
        str | None,
        Header(
            alias=(
                settings
                .admin_csrf_header_name
            ),
        ),
    ] = None,
) -> None:
    """
    Validate CSRF material against the authenticated
    server-side administrator session.

    CSRF failures are security-relevant and therefore audited.
    """

    try:
        validate_admin_session_csrf(
            current.session,
            cookie_token=csrf_cookie,
            header_token=csrf_header,
        )

    except InvalidAdminSessionError as exc:
        await session.rollback()

        await _record_admin_security_denial(
            session,
            request=request,
            current=current,
            action=(
                AuditAction
                .ADMIN_CSRF_DENIED
            ),
            reason=(
                exc.reason
                or "csrf_validation_failed"
            ),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Invalid request verification."
            ),
        ) from exc


AdminCSRF = Annotated[
    None,
    Depends(require_admin_csrf),
]


# ============================================================
# ADMIN PERMISSIONS
# ============================================================


def require_permission(
    permission: Permission,
):
    async def dependency(
        admin: CurrentAdmin,
    ) -> Admin:
        if not role_has_permission(
            admin.role,
            permission,
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Insufficient permissions."
                ),
            )

        return admin

    return dependency


# ============================================================
# SENSITIVE ADMIN AUTHENTICATION
# ============================================================


def _development_admin_step_up_bypass_enabled() -> bool:
    """
    Explicit local-development compatibility only.

    The bypass exists solely for the dedicated development
    administrator authentication mode.

    Production runtime validation forbids development
    administrator authentication entirely.
    """

    environment = (
        str(settings.app_environment)
        .strip()
        .lower()
    )

    return (
        environment == "development"
        and settings.dev_admin_auth_enabled
    )


async def get_sensitive_admin(
    request: Request,
    session: DatabaseSession,
    current: CurrentAdminSession,
) -> Admin:
    """
    Resolve an administrator for sensitive operations.

    Authentication assurance is established when the
    administrator enters the Cloudflare Access protected admin
    application and BAKABOOST creates a valid server-managed
    administrator session.

    Sensitive operations continue to require:

    - a valid, non-expired server-managed administrator session;
    - an active administrator account;
    - current security/session version;
    - CSRF validation through require_sensitive_permission();
    - role-based permission enforcement;
    - route/service-level audit logging.

    A separate Cloudflare step-up ceremony is intentionally not
    required for every sensitive administrator action.
    """

    return current.admin


# ============================================================
# SENSITIVE ADMIN PERMISSIONS
# ============================================================


def require_sensitive_permission(
    permission: Permission,
):
    async def dependency(
        admin: Annotated[
            Admin,
            Depends(get_sensitive_admin),
        ],
        _csrf: AdminCSRF = None,
    ) -> Admin:
        if not role_has_permission(
            admin.role,
            permission,
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Insufficient permissions."
                ),
            )

        return admin

    return dependency


# ============================================================
# VERIFICATION SESSION
# ============================================================


async def get_verification_session(
    session: DatabaseSession,
    verification_session: Annotated[
        str | None,
        Cookie(),
    ] = None,
) -> VerificationSession:
    if not verification_session:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Verification authentication "
                "required."
            ),
        )

    try:
        current_session = (
            await get_valid_verification_session(
                session,
                raw_token=verification_session,
            )
        )

    except (
        InvalidVerificationSessionError
    ) as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Verification authentication "
                "required."
            ),
        ) from exc

    return current_session


# ============================================================
# VERIFICATION CSRF
# ============================================================


async def require_verification_csrf(
    verification_csrf: Annotated[
        str | None,
        Cookie(
            alias=settings.csrf_cookie_name,
        ),
    ] = None,
    csrf_header: Annotated[
        str | None,
        Header(
            alias=settings.csrf_header_name,
        ),
    ] = None,
) -> None:
    try:
        validate_csrf_token(
            cookie_token=verification_csrf,
            header_token=csrf_header,
        )

    except CSRFValidationError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Invalid request verification."
            ),
        ) from exc


# ============================================================
# MOBILE CAPTURE SESSION
# ============================================================


async def get_mobile_capture_session(
    session: DatabaseSession,
    mobile_capture_session: Annotated[
        str | None,
        Cookie(
            alias=(
                settings
                .mobile_capture_cookie_name
            ),
        ),
    ] = None,
) -> MobileCaptureSession:
    if not mobile_capture_session:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Mobile capture authentication "
                "required."
            ),
        )

    try:
        current_session = (
            await get_valid_mobile_capture_session(
                session,
                raw_mobile_token=(
                    mobile_capture_session
                ),
            )
        )

    except (
        InvalidMobileCaptureSessionError
    ) as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Mobile capture authentication "
                "required."
            ),
        ) from exc

    return current_session