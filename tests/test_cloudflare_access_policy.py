from __future__ import annotations

from typing import ClassVar

import pytest

from app.core.config import settings
from app.services.admin import cloudflare_access_policy as service
from app.services.admin.cloudflare_access_policy import (
    CloudflareAccessPolicyError,
    _email_include_rules,
    get_active_admin_emails,
    sync_admin_access_policy,
)


class FakeScalarCollection:
    def __init__(self, values):
        self.values = values

    def all(self):
        return list(self.values)


class FakeResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return FakeScalarCollection(self.values)


class FakeSession:
    def __init__(self, values):
        self.values = values
        self.execute_count = 0

    async def execute(self, statement):
        del statement
        self.execute_count += 1
        return FakeResult(self.values)


class FakeResponse:
    def __init__(
        self,
        *,
        status_code=200,
        body=None,
        json_error: Exception | None = None,
    ):
        self.status_code = status_code
        self.body = body or {}
        self.json_error = json_error

    def json(self):
        if self.json_error is not None:
            raise self.json_error

        return self.body


class FakeAsyncClient:
    instances: ClassVar[list[object]] = []

    def __init__(
        self,
        *,
        timeout,
        get_response=None,
        put_response=None,
    ):
        self.timeout = timeout
        self.get_response = (
            get_response
            or FakeResponse(
                body={
                    "success": True,
                    "result": {
                        "name": "BAKABOOST Admin Allow",
                        "decision": "allow",
                        "include": [],
                        "exclude": [],
                        "require": [],
                        "session_duration": "24h",
                    },
                }
            )
        )
        self.put_response = (
            put_response
            or FakeResponse(
                body={
                    "success": True,
                    "result": {},
                }
            )
        )

        self.get_calls = []
        self.put_calls = []

        self.__class__.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(
        self,
        exc_type,
        exc,
        tb,
    ):
        del exc_type, exc, tb
        return False

    async def get(
        self,
        url,
        *,
        headers,
    ):
        self.get_calls.append(
            {
                "url": url,
                "headers": headers,
            }
        )
        return self.get_response

    async def put(
        self,
        url,
        *,
        headers,
        json,
    ):
        self.put_calls.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
            }
        )
        return self.put_response


@pytest.fixture(autouse=True)
def configure_cloudflare_settings(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "cloudflare_account_id",
        "account-123",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_admin_app_id",
        "app-123",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_admin_policy_id",
        "policy-123",
    )
    monkeypatch.setattr(
        settings,
        "cloudflare_api_token",
        "super-secret-api-token",
    )

    FakeAsyncClient.instances.clear()


@pytest.mark.asyncio
async def test_get_active_admin_emails_normalizes_values() -> None:
    session = FakeSession(
        [
            "  AdminB@Example.TEST  ",
            "admina@example.test",
            "",
            "   ",
        ]
    )

    emails = await get_active_admin_emails(
        session
    )

    assert emails == [
        "adminb@example.test",
        "admina@example.test",
    ]

    assert session.execute_count == 1


def test_email_include_rules_normalizes_deduplicates_and_sorts() -> None:
    result = _email_include_rules(
        [
            "Beta@Example.TEST",
            " alpha@example.test ",
            "beta@example.test",
            "",
        ]
    )

    assert result == [
        {
            "email": {
                "email": "alpha@example.test",
            }
        },
        {
            "email": {
                "email": "beta@example.test",
            }
        },
    ]


def test_email_include_rules_refuses_empty_allow_list() -> None:
    with pytest.raises(
        CloudflareAccessPolicyError,
        match="empty administrator allow-list",
    ):
        _email_include_rules(
            [
                "",
                "   ",
            ]
        )


@pytest.mark.asyncio
async def test_missing_configuration_fails_before_network_or_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cloudflare_api_token",
        "",
    )

    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="not configured",
    ):
        await sync_admin_access_policy(
            session
        )

    assert session.execute_count == 0


@pytest.mark.asyncio
async def test_sync_uses_reusable_policy_endpoint_and_preserves_policy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "AdminB@Example.TEST",
            "admina@example.test",
            "admina@example.test",
        ]
    )

    current = {
        "success": True,
        "result": {
            "name": "BAKABOOST Admin Allow",
            "decision": "allow",
            "include": [
                {
                    "email": {
                        "email": "old@example.test",
                    }
                }
            ],
            "exclude": [
                {
                    "ip": {
                        "ip": "192.0.2.10/32",
                    }
                }
            ],
            "require": [
                {
                    "country": {
                        "country_code": "US",
                    }
                }
            ],
            "session_duration": "8h",
        },
    }

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            get_response=FakeResponse(
                body=current,
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    emails = await sync_admin_access_policy(
        session
    )

    assert emails == [
        "adminb@example.test",
        "admina@example.test",
        "admina@example.test",
    ]

    client = FakeAsyncClient.instances[0]

    expected_url = (
        "https://api.cloudflare.com/client/v4"
        "/accounts/account-123"
        "/access/policies/policy-123"
    )

    assert client.timeout == 15.0

    assert client.get_calls == [
        {
            "url": expected_url,
            "headers": {
                "Authorization": (
                    "Bearer super-secret-api-token"
                ),
                "Content-Type": "application/json",
            },
        }
    ]

    assert len(
        client.put_calls
    ) == 1

    put_call = client.put_calls[0]

    assert (
        put_call["url"]
        == expected_url
    )

    assert put_call["json"] == {
        "name": "BAKABOOST Admin Allow",
        "decision": "allow",
        "include": [
            {
                "email": {
                    "email": "admina@example.test",
                }
            },
            {
                "email": {
                    "email": "adminb@example.test",
                }
            },
        ],
        "exclude": [
            {
                "ip": {
                    "ip": "192.0.2.10/32",
                }
            }
        ],
        "require": [
            {
                "country": {
                    "country_code": "US",
                }
            }
        ],
        "session_duration": "8h",
    }


@pytest.mark.asyncio
async def test_read_http_failure_raises_safe_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            get_response=FakeResponse(
                status_code=503,
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="could not be read",
    ):
        await sync_admin_access_policy(
            session
        )


@pytest.mark.asyncio
async def test_read_success_false_raises_safe_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            get_response=FakeResponse(
                body={
                    "success": False,
                    "errors": [
                        {
                            "message": "private upstream detail",
                        }
                    ],
                }
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="read was unsuccessful",
    ) as exc_info:
        await sync_admin_access_policy(
            session
        )

    assert (
        "private upstream detail"
        not in str(exc_info.value)
    )


@pytest.mark.asyncio
async def test_invalid_read_result_raises_safe_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            get_response=FakeResponse(
                body={
                    "success": True,
                    "result": None,
                }
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="response was invalid",
    ):
        await sync_admin_access_policy(
            session
        )


@pytest.mark.asyncio
async def test_update_http_failure_raises_safe_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            put_response=FakeResponse(
                status_code=500,
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="could not be updated",
    ):
        await sync_admin_access_policy(
            session
        )


@pytest.mark.asyncio
async def test_update_success_false_raises_safe_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    def fake_client_factory(*, timeout):
        return FakeAsyncClient(
            timeout=timeout,
            put_response=FakeResponse(
                body={
                    "success": False,
                    "errors": [
                        {
                            "message": "do not expose this",
                        }
                    ],
                }
            ),
        )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        fake_client_factory,
    )

    with pytest.raises(
        CloudflareAccessPolicyError,
        match="update was unsuccessful",
    ) as exc_info:
        await sync_admin_access_policy(
            session
        )

    assert (
        "do not expose this"
        not in str(exc_info.value)
    )


@pytest.mark.asyncio
async def test_api_token_is_only_sent_in_authorization_header(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        [
            "admin@example.test",
        ]
    )

    monkeypatch.setattr(
        service.httpx,
        "AsyncClient",
        lambda *, timeout: FakeAsyncClient(
            timeout=timeout,
        ),
    )

    await sync_admin_access_policy(
        session
    )

    client = FakeAsyncClient.instances[0]

    combined_payload = repr(
        {
            "get": client.get_calls,
            "put": client.put_calls,
        }
    )

    assert (
        "super-secret-api-token"
        in combined_payload
    )

    assert (
        "super-secret-api-token"
        not in repr(
            client.put_calls[0]["json"]
        )
    )
