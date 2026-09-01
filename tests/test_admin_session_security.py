from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api import dependencies
from app.core.constants import AuditAction
from app.services.admin.session_service import (
    InvalidAdminSessionError,
    ValidatedAdminSession,
)


class FakeDatabaseSession:
    def __init__(self) -> None:
        self.commit_count = 0
        self.rollback_count = 0

    async def commit(self) -> None:
        self.commit_count += 1

    async def rollback(self) -> None:
        self.rollback_count += 1


def build_request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/admin/test",
            "headers": [
                (
                    b"user-agent",
                    b"BAKABOOST-Test-Agent",
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


@pytest.mark.asyncio
async def test_admin_session_touch_is_committed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Protected admin authentication must persist the successful
    last_seen_at touch performed by get_valid_admin_session().
    """

    db = FakeDatabaseSession()

    admin = SimpleNamespace(
        id=uuid4(),
    )

    admin_session = SimpleNamespace(
        id=uuid4(),
    )

    validated = ValidatedAdminSession(
        admin=admin,
        session=admin_session,
    )

    observed: dict[str, object] = {}

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        observed["session"] = session
        observed["raw_token"] = raw_token
        observed["touch"] = touch

        return validated

    monkeypatch.setattr(
        dependencies,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    result = (
        await dependencies.get_current_admin_session(
            build_request(),
            db,
            "raw-session-token",
        )
    )

    assert result is validated

    assert observed == {
        "session": db,
        "raw_token": "raw-session-token",
        "touch": True,
    }

    assert db.commit_count == 1
    assert db.rollback_count == 0


@pytest.mark.asyncio
async def test_expired_admin_session_is_rolled_back_then_invalidated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Expiry discovered during validation must survive the
    validation failure:

        rollback
        -> persistent invalidation
        -> generic 401
    """

    db = FakeDatabaseSession()

    admin_id = uuid4()
    admin_session_id = uuid4()

    validation_error = InvalidAdminSessionError(
        "Administrator session expired.",
        admin_id=admin_id,
        admin_session_id=admin_session_id,
        reason="absolute_expiry",
        requires_revocation=True,
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        raise validation_error

    invalidation_calls: list[
        InvalidAdminSessionError
    ] = []

    async def fake_persist_invalidation(
        session,
        *,
        request: Request,
        exc: InvalidAdminSessionError,
    ) -> None:
        assert session is db
        assert request.state.request_id
        invalidation_calls.append(exc)

    monkeypatch.setattr(
        dependencies,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        dependencies,
        "_persist_admin_session_invalidation",
        fake_persist_invalidation,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependencies.get_current_admin_session(
            build_request(),
            db,
            "expired-session-token",
        )

    assert exc_info.value.status_code == 401

    assert (
        exc_info.value.detail
        == "Authentication required."
    )

    assert db.rollback_count == 1
    assert db.commit_count == 0

    assert invalidation_calls == [
        validation_error
    ]


@pytest.mark.asyncio
async def test_unknown_admin_session_does_not_trigger_revocation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Unknown credentials have no persistent session row and
    must never trigger revocation-by-ID.
    """

    db = FakeDatabaseSession()

    validation_error = InvalidAdminSessionError(
        "Invalid administrator session.",
        reason="unknown_session",
        requires_revocation=False,
    )

    async def fake_get_valid_admin_session(
        session,
        *,
        raw_token: str,
        touch: bool = True,
    ):
        raise validation_error

    async def forbidden_revocation(
        *args,
        **kwargs,
    ) -> bool:
        raise AssertionError(
            "Unknown session attempted persistent revocation."
        )

    monkeypatch.setattr(
        dependencies,
        "get_valid_admin_session",
        fake_get_valid_admin_session,
    )

    monkeypatch.setattr(
        dependencies,
        "revoke_admin_session_by_id",
        forbidden_revocation,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependencies.get_current_admin_session(
            build_request(),
            db,
            "unknown-session-token",
        )

    assert exc_info.value.status_code == 401

    assert (
        exc_info.value.detail
        == "Authentication required."
    )

    assert db.rollback_count == 1
    assert db.commit_count == 0
    
@pytest.mark.asyncio
async def test_admin_csrf_failure_is_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    CSRF denial must be tied to the authenticated administrator
    session rather than treated as anonymous authentication
    failure.
    """

    db = FakeDatabaseSession()

    admin = SimpleNamespace(
        id=uuid4(),
    )

    admin_session = SimpleNamespace(
        id=uuid4(),
    )

    current = ValidatedAdminSession(
        admin=admin,
        session=admin_session,
    )

    csrf_error = InvalidAdminSessionError(
        "Invalid administrator request verification.",
        admin_id=admin.id,
        admin_session_id=admin_session.id,
        reason="csrf_validation_failed",
        requires_revocation=False,
    )

    def fake_validate_admin_session_csrf(
        session,
        *,
        cookie_token,
        header_token,
    ) -> None:
        raise csrf_error

    audit_calls: list[
        tuple[
            AuditAction,
            str,
        ]
    ] = []

    async def fake_record_denial(
        session,
        *,
        request: Request,
        current: ValidatedAdminSession,
        action: AuditAction,
        reason: str,
    ) -> None:
        assert session is db
        assert (
            current.session.id
            == admin_session.id
        )

        audit_calls.append(
            (
                action,
                reason,
            )
        )

    monkeypatch.setattr(
        dependencies,
        "validate_admin_session_csrf",
        fake_validate_admin_session_csrf,
    )

    monkeypatch.setattr(
        dependencies,
        "_record_admin_security_denial",
        fake_record_denial,
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        await dependencies.require_admin_csrf(
            build_request(),
            db,
            current,
            "csrf-cookie",
            "csrf-header",
        )

    assert exc_info.value.status_code == 403

    assert db.rollback_count == 1

    assert audit_calls == [
        (
            AuditAction.ADMIN_CSRF_DENIED,
            "csrf_validation_failed",
        ),
    ]


@pytest.mark.asyncio
async def test_security_denial_receives_request_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Audit-service invocation must receive the hardened HTTP and
    administrator-session security context.
    """

    db = FakeDatabaseSession()
    request = build_request()

    admin_id = uuid4()
    admin_session_id = uuid4()

    current = ValidatedAdminSession(
        admin=SimpleNamespace(
            id=admin_id,
        ),
        session=SimpleNamespace(
            id=admin_session_id,
        ),
    )

    recorded: dict[str, object] = {}

    async def fake_record_audit_event(
        session,
        **kwargs,
    ):
        recorded["session"] = session
        recorded.update(kwargs)

    monkeypatch.setattr(
        dependencies,
        "record_audit_event",
        fake_record_audit_event,
    )

    await (
        dependencies
        ._record_admin_security_denial(
            db,
            request=request,
            current=current,
            action=(
                AuditAction.ADMIN_CSRF_DENIED
            ),
            reason="csrf_validation_failed",
        )
    )

    assert recorded[
        "session"
    ] is db

    assert (
        recorded["actor_id"]
        == str(admin_id)
    )

    assert (
        recorded["admin_session_id"]
        == admin_session_id
    )

    assert (
        recorded["request_id"]
        == (
            "11111111-1111-1111-1111-111111111111"
        )
    )

    assert (
        recorded["user_agent"]
        == "BAKABOOST-Test-Agent"
    )

    assert (
        recorded["ip_address"]
        == "127.0.0.1"
    )

    assert (
        recorded["outcome"]
        == "failure"
    )

    assert recorded[
        "metadata"
    ] == {
        "reason": "csrf_validation_failed",
    }

    #
    # Authentication/CSRF credentials must never enter audit
    # metadata.
    #
    metadata_text = str(
        recorded["metadata"]
    )

    assert (
        "raw-session-token"
        not in metadata_text
    )

    assert (
        "csrf-cookie"
        not in metadata_text
    )

    assert (
        "csrf-header"
        not in metadata_text
    )

    assert db.commit_count == 1