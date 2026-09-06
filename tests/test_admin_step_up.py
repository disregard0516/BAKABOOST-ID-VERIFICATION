from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response
from starlette.requests import Request

from app.api.routes.admin import (
    auth as admin_auth_route,
)
from app.core.constants import (
    AdminRole,
    AuditAction,
)
from app.services.admin.auth import (
    AdminAuthenticationError,
    AdminIdentity,
)
from app.services.admin.session_service import (
    AdminSessionError,
    CreatedAdminSession,
    InvalidAdminSessionError,
    ValidatedAdminSession,
)

# ============================================================
# TEST CONSTANTS
# ============================================================


TEST_SUBJECT = (
    "cloudflare-access-admin-subject"
)

OTHER_SUBJECT = (
    "different-cloudflare-admin-subject"
)

TEST_EMAIL = (
    "admin@example.com"
)

TEST_SESSION_TOKEN = (
    "existing-admin-session-token"
)

TEST_CSRF_TOKEN = (
    "existing-admin-csrf-token"
)

TEST_STEP_UP_ASSERTION = (
    "dedicated-cloudflare-step-up-jwt"
)

ROTATED_SESSION_TOKEN = (
    "rotated-admin-session-token"
)

ROTATED_CSRF_TOKEN = (
    "rotated-admin-csrf-token"
)


# ============================================================
# FAKE DATABASE
# ============================================================


class FakeDatabaseSession:
    def __init__(self) -> None:
        self.commit_count = 0
        self.rollback_count = 0

    async def commit(self) -> None:
        self.commit_count += 1

    async def rollback(self) -> None:
        self.rollback_count += 1


# ============================================================
# TEST BUILDERS
# ============================================================


def build_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": (
                "/admin/auth/step-up"
            ),
            "headers": [
                (
                    b"user-agent",
                    b"BAKABOOST-Step-Up-Test",
                ),
            ],
            "client": (
                "127.0.0.1",
                12345,
            ),
            "state": {
                "request_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            },
        }
    )


def build_admin(
    *,
    subject: str = TEST_SUBJECT,
):
    return SimpleNamespace(
        id=uuid4(),
        auth_subject=subject,
        email=TEST_EMAIL,
        display_name="Test Admin",
        role=AdminRole.ADMIN,
        is_active=True,
    )


def build_admin_session(
    *,
    admin_id,
):
    now = datetime.now(
        UTC
    )

    return SimpleNamespace(
        id=uuid4(),
        admin_id=admin_id,
        authenticated_at=(
            now - timedelta(
                minutes=30
            )
        ),
        mfa_verified_at=None,
        phishing_resistant_verified_at=None,
        auth_method="cloudflare_access",
        expires_at=(
            now + timedelta(
                hours=4
            )
        ),
        is_revoked=False,
        revoked_at=None,
        revoke_reason=None,
        rotated_at=None,
        last_seen_at=now,
    )


def build_validated_session():
    admin = build_admin()

    admin_session = (
        build_admin_session(
            admin_id=admin.id,
        )
    )

    return ValidatedAdminSession(
        admin=admin,
        session=admin_session,
    )


def build_step_up_identity(
    *,
    subject: str = TEST_SUBJECT,
) -> AdminIdentity:
    return AdminIdentity(
        subject=subject,
        email=TEST_EMAIL,
        claims={
            "sub": subject,
            "email": TEST_EMAIL,
            "type": "app",
        },
    )


# ============================================================
# SUCCESSFUL STEP-UP
# ============================================================


@pytest.mark.asyncio
async def test_step_up_successfully_upgrades_and_rotates_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    A valid dedicated step-up assertion for the same immutable
    administrator identity must:

    - validate the existing session;
    - validate CSRF;
    - upgrade local MFA assurance;
    - update authenticated_at using local verification time;
    - never fabricate phishing-resistant assurance;
    - rotate auth and CSRF credentials;
    - preserve the same persistent session row;
    - audit step-up and rotation;
    - commit before returning replacement credentials.
    """

    db = FakeDatabaseSession()
    request = build_request()
    response = Response()

    validated = (
        build_validated_session()
    )

    original_session = (
        validated.session
    )

    original_authenticated_at = (
        original_session
        .authenticated_at
    )

    original_expires_at = (
        original_session
        .expires_at
    )

    observed: dict[
        str,
        object,
    ] = {}

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        assert session is db

        observed[
            "raw_session_token"
        ] = raw_token

        observed[
            "touch"
        ] = touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        assert (
            session
            is original_session
        )

        observed[
            "csrf_cookie"
        ] = cookie_token

        observed[
            "csrf_header"
        ] = header_token

    def fake_decode_step_up_token(
        raw_token: str,
    ) -> AdminIdentity:
        observed[
            "step_up_assertion"
        ] = raw_token

        return (
            build_step_up_identity()
        )

    async def fake_rotate_admin_session(
        session,
        *,
        admin_session,
    ) -> CreatedAdminSession:
        assert session is db

        assert (
            admin_session
            is original_session
        )

        observed[
            "rotation_called"
        ] = True

        return CreatedAdminSession(
            raw_token=(
                ROTATED_SESSION_TOKEN
            ),
            csrf_token=(
                ROTATED_CSRF_TOKEN
            ),
            session=admin_session,
        )

    audit_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_audit_event(
        session,
        **kwargs,
    ):
        assert session is db

        audit_calls.append(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        fake_decode_step_up_token,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "rotate_admin_session",
        fake_rotate_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "record_audit_event",
        fake_record_audit_event,
    )

    result = await (
        admin_auth_route
        .step_up_admin_session(
            request=request,
            response=response,
            db=db,  # type: ignore[arg-type]
            admin_session_token=(
                TEST_SESSION_TOKEN
            ),
            csrf_cookie=(
                TEST_CSRF_TOKEN
            ),
            csrf_header=(
                TEST_CSRF_TOKEN
            ),
            cloudflare_access_assertion=(
                TEST_STEP_UP_ASSERTION
            ),
        )
    )

    assert observed[
        "raw_session_token"
    ] == TEST_SESSION_TOKEN

    assert observed[
        "touch"
    ] is False

    assert observed[
        "csrf_cookie"
    ] == TEST_CSRF_TOKEN

    assert observed[
        "csrf_header"
    ] == TEST_CSRF_TOKEN

    assert observed[
        "step_up_assertion"
    ] == TEST_STEP_UP_ASSERTION

    assert observed[
        "rotation_called"
    ] is True

    # --------------------------------------------------------
    # Assurance upgrade
    # --------------------------------------------------------

    assert (
        original_session
        .authenticated_at
        > original_authenticated_at
    )

    assert (
        original_session
        .mfa_verified_at
        == original_session
        .authenticated_at
    )

    assert (
        original_session
        .authenticated_at
        .tzinfo
        is not None
    )

    assert (
        original_session
        .phishing_resistant_verified_at
        is None
    )

    assert (
        original_session
        .auth_method
        == "cloudflare_access_step_up"
    )

    # --------------------------------------------------------
    # Absolute lifetime must not be extended.
    # --------------------------------------------------------

    assert (
        original_session
        .expires_at
        == original_expires_at
    )

    # --------------------------------------------------------
    # Same persistent row retained.
    # --------------------------------------------------------

    assert (
        validated.session
        is original_session
    )

    # --------------------------------------------------------
    # Transaction
    # --------------------------------------------------------

    assert (
        db.commit_count
        == 1
    )

    assert (
        db.rollback_count
        == 0
    )

    # --------------------------------------------------------
    # Audit
    # --------------------------------------------------------

    assert len(
        audit_calls
    ) == 2

    assert (
        audit_calls[0][
            "action"
        ]
        == (
            AuditAction
            .ADMIN_STEP_UP_SUCCEEDED
            .value
        )
    )

    assert (
        audit_calls[0][
            "outcome"
        ]
        == "success"
    )

    assert (
        audit_calls[0][
            "metadata"
        ]
        == {
            "auth_method": (
                "cloudflare_access_step_up"
            ),
            "mfa_verified": True,
            "phishing_resistant_mfa": (
                False
            ),
        }
    )

    assert (
        audit_calls[1][
            "action"
        ]
        == (
            AuditAction
            .ADMIN_SESSION_ROTATED
            .value
        )
    )

    assert (
        audit_calls[1][
            "metadata"
        ]
        == {
            "reason": "step_up",
        }
    )

    # --------------------------------------------------------
    # Safe response
    # --------------------------------------------------------

    assert result[
        "authenticated"
    ] is True

    assert result[
        "step_up_verified"
    ] is True

    assert result[
        "mfa_verified"
    ] is True

    assert result[
        "phishing_resistant_mfa"
    ] is False

    assert (
        result["csrf_token"]
        == ROTATED_CSRF_TOKEN
    )

    #
    # Authentication credential must remain HttpOnly and must
    # never enter the JSON response.
    #
    assert (
        ROTATED_SESSION_TOKEN
        not in str(result)
    )

    assert (
        response.headers[
            "Cache-Control"
        ]
        == "no-store"
    )

    set_cookie_headers = (
        response.headers
        .getlist(
            "set-cookie"
        )
    )

    assert any(
        ROTATED_SESSION_TOKEN
        in header
        for header in set_cookie_headers
    )

    assert any(
        ROTATED_CSRF_TOKEN
        in header
        for header in set_cookie_headers
    )


# ============================================================
# SESSION REQUIREMENT
# ============================================================


@pytest.mark.asyncio
async def test_step_up_requires_existing_admin_session() -> None:
    db = FakeDatabaseSession()

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=None,
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 401
    )

    assert (
        exc_info.value.detail
        == "Authentication required."
    )

    assert (
        db.commit_count
        == 0
    )

    assert (
        db.rollback_count
        == 0
    )


# ============================================================
# CSRF
# ============================================================


@pytest.mark.asyncio
async def test_step_up_csrf_failure_is_rejected_and_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    csrf_error = (
        InvalidAdminSessionError(
            (
                "Invalid administrator "
                "request verification."
            ),
            admin_id=(
                validated.admin.id
            ),
            admin_session_id=(
                validated.session.id
            ),
            reason=(
                "csrf_validation_failed"
            ),
            requires_revocation=False,
        )
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

        raise csrf_error

    denial_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_denied(
        db_session,
        **kwargs,
    ) -> None:
        assert (
            db_session
            is db
        )

        denial_calls.append(
            kwargs
        )

    async def forbidden_decode(
        *args,
        **kwargs,
    ):
        del args
        del kwargs

        raise AssertionError(
            "Step-up assertion must not be "
            "decoded after CSRF failure."
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_record_denied_auth_event",
        fake_record_denied,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        forbidden_decode,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    "wrong-csrf"
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 403
    )

    assert (
        exc_info.value.detail
        == (
            "Invalid request verification."
        )
    )

    assert (
        db.rollback_count
        == 1
    )

    assert (
        db.commit_count
        == 0
    )

    assert len(
        denial_calls
    ) == 1

    assert (
        denial_calls[0][
            "action"
        ]
        == AuditAction.ADMIN_CSRF_DENIED
    )

    assert (
        denial_calls[0][
            "reason"
        ]
        == "csrf_validation_failed"
    )

    assert (
        denial_calls[0][
            "admin"
        ]
        is validated.admin
    )

    assert (
        denial_calls[0][
            "admin_session_id"
        ]
        == validated.session.id
    )


# ============================================================
# DEDICATED STEP-UP ASSERTION
# ============================================================


@pytest.mark.asyncio
async def test_step_up_missing_cloudflare_assertion_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

    denial_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_denied(
        db_session,
        **kwargs,
    ) -> None:
        assert (
            db_session
            is db
        )

        denial_calls.append(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_record_denied_auth_event",
        fake_record_denied,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=None,
            )
        )

    assert (
        exc_info.value.status_code
        == 403
    )

    assert (
        db.rollback_count
        == 1
    )

    assert len(
        denial_calls
    ) == 1

    assert (
        denial_calls[0][
            "action"
        ]
        == (
            AuditAction
            .ADMIN_STEP_UP_DENIED
        )
    )

    assert (
        denial_calls[0][
            "reason"
        ]
        == (
            "missing_cloudflare_"
            "step_up_assertion"
        )
    )


@pytest.mark.asyncio
async def test_invalid_step_up_assertion_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

    def fake_decode_step_up(
        raw_token: str,
    ):
        assert (
            raw_token
            == TEST_STEP_UP_ASSERTION
        )

        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    denial_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_denied(
        db_session,
        **kwargs,
    ) -> None:
        assert (
            db_session
            is db
        )

        denial_calls.append(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        fake_decode_step_up,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_record_denied_auth_event",
        fake_record_denied,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 403
    )

    assert (
        exc_info.value.detail
        == (
            "Additional administrator "
            "authentication failed."
        )
    )

    assert (
        db.rollback_count
        == 1
    )

    assert len(
        denial_calls
    ) == 1

    assert (
        denial_calls[0][
            "action"
        ]
        == (
            AuditAction
            .ADMIN_STEP_UP_DENIED
        )
    )

    assert (
        denial_calls[0][
            "reason"
        ]
        == (
            "step_up_authentication_denied"
        )
    )


# ============================================================
# IMMUTABLE IDENTITY BINDING
# ============================================================


@pytest.mark.asyncio
async def test_step_up_subject_must_match_current_admin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    A valid dedicated step-up assertion belonging to another
    administrator must never upgrade the current local
    session.
    """

    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    original_authenticated_at = (
        validated.session
        .authenticated_at
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

    def fake_decode_step_up(
        raw_token: str,
    ) -> AdminIdentity:
        del raw_token

        return (
            build_step_up_identity(
                subject=OTHER_SUBJECT,
            )
        )

    async def forbidden_rotation(
        *args,
        **kwargs,
    ):
        del args
        del kwargs

        raise AssertionError(
            "Mismatched identity attempted "
            "session rotation."
        )

    denial_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_denied(
        db_session,
        **kwargs,
    ) -> None:
        assert (
            db_session
            is db
        )

        denial_calls.append(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        fake_decode_step_up,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "rotate_admin_session",
        forbidden_rotation,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_record_denied_auth_event",
        fake_record_denied,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 403
    )

    assert (
        validated.session
        .authenticated_at
        == original_authenticated_at
    )

    assert (
        validated.session
        .mfa_verified_at
        is None
    )

    assert (
        validated.session
        .phishing_resistant_verified_at
        is None
    )

    assert (
        db.rollback_count
        == 1
    )

    assert len(
        denial_calls
    ) == 1

    assert (
        denial_calls[0][
            "reason"
        ]
        == "step_up_subject_mismatch"
    )


# ============================================================
# INVALID / EXPIRED LOCAL SESSION
# ============================================================


@pytest.mark.asyncio
async def test_expired_session_is_persistently_invalidated_before_step_up(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabaseSession()

    admin_id = uuid4()
    admin_session_id = uuid4()

    validation_error = (
        InvalidAdminSessionError(
            (
                "Administrator session "
                "expired."
            ),
            admin_id=admin_id,
            admin_session_id=(
                admin_session_id
            ),
            reason="absolute_expiry",
            requires_revocation=True,
        )
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        assert (
            session is db
        )

        assert (
            raw_token
            == TEST_SESSION_TOKEN
        )

        assert (
            touch is False
        )

        raise validation_error

    invalidation_calls: list[
        InvalidAdminSessionError
    ] = []

    async def fake_persist_invalidation(
        session,
        *,
        request,
        exc,
    ) -> None:
        assert (
            session is db
        )

        assert (
            request.state.request_id
        )

        invalidation_calls.append(
            exc
        )

    async def forbidden_decode(
        *args,
        **kwargs,
    ):
        del args
        del kwargs

        raise AssertionError(
            "Expired local session attempted "
            "Cloudflare step-up decoding."
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_persist_invalid_admin_session",
        fake_persist_invalidation,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        forbidden_decode,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 401
    )

    assert (
        exc_info.value.detail
        == "Authentication required."
    )

    assert (
        db.rollback_count
        == 1
    )

    assert (
        db.commit_count
        == 0
    )

    assert (
        invalidation_calls
        == [
            validation_error
        ]
    )


# ============================================================
# ROTATION FAILURE
# ============================================================


@pytest.mark.asyncio
async def test_step_up_rotation_failure_rolls_back_assurance_upgrade(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    A rotation failure must fail the step-up request and must
    not return replacement credentials.

    The real SQLAlchemy transaction rollback restores the
    persisted row. This unit test verifies that rollback is
    invoked and no successful response is produced.
    """

    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

    def fake_decode_step_up(
        raw_token: str,
    ) -> AdminIdentity:
        del raw_token

        return (
            build_step_up_identity()
        )

    async def fake_rotate_admin_session(
        session,
        *,
        admin_session,
    ):
        del session
        del admin_session

        raise AdminSessionError(
            "Rotation failed."
        )

    denial_calls: list[
        dict[str, object]
    ] = []

    async def fake_record_denied(
        db_session,
        **kwargs,
    ) -> None:
        assert (
            db_session is db
        )

        denial_calls.append(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        fake_decode_step_up,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "rotate_admin_session",
        fake_rotate_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "_record_denied_auth_event",
        fake_record_denied,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    assert (
        exc_info.value.status_code
        == 403
    )

    assert (
        exc_info.value.detail
        == (
            "Unable to complete "
            "administrator step-up."
        )
    )

    assert (
        db.rollback_count
        == 1
    )

    assert (
        db.commit_count
        == 0
    )

    assert len(
        denial_calls
    ) == 1

    assert (
        denial_calls[0][
            "action"
        ]
        == (
            AuditAction
            .ADMIN_STEP_UP_DENIED
        )
    )

    assert (
        denial_calls[0][
            "reason"
        ]
        == (
            "step_up_session_rotation_failed"
        )
    )


# ============================================================
# AUDIT CREDENTIAL HYGIENE
# ============================================================


@pytest.mark.asyncio
async def test_step_up_denial_never_places_credentials_in_audit_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabaseSession()

    validated = (
        build_validated_session()
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        del session
        del raw_token
        del touch

        return validated

    def fake_validate_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        del session
        del cookie_token
        del header_token

    def fake_decode_step_up(
        raw_token: str,
    ):
        del raw_token

        raise AdminAuthenticationError(
            "Invalid administrator "
            "authentication."
        )

    recorded: dict[
        str,
        object,
    ] = {}

    async def fake_record_audit_event(
        session,
        **kwargs,
    ):
        assert (
            session is db
        )

        recorded.update(
            kwargs
        )

    monkeypatch.setattr(
        admin_auth_route,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "validate_admin_session_csrf",
        fake_validate_csrf,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "decode_admin_step_up_token",
        fake_decode_step_up,
    )

    monkeypatch.setattr(
        admin_auth_route,
        "record_audit_event",
        fake_record_audit_event,
    )

    with pytest.raises(
        HTTPException
    ):
        await (
            admin_auth_route
            .step_up_admin_session(
                request=build_request(),
                response=Response(),
                db=db,  # type: ignore[arg-type]
                admin_session_token=(
                    TEST_SESSION_TOKEN
                ),
                csrf_cookie=(
                    TEST_CSRF_TOKEN
                ),
                csrf_header=(
                    TEST_CSRF_TOKEN
                ),
                cloudflare_access_assertion=(
                    TEST_STEP_UP_ASSERTION
                ),
            )
        )

    metadata_text = str(
        recorded.get(
            "metadata",
            {},
        )
    )

    assert (
        TEST_SESSION_TOKEN
        not in metadata_text
    )

    assert (
        TEST_CSRF_TOKEN
        not in metadata_text
    )

    assert (
        TEST_STEP_UP_ASSERTION
        not in metadata_text
    )

    assert (
        recorded["action"]
        == (
            AuditAction
            .ADMIN_STEP_UP_DENIED
            .value
        )
    )

    assert (
        recorded["outcome"]
        == "failure"
    )

    assert (
        db.rollback_count
        == 1
    )

    #
    # _record_denied_auth_event() commits the safe denial
    # audit event separately after rollback.
    #
    assert (
        db.commit_count
        == 1
    )