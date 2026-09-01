from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.admin import Admin
from app.db.models.admin_session import AdminSession

# ============================================================
# EXCEPTIONS
# ============================================================


class AdminSessionError(Exception):
    """Base administrator-session failure."""


class InvalidAdminSessionError(AdminSessionError):
    """
    Administrator session is absent or invalid.

    When validation reached a persistent session row, safe
    database identifiers may be attached to the exception.

    Raw session credentials, CSRF credentials, token hashes,
    OIDC tokens and authentication secrets must never be
    attached to these exceptions.
    """

    def __init__(
        self,
        message: str,
        *,
        admin_id: uuid.UUID | None = None,
        admin_session_id: uuid.UUID | None = None,
        reason: str | None = None,
        requires_revocation: bool = False,
    ) -> None:
        super().__init__(message)

        self.admin_id = admin_id
        self.admin_session_id = admin_session_id
        self.reason = reason
        self.requires_revocation = requires_revocation


class ExpiredAdminSessionError(
    InvalidAdminSessionError
):
    """Administrator session exceeded an allowed lifetime."""


class RevokedAdminSessionError(
    InvalidAdminSessionError
):
    """Administrator session has already been revoked."""


class AdminSessionSecurityChangedError(
    InvalidAdminSessionError
):
    """
    Administrator security state changed after this session
    was created.
    """


class AdminSessionConfigurationError(
    AdminSessionError
):
    """Administrator session configuration is unsafe."""


# ============================================================
# RESULT OBJECTS
# ============================================================


@dataclass(frozen=True)
class CreatedAdminSession:
    """
    Raw credentials returned only at session creation/rotation.

    raw_token:
        Secret authentication credential intended for an
        HttpOnly browser cookie.

    csrf_token:
        Separate CSRF credential. It is not an authentication
        credential.

    session:
        Persistent server-side administrator session.
    """

    raw_token: str
    csrf_token: str
    session: AdminSession


@dataclass(frozen=True)
class ValidatedAdminSession:
    """
    Successfully validated administrator and session pair.
    """

    admin: Admin
    session: AdminSession


# ============================================================
# INTERNAL HELPERS
# ============================================================


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _normalized_environment() -> str:
    return (
        str(settings.app_environment)
        .strip()
        .lower()
    )


def _is_production() -> bool:
    return (
        _normalized_environment()
        == "production"
    )


def _validate_session_configuration() -> None:
    """
    Fail closed for unsafe administrator-session security
    configuration.
    """

    if settings.admin_session_token_bytes < 32:
        raise AdminSessionConfigurationError(
            "Administrator session token size is unsafe."
        )

    if settings.admin_csrf_token_bytes < 32:
        raise AdminSessionConfigurationError(
            "Administrator CSRF token size is unsafe."
        )

    if (
        settings.admin_session_idle_timeout_seconds
        <= 0
    ):
        raise AdminSessionConfigurationError(
            "Administrator idle timeout is invalid."
        )

    if (
        settings
        .admin_session_absolute_lifetime_seconds
        <= 0
    ):
        raise AdminSessionConfigurationError(
            "Administrator absolute session lifetime "
            "is invalid."
        )

    if (
        settings
        .admin_session_absolute_lifetime_seconds
        <
        settings
        .admin_session_idle_timeout_seconds
    ):
        raise AdminSessionConfigurationError(
            "Administrator absolute session lifetime "
            "cannot be shorter than the idle timeout."
        )

    if (
        settings
        .admin_session_rotation_interval_seconds
        <= 0
    ):
        raise AdminSessionConfigurationError(
            "Administrator session rotation interval "
            "is invalid."
        )

    if settings.admin_max_active_sessions <= 0:
        raise AdminSessionConfigurationError(
            "Administrator active-session limit is invalid."
        )

    #
    # Production administrator cookies must be Secure.
    #
    if (
        _is_production()
        and not settings.cookie_secure
    ):
        raise AdminSessionConfigurationError(
            "Secure administrator cookies are required "
            "in production."
        )

    #
    # __Host- cookies MUST NOT carry a Domain attribute.
    #
    if (
        _is_production()
        and settings.cookie_domain is not None
        and settings.cookie_domain.strip()
    ):
        raise AdminSessionConfigurationError(
            "Administrator __Host- cookies cannot use "
            "a Domain attribute."
        )


def _hash_secret(
    raw_value: str,
) -> str:
    """
    Hash a high-entropy random credential before persistence.

    Administrator session and CSRF credentials are generated
    by this application with at least 256 bits of entropy.

    SHA-256 therefore provides deterministic lookup/storage
    without retaining the raw credential.
    """

    if not isinstance(
        raw_value,
        str,
    ):
        raise InvalidAdminSessionError(
            "Invalid administrator session.",
            reason="invalid_credential",
        )

    normalized = raw_value.strip()

    if not normalized:
        raise InvalidAdminSessionError(
            "Invalid administrator session.",
            reason="invalid_credential",
        )

    return hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()


def _generate_session_token() -> str:
    _validate_session_configuration()

    return secrets.token_urlsafe(
        settings.admin_session_token_bytes
    )


def _generate_csrf_token() -> str:
    _validate_session_configuration()

    return secrets.token_urlsafe(
        settings.admin_csrf_token_bytes
    )


def get_admin_session_cookie_name() -> str:
    """
    Production receives a __Host- cookie.

    Local HTTP development uses a non-__Host cookie because
    __Host- requires Secure.
    """

    if _is_production():
        return settings.admin_session_cookie_name

    return (
        settings
        .admin_session_development_cookie_name
    )


def get_admin_csrf_cookie_name() -> str:
    if _is_production():
        return settings.admin_csrf_cookie_name

    return (
        settings
        .admin_csrf_development_cookie_name
    )


def admin_session_cookie_secure() -> bool:
    """
    Production always requires Secure cookies.

    Development follows configured behavior so localhost HTTP
    remains usable.
    """

    _validate_session_configuration()

    if _is_production():
        return True

    return bool(settings.cookie_secure)


def _normalize_ip_address(
    value: str | None,
) -> str | None:
    if not settings.admin_session_track_ip:
        return None

    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    #
    # Maximum normal textual IPv6 representation.
    #
    return normalized[:45]


def _normalize_user_agent(
    value: str | None,
) -> str | None:
    if not (
        settings
        .admin_session_track_user_agent
    ):
        return None

    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    return normalized[:512]


def _normalize_revocation_reason(
    reason: str,
) -> str:
    normalized = reason.strip()

    if not normalized:
        normalized = "unspecified"

    return normalized[:255]


def _mark_session_revoked(
    admin_session: AdminSession,
    *,
    now: datetime,
    reason: str,
) -> bool:
    """
    Mark one session revoked in memory.

    Returns True only when the session changed.

    Database persistence remains the responsibility of the
    calling service operation/transaction.
    """

    if (
        admin_session.is_revoked
        or admin_session.revoked_at is not None
    ):
        return False

    admin_session.is_revoked = True
    admin_session.revoked_at = now
    admin_session.revoke_reason = (
        _normalize_revocation_reason(
            reason
        )
    )

    return True


# ============================================================
# SESSION CREATION
# ============================================================


async def create_admin_session(
    session: AsyncSession,
    *,
    admin: Admin,
    authenticated_at: datetime,
    mfa_verified_at: datetime | None = None,
    phishing_resistant_verified_at: (
        datetime | None
    ) = None,
    auth_method: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> CreatedAdminSession:
    """
    Create a new server-managed administrator session.

    External authentication alone does not grant local
    administrator access. The caller must already have
    resolved an explicitly provisioned active Admin row.

    This function deliberately does NOT commit.
    """

    _validate_session_configuration()

    if not admin.is_active:
        raise InvalidAdminSessionError(
            "Administrator account is not active.",
            admin_id=admin.id,
            reason="admin_disabled",
        )

    now = _utc_now()

    if authenticated_at.tzinfo is None:
        raise AdminSessionError(
            "Administrator authentication timestamp "
            "must be timezone-aware."
        )

    normalized_authenticated_at = (
        authenticated_at.astimezone(UTC)
    )

    if normalized_authenticated_at > (
        now + timedelta(seconds=60)
    ):
        raise AdminSessionError(
            "Administrator authentication timestamp "
            "is invalid."
        )

    raw_token = _generate_session_token()
    csrf_token = _generate_csrf_token()

    expires_at = now + timedelta(
        seconds=(
            settings
            .admin_session_absolute_lifetime_seconds
        )
    )

    normalized_auth_method: str | None = None

    if auth_method is not None:
        candidate = auth_method.strip()

        if candidate:
            normalized_auth_method = (
                candidate[:80]
            )

    admin_session = AdminSession(
        admin_id=admin.id,
        token_hash=_hash_secret(
            raw_token
        ),
        csrf_token_hash=_hash_secret(
            csrf_token
        ),
        security_version=(
            admin.security_version
        ),
        authenticated_at=(
            normalized_authenticated_at
        ),
        mfa_verified_at=mfa_verified_at,
        phishing_resistant_verified_at=(
            phishing_resistant_verified_at
        ),
        auth_method=normalized_auth_method,
        created_at=now,
        last_seen_at=now,
        expires_at=expires_at,
        rotated_at=None,
        revoked_at=None,
        revoke_reason=None,
        is_revoked=False,
        ip_address=(
            _normalize_ip_address(
                ip_address
            )
        ),
        user_agent=(
            _normalize_user_agent(
                user_agent
            )
        ),
    )

    session.add(
        admin_session
    )

    #
    # Flush so:
    #
    # - the persistent UUID exists;
    # - uniqueness/database failures occur before credentials
    #   are returned;
    # - the active-session limiter can preserve this record.
    #
    await session.flush()

    await _enforce_active_session_limit(
        session,
        admin_id=admin.id,
        preserve_session_id=(
            admin_session.id
        ),
        now=now,
    )

    admin.last_login_at = now

    await session.flush()

    return CreatedAdminSession(
        raw_token=raw_token,
        csrf_token=csrf_token,
        session=admin_session,
    )


# ============================================================
# SESSION LOOKUP / VALIDATION
# ============================================================


async def get_valid_admin_session(
    session: AsyncSession,
    *,
    raw_token: str,
    touch: bool = True,
) -> ValidatedAdminSession:
    """
    Validate a server-managed administrator session.

    Validation checks:

    - credential maps to a session
    - session has not already been revoked
    - absolute lifetime
    - idle lifetime
    - administrator remains active
    - administrator security-version binding

    IMPORTANT TRANSACTION CONTRACT
    ------------------------------

    Failure detection deliberately does NOT mutate persistent
    revocation state before raising.

    HTTP authentication callers commonly need to roll back
    their current transaction before recording a security
    failure. Mutating + flushing here before raising would
    therefore allow that revocation to disappear when the
    caller rolls back.

    Instead, resolved failures carry only:

    - admin_id
    - admin_session_id
    - safe reason
    - requires_revocation

    The HTTP/security boundary can then:

    1. roll back;
    2. revoke by persistent session ID in a fresh transaction;
    3. record its audit event;
    4. commit both atomically.

    No raw credentials are attached to exceptions.

    Successful touch=True validation updates last_seen_at but
    deliberately does NOT commit. The caller owns that
    transaction.

    Route-specific RBAC, CSRF and sensitive-action assurance
    checks remain outside this function.
    """

    _validate_session_configuration()

    token_hash = _hash_secret(
        raw_token
    )

    result = await session.execute(
        select(
            AdminSession,
            Admin,
        )
        .join(
            Admin,
            Admin.id
            == AdminSession.admin_id,
        )
        .where(
            AdminSession.token_hash
            == token_hash
        )
    )

    row = result.one_or_none()

    if row is None:
        raise InvalidAdminSessionError(
            "Invalid administrator session.",
            reason="unknown_session",
        )

    admin_session, admin = row

    now = _utc_now()

    admin_id = admin.id
    admin_session_id = (
        admin_session.id
    )

    if (
        admin_session.is_revoked
        or admin_session.revoked_at is not None
    ):
        raise RevokedAdminSessionError(
            "Administrator session has been revoked.",
            admin_id=admin_id,
            admin_session_id=(
                admin_session_id
            ),
            reason=(
                admin_session.revoke_reason
                or "already_revoked"
            ),
            requires_revocation=False,
        )

    if admin_session.expires_at <= now:
        raise ExpiredAdminSessionError(
            "Administrator session has expired.",
            admin_id=admin_id,
            admin_session_id=(
                admin_session_id
            ),
            reason="absolute_expiry",
            requires_revocation=True,
        )

    idle_deadline = (
        admin_session.last_seen_at
        + timedelta(
            seconds=(
                settings
                .admin_session_idle_timeout_seconds
            )
        )
    )

    if idle_deadline <= now:
        raise ExpiredAdminSessionError(
            "Administrator session has expired.",
            admin_id=admin_id,
            admin_session_id=(
                admin_session_id
            ),
            reason="idle_timeout",
            requires_revocation=True,
        )

    if not admin.is_active:
        raise InvalidAdminSessionError(
            "Administrator account is not active.",
            admin_id=admin_id,
            admin_session_id=(
                admin_session_id
            ),
            reason="admin_disabled",
            requires_revocation=True,
        )

    if (
        admin_session.security_version
        != admin.security_version
    ):
        raise (
            AdminSessionSecurityChangedError(
                "Administrator security state changed.",
                admin_id=admin_id,
                admin_session_id=(
                    admin_session_id
                ),
                reason=(
                    "security_state_changed"
                ),
                requires_revocation=True,
            )
        )

    if touch:
        admin_session.last_seen_at = now

        await session.flush()

    return ValidatedAdminSession(
        admin=admin,
        session=admin_session,
    )


# ============================================================
# CSRF VALIDATION
# ============================================================


def validate_admin_session_csrf(
    admin_session: AdminSession,
    *,
    cookie_token: str | None,
    header_token: str | None,
) -> None:
    """
    Validate browser CSRF material against the authenticated
    persistent administrator session.

    Both browser-visible values must match each other and the
    digest persisted on the authenticated session.
    """

    error_context = {
        "admin_id": (
            admin_session.admin_id
        ),
        "admin_session_id": (
            admin_session.id
        ),
        "reason": (
            "csrf_validation_failed"
        ),
        "requires_revocation": False,
    }

    if (
        not cookie_token
        or not header_token
    ):
        raise InvalidAdminSessionError(
            "Invalid administrator request verification.",
            **error_context,
        )

    normalized_cookie = (
        cookie_token.strip()
    )

    normalized_header = (
        header_token.strip()
    )

    if (
        not normalized_cookie
        or not normalized_header
    ):
        raise InvalidAdminSessionError(
            "Invalid administrator request verification.",
            **error_context,
        )

    if not hmac.compare_digest(
        normalized_cookie,
        normalized_header,
    ):
        raise InvalidAdminSessionError(
            "Invalid administrator request verification.",
            **error_context,
        )

    supplied_hash = _hash_secret(
        normalized_cookie
    )

    if not hmac.compare_digest(
        supplied_hash,
        admin_session.csrf_token_hash,
    ):
        raise InvalidAdminSessionError(
            "Invalid administrator request verification.",
            **error_context,
        )


# ============================================================
# CSRF ROTATION
# ============================================================


async def rotate_admin_csrf_token(
    session: AsyncSession,
    *,
    admin_session: AdminSession,
) -> str:
    """
    Replace the CSRF credential bound to an existing
    administrator session.

    The raw CSRF value is not an authentication credential,
    but only its SHA-256 digest is persisted.

    This function deliberately does NOT commit.
    """

    _validate_session_configuration()

    if (
        admin_session.is_revoked
        or admin_session.revoked_at is not None
    ):
        raise RevokedAdminSessionError(
            "Administrator session has been revoked.",
            admin_id=(
                admin_session.admin_id
            ),
            admin_session_id=(
                admin_session.id
            ),
            reason=(
                admin_session.revoke_reason
                or "already_revoked"
            ),
        )

    now = _utc_now()

    if admin_session.expires_at <= now:
        raise ExpiredAdminSessionError(
            "Administrator session has expired.",
            admin_id=(
                admin_session.admin_id
            ),
            admin_session_id=(
                admin_session.id
            ),
            reason="absolute_expiry",
            requires_revocation=True,
        )

    csrf_token = (
        _generate_csrf_token()
    )

    admin_session.csrf_token_hash = (
        _hash_secret(
            csrf_token
        )
    )

    await session.flush()

    return csrf_token


# ============================================================
# SESSION ROTATION
# ============================================================


def admin_session_rotation_due(
    admin_session: AdminSession,
    *,
    now: datetime | None = None,
) -> bool:
    current_time = (
        now or _utc_now()
    )

    if current_time.tzinfo is None:
        raise AdminSessionError(
            "Administrator session rotation timestamp "
            "must be timezone-aware."
        )

    normalized_current_time = (
        current_time.astimezone(
            UTC
        )
    )

    reference_time = (
        admin_session.rotated_at
        or admin_session.created_at
    )

    return (
        normalized_current_time
        - reference_time
    ).total_seconds() >= (
        settings
        .admin_session_rotation_interval_seconds
    )


async def rotate_admin_session(
    session: AsyncSession,
    *,
    admin_session: AdminSession,
) -> CreatedAdminSession:
    """
    Rotate authentication and CSRF credentials while
    preserving the same persistent session record.

    Old credentials become unusable after the caller commits.

    This function deliberately does NOT commit.
    """

    _validate_session_configuration()

    if (
        admin_session.is_revoked
        or admin_session.revoked_at is not None
    ):
        raise RevokedAdminSessionError(
            "Administrator session has been revoked.",
            admin_id=(
                admin_session.admin_id
            ),
            admin_session_id=(
                admin_session.id
            ),
            reason=(
                admin_session.revoke_reason
                or "already_revoked"
            ),
        )

    now = _utc_now()

    if admin_session.expires_at <= now:
        raise ExpiredAdminSessionError(
            "Administrator session has expired.",
            admin_id=(
                admin_session.admin_id
            ),
            admin_session_id=(
                admin_session.id
            ),
            reason="absolute_expiry",
            requires_revocation=True,
        )

    raw_token = (
        _generate_session_token()
    )

    csrf_token = (
        _generate_csrf_token()
    )

    admin_session.token_hash = (
        _hash_secret(
            raw_token
        )
    )

    admin_session.csrf_token_hash = (
        _hash_secret(
            csrf_token
        )
    )

    admin_session.rotated_at = now
    admin_session.last_seen_at = now

    await session.flush()

    return CreatedAdminSession(
        raw_token=raw_token,
        csrf_token=csrf_token,
        session=admin_session,
    )


# ============================================================
# REVOCATION
# ============================================================


async def revoke_admin_session(
    session: AsyncSession,
    *,
    admin_session: AdminSession,
    reason: str = "logout",
) -> None:
    """
    Revoke one persistent administrator session.

    This function deliberately does NOT commit.
    """

    changed = _mark_session_revoked(
        admin_session,
        now=_utc_now(),
        reason=reason,
    )

    if changed:
        await session.flush()


async def revoke_admin_session_by_id(
    session: AsyncSession,
    *,
    admin_session_id: uuid.UUID,
    admin_id: uuid.UUID | None = None,
    reason: str,
) -> bool:
    """
    Re-fetch and revoke a session using only its persistent
    UUID.

    This exists primarily for authentication-failure handling:

        validation fails
        -> caller rolls back
        -> caller re-fetches session by UUID
        -> revocation + audit event
        -> caller commits

    The optional admin_id creates an additional binding check.

    Returns True only when this call changed persistent
    revocation state.

    This function deliberately does NOT commit.
    """

    query = (
        select(AdminSession)
        .where(
            AdminSession.id
            == admin_session_id
        )
        .with_for_update()
    )

    if admin_id is not None:
        query = query.where(
            AdminSession.admin_id
            == admin_id
        )

    result = await session.execute(
        query
    )

    admin_session = (
        result.scalar_one_or_none()
    )

    if admin_session is None:
        return False

    changed = _mark_session_revoked(
        admin_session,
        now=_utc_now(),
        reason=reason,
    )

    if changed:
        await session.flush()

    return changed


async def revoke_admin_session_by_token(
    session: AsyncSession,
    *,
    raw_token: str,
    reason: str = "logout",
) -> bool:
    """
    Revoke a session by its raw authentication credential.

    The credential is hashed before database lookup and never
    persisted in raw form.

    Returns True only when revocation state changed.

    This function deliberately does NOT commit.
    """

    token_hash = _hash_secret(
        raw_token
    )

    result = await session.execute(
        select(AdminSession)
        .where(
            AdminSession.token_hash
            == token_hash
        )
        .with_for_update()
    )

    admin_session = (
        result.scalar_one_or_none()
    )

    #
    # Logout/revocation by unknown token is idempotent.
    #
    if admin_session is None:
        return False

    changed = _mark_session_revoked(
        admin_session,
        now=_utc_now(),
        reason=reason,
    )

    if changed:
        await session.flush()

    return changed


async def revoke_all_admin_sessions(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
    reason: str = "revoke_all",
    except_session_id: (
        uuid.UUID | None
    ) = None,
) -> int:
    """
    Revoke all currently usable sessions for one admin.

    Returns the number of records changed.

    This function deliberately does NOT commit.
    """

    now = _utc_now()

    result = await session.execute(
        select(AdminSession)
        .where(
            AdminSession.admin_id
            == admin_id,
            AdminSession.is_revoked.is_(
                False
            ),
            AdminSession.revoked_at.is_(
                None
            ),
            AdminSession.expires_at
            > now,
        )
        .with_for_update()
    )

    admin_sessions = list(
        result.scalars().all()
    )

    changed = 0

    for admin_session in admin_sessions:
        if (
            except_session_id is not None
            and admin_session.id
            == except_session_id
        ):
            continue

        if _mark_session_revoked(
            admin_session,
            now=now,
            reason=reason,
        ):
            changed += 1

    if changed:
        await session.flush()

    return changed


# ============================================================
# SECURITY-VERSION INVALIDATION
# ============================================================


async def invalidate_admin_security_state(
    session: AsyncSession,
    *,
    admin: Admin,
    reason: str = "security_state_changed",
) -> None:
    """
    Increment the administrator security version and revoke
    existing sessions.

    Call after role changes, account disable/re-enable,
    authenticator/recovery changes, and explicit account-level
    security resets.

    This function deliberately does NOT commit.
    """

    admin.security_version += 1
    admin.security_updated_at = (
        _utc_now()
    )

    await revoke_all_admin_sessions(
        session,
        admin_id=admin.id,
        reason=reason,
    )

    await session.flush()


# ============================================================
# ACTIVE SESSION LIMIT
# ============================================================


async def _enforce_active_session_limit(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
    preserve_session_id: uuid.UUID,
    now: datetime,
) -> None:
    """
    Keep only the configured number of newest usable sessions.

    The newly-created session is always preserved.

    Revocations remain inside the caller's transaction.
    """

    result = await session.execute(
        select(AdminSession)
        .where(
            AdminSession.admin_id
            == admin_id,
            AdminSession.is_revoked.is_(
                False
            ),
            AdminSession.revoked_at.is_(
                None
            ),
            AdminSession.expires_at
            > now,
        )
        .order_by(
            AdminSession.created_at.desc(),
            AdminSession.id.desc(),
        )
    )

    active_sessions = list(
        result.scalars().all()
    )

    maximum = (
        settings.admin_max_active_sessions
    )

    if (
        len(active_sessions)
        <= maximum
    ):
        return

    keep_ids: set[uuid.UUID] = {
        preserve_session_id
    }

    for candidate in active_sessions:
        if (
            len(keep_ids)
            >= maximum
        ):
            break

        keep_ids.add(
            candidate.id
        )

    changed = False

    for candidate in active_sessions:
        if candidate.id in keep_ids:
            continue

        if _mark_session_revoked(
            candidate,
            now=now,
            reason="active_session_limit",
        ):
            changed = True

    if changed:
        await session.flush()


# ============================================================
# SESSION INFORMATION
# ============================================================


async def count_active_admin_sessions(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
) -> int:
    now = _utc_now()

    result = await session.execute(
        select(
            func.count(
                AdminSession.id
            )
        ).where(
            AdminSession.admin_id
            == admin_id,
            AdminSession.is_revoked.is_(
                False
            ),
            AdminSession.revoked_at.is_(
                None
            ),
            AdminSession.expires_at
            > now,
        )
    )

    return int(
        result.scalar_one()
    )