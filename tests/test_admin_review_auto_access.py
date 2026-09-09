from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.routes.admin import review as review_route
from app.core.constants import VerificationStatus


class DummyRequest:
    client = SimpleNamespace(host="203.0.113.10")


@pytest.mark.asyncio
async def test_approved_decision_automatically_issues_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid4()
    admin_id = uuid4()

    verification_request = SimpleNamespace(
        id=request_id,
        status=VerificationStatus.APPROVED,
        decided_at=None,
    )

    record_decision_mock = AsyncMock(
        return_value=verification_request
    )
    issue_access_mock = AsyncMock()

    monkeypatch.setattr(
        review_route,
        "record_decision",
        record_decision_mock,
    )
    monkeypatch.setattr(
        review_route,
        "issue_access_grant",
        issue_access_mock,
    )

    admin = SimpleNamespace(id=admin_id)
    payload = SimpleNamespace(
        reason_code=None,
        internal_note=None,
        user_message=None,
    )
    session = AsyncMock()

    response = await review_route._perform_decision(
        request_id=request_id,
        target_status=VerificationStatus.APPROVED,
        payload=payload,
        http_request=DummyRequest(),
        session=session,
        admin=admin,
    )

    assert response.status == VerificationStatus.APPROVED

    issue_access_mock.assert_awaited_once_with(
        session,
        request_id=request_id,
        admin_id=admin_id,
        ip_address="203.0.113.10",
    )


@pytest.mark.asyncio
async def test_approved_decision_survives_automatic_access_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid4()
    admin_id = uuid4()

    verification_request = SimpleNamespace(
        id=request_id,
        status=VerificationStatus.APPROVED,
        decided_at=None,
    )

    monkeypatch.setattr(
        review_route,
        "record_decision",
        AsyncMock(
            return_value=verification_request
        ),
    )
    monkeypatch.setattr(
        review_route,
        "issue_access_grant",
        AsyncMock(
            side_effect=RuntimeError(
                "discord unavailable"
            )
        ),
    )

    admin = SimpleNamespace(id=admin_id)
    payload = SimpleNamespace(
        reason_code=None,
        internal_note=None,
        user_message=None,
    )

    response = await review_route._perform_decision(
        request_id=request_id,
        target_status=VerificationStatus.APPROVED,
        payload=payload,
        http_request=DummyRequest(),
        session=AsyncMock(),
        admin=admin,
    )

    assert response.status == VerificationStatus.APPROVED


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "target_status",
    [
        VerificationStatus.REJECTED,
        VerificationStatus.MORE_INFO,
    ],
)
async def test_non_approved_decisions_do_not_issue_access(
    monkeypatch: pytest.MonkeyPatch,
    target_status: VerificationStatus,
) -> None:
    request_id = uuid4()
    admin_id = uuid4()

    verification_request = SimpleNamespace(
        id=request_id,
        status=target_status,
        decided_at=None,
    )

    monkeypatch.setattr(
        review_route,
        "record_decision",
        AsyncMock(
            return_value=verification_request
        ),
    )

    issue_access_mock = AsyncMock()

    monkeypatch.setattr(
        review_route,
        "issue_access_grant",
        issue_access_mock,
    )

    admin = SimpleNamespace(id=admin_id)
    payload = SimpleNamespace(
        reason_code=None,
        internal_note=None,
        user_message=None,
    )

    response = await review_route._perform_decision(
        request_id=request_id,
        target_status=target_status,
        payload=payload,
        http_request=DummyRequest(),
        session=AsyncMock(),
        admin=admin,
    )

    assert response.status == target_status
    issue_access_mock.assert_not_awaited()
