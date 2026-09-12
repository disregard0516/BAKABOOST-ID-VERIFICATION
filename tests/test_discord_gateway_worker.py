import asyncio
from unittest.mock import AsyncMock, MagicMock

import discord
import pytest

from app.services.discord.gateway_worker import (
    DiscordGatewayConfigurationError,
    ScanlyDiscordClient,
    _load_gateway_configuration,
)

GUILD_ID = 1546877848348786758
ROLE_ID = 1546913159426605076
DISCORD_USER_ID = 123456789012345678


def build_member(*, bot: bool = False):
    member = MagicMock()
    member.id = DISCORD_USER_ID
    member.bot = bot

    member.guild.id = GUILD_ID

    role = MagicMock()
    role.id = ROLE_ID

    member.guild.get_role.return_value = role
    member.roles = []

    member.add_roles = AsyncMock()
    member.remove_roles = AsyncMock()

    return member, role


def test_gateway_configuration_requires_bot_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    monkeypatch.setattr(
        gateway_worker.settings,
        "discord_bot_token",
        "",
    )
    monkeypatch.setattr(
        gateway_worker.settings,
        "discord_guild_id",
        str(GUILD_ID),
    )
    monkeypatch.setattr(
        gateway_worker.settings,
        "discord_verified_role_id",
        str(ROLE_ID),
    )

    with pytest.raises(
        DiscordGatewayConfigurationError,
        match="DISCORD_BOT_TOKEN is required",
    ):
        _load_gateway_configuration()


@pytest.mark.asyncio
async def test_unauthorized_join_does_not_assign_or_remove_role(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, _role = build_member()

    eligible_mock = AsyncMock(
        return_value=None
    )

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        eligible_mock,
    )

    await client.on_member_join(member)

    eligible_mock.assert_awaited_once_with(
        discord_user_id=DISCORD_USER_ID
    )

    member.add_roles.assert_not_awaited()
    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_bot_join_is_ignored(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, _role = build_member(
        bot=True
    )

    eligible_mock = AsyncMock()

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        eligible_mock,
    )

    await client.on_member_join(member)

    eligible_mock.assert_not_awaited()
    member.add_roles.assert_not_awaited()
    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_eligible_join_assigns_role_then_consumes_grant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, role = build_member()

    grant_id = MagicMock()

    eligible_mock = AsyncMock(
        return_value=grant_id
    )
    consume_mock = AsyncMock(
        return_value=True
    )

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        eligible_mock,
    )
    monkeypatch.setattr(
        client,
        "_consume_grant",
        consume_mock,
    )

    call_order: list[str] = []

    async def add_role(*args, **kwargs):
        call_order.append("role")

    async def consume_grant(**kwargs):
        call_order.append("consume")
        return True

    member.add_roles.side_effect = add_role
    consume_mock.side_effect = consume_grant

    await client.on_member_join(member)

    assert call_order == [
        "role",
        "consume",
    ]

    member.add_roles.assert_awaited_once()
    assert (
        member.add_roles.await_args.args[0]
        is role
    )

    consume_mock.assert_awaited_once_with(
        grant_id=grant_id,
        discord_user_id=DISCORD_USER_ID,
    )

    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_failed_final_consumption_removes_new_role(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, role = build_member()

    grant_id = MagicMock()

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        AsyncMock(
            return_value=grant_id
        ),
    )

    monkeypatch.setattr(
        client,
        "_consume_grant",
        AsyncMock(
            return_value=False
        ),
    )

    await client.on_member_join(member)

    member.add_roles.assert_awaited_once()
    member.remove_roles.assert_awaited_once()

    assert (
        member.remove_roles.await_args.args[0]
        is role
    )


@pytest.mark.asyncio
async def test_other_guild_is_ignored(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, _role = build_member()
    member.guild.id = GUILD_ID + 1

    eligible_mock = AsyncMock()

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        eligible_mock,
    )

    await client.on_member_join(member)

    eligible_mock.assert_not_awaited()
    member.add_roles.assert_not_awaited()
    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_preexisting_verified_role_is_removed_if_consume_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, role = build_member()

    # Simulate the user already having the Verified role
    # before this join-handler path reaches final consumption.
    member.roles = [role]

    grant_id = MagicMock()

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        AsyncMock(
            return_value=grant_id
        ),
    )

    monkeypatch.setattr(
        client,
        "_consume_grant",
        AsyncMock(
            return_value=False
        ),
    )

    await client.on_member_join(member)

    # Role should not be added again...
    member.add_roles.assert_not_awaited()

    # ...but must be removed because final DB consume failed.
    member.remove_roles.assert_awaited_once()

    assert (
        member.remove_roles.await_args.args[0]
        is role
    )


@pytest.mark.asyncio
async def test_existing_member_gets_role_then_consumes_with_existing_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, role = build_member()
    grant_id = MagicMock()

    eligible_mock = AsyncMock(
        return_value=grant_id
    )
    consume_mock = AsyncMock(
        return_value=True
    )

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        eligible_mock,
    )
    monkeypatch.setattr(
        client,
        "_consume_grant",
        consume_mock,
    )

    call_order: list[str] = []

    async def add_role(*args, **kwargs):
        call_order.append("role")

    async def consume_grant(**kwargs):
        call_order.append("consume")
        return True

    member.add_roles.side_effect = add_role
    consume_mock.side_effect = consume_grant

    await client._grant_existing_member_access(
        member=member,
        role=role,
    )

    assert call_order == [
        "role",
        "consume",
    ]

    member.add_roles.assert_awaited_once()

    consume_mock.assert_awaited_once_with(
        grant_id=grant_id,
        discord_user_id=DISCORD_USER_ID,
        source="discord_existing_member",
    )

    member.remove_roles.assert_not_awaited()


@pytest.mark.asyncio
async def test_existing_member_role_removed_if_final_consume_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    member, role = build_member()
    grant_id = MagicMock()

    monkeypatch.setattr(
        client,
        "_find_eligible_grant_id",
        AsyncMock(
            return_value=grant_id
        ),
    )

    monkeypatch.setattr(
        client,
        "_consume_grant",
        AsyncMock(
            return_value=False
        ),
    )

    await client._grant_existing_member_access(
        member=member,
        role=role,
    )

    member.add_roles.assert_awaited_once()
    member.remove_roles.assert_awaited_once()

    assert (
        member.remove_roles.await_args.args[0]
        is role
    )


@pytest.mark.asyncio
async def test_reconciliation_leaves_nonmember_grant_untouched(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    guild = MagicMock()
    guild.id = GUILD_ID
    guild.get_member.return_value = None

    not_found_response = MagicMock()
    not_found_response.status = 404
    not_found_response.reason = "Not Found"

    guild.fetch_member = AsyncMock(
        side_effect=discord.NotFound(
            not_found_response,
            "Unknown Member",
        )
    )

    role = MagicMock()
    role.id = ROLE_ID

    session = AsyncMock()

    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(
        return_value=session
    )
    session_context.__aexit__ = AsyncMock(
        return_value=None
    )

    monkeypatch.setattr(
        gateway_worker,
        "AsyncSessionLocal",
        MagicMock(
            return_value=session_context
        ),
    )

    issued_ids_mock = AsyncMock(
        return_value=[DISCORD_USER_ID]
    )

    monkeypatch.setattr(
        gateway_worker,
        "list_issued_access_grant_discord_user_ids",
        issued_ids_mock,
    )

    grant_existing_mock = AsyncMock()

    monkeypatch.setattr(
        client,
        "_grant_existing_member_access",
        grant_existing_mock,
    )

    await client._reconcile_existing_members(
        guild=guild,
        role=role,
    )

    issued_ids_mock.assert_awaited_once_with(
        session
    )

    guild.get_member.assert_called_once_with(
        DISCORD_USER_ID
    )
    guild.fetch_member.assert_awaited_once_with(
        DISCORD_USER_ID
    )

    grant_existing_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_reconciliation_task_starts_only_once(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    created_tasks = []

    class DummyTask:
        def done(self) -> bool:
            return False

        def cancel(self) -> None:
            return None

        def __await__(self):
            async def _wait():
                return None

            return _wait().__await__()

    def fake_create_task(coro, *, name=None):
        coro.close()
        task = DummyTask()
        created_tasks.append((task, name))
        return task

    monkeypatch.setattr(
        gateway_worker.asyncio,
        "create_task",
        fake_create_task,
    )

    client._ensure_reconciliation_task()
    client._ensure_reconciliation_task()

    assert len(created_tasks) == 1
    assert created_tasks[0][1] == (
        "scanly-discord-reconciliation"
    )


@pytest.mark.asyncio
async def test_periodic_reconciliation_processes_existing_member(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    guild = MagicMock()
    guild.id = GUILD_ID

    role = MagicMock()
    role.id = ROLE_ID

    guild.get_role.return_value = role
    client.get_guild = MagicMock(
        return_value=guild
    )

    reconcile_mock = AsyncMock()

    monkeypatch.setattr(
        client,
        "_reconcile_existing_members",
        reconcile_mock,
    )

    sleep_calls = 0

    async def fake_sleep(seconds):
        nonlocal sleep_calls
        sleep_calls += 1

        assert seconds == (
            gateway_worker.RECONCILIATION_INTERVAL_SECONDS
        )

        if sleep_calls > 1:
            raise asyncio.CancelledError

    monkeypatch.setattr(
        gateway_worker.asyncio,
        "sleep",
        fake_sleep,
    )

    closed_checks = 0

    def fake_is_closed():
        nonlocal closed_checks
        closed_checks += 1
        return False

    monkeypatch.setattr(
        client,
        "is_closed",
        fake_is_closed,
    )

    with pytest.raises(asyncio.CancelledError):
        await client._reconciliation_loop()

    reconcile_mock.assert_awaited_once_with(
        guild=guild,
        role=role,
    )


@pytest.mark.asyncio
async def test_periodic_reconciliation_survives_cycle_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    guild = MagicMock()
    guild.id = GUILD_ID

    role = MagicMock()
    role.id = ROLE_ID

    guild.get_role.return_value = role
    client.get_guild = MagicMock(
        return_value=guild
    )

    reconcile_mock = AsyncMock(
        side_effect=[
            RuntimeError("temporary failure"),
            None,
        ]
    )

    monkeypatch.setattr(
        client,
        "_reconcile_existing_members",
        reconcile_mock,
    )

    sleep_calls = 0

    async def fake_sleep(seconds):
        nonlocal sleep_calls
        sleep_calls += 1

        assert seconds == (
            gateway_worker.RECONCILIATION_INTERVAL_SECONDS
        )

        if sleep_calls > 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(
        gateway_worker.asyncio,
        "sleep",
        fake_sleep,
    )

    monkeypatch.setattr(
        client,
        "is_closed",
        lambda: False,
    )

    with pytest.raises(asyncio.CancelledError):
        await client._reconciliation_loop()

    assert reconcile_mock.await_count == 2



@pytest.mark.asyncio
async def test_reconciliation_fetches_member_after_cache_miss(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord import gateway_worker

    client = ScanlyDiscordClient(
        guild_id=GUILD_ID,
        verified_role_id=ROLE_ID,
    )

    guild = MagicMock()
    guild.id = GUILD_ID
    guild.get_member.return_value = None

    member, _member_role = build_member()
    guild.fetch_member = AsyncMock(
        return_value=member
    )

    role = MagicMock()
    role.id = ROLE_ID

    session = AsyncMock()

    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(
        return_value=session
    )
    session_context.__aexit__ = AsyncMock(
        return_value=None
    )

    monkeypatch.setattr(
        gateway_worker,
        "AsyncSessionLocal",
        MagicMock(
            return_value=session_context
        ),
    )

    issued_ids_mock = AsyncMock(
        return_value=[DISCORD_USER_ID]
    )

    monkeypatch.setattr(
        gateway_worker,
        "list_issued_access_grant_discord_user_ids",
        issued_ids_mock,
    )

    grant_existing_mock = AsyncMock()

    monkeypatch.setattr(
        client,
        "_grant_existing_member_access",
        grant_existing_mock,
    )

    await client._reconcile_existing_members(
        guild=guild,
        role=role,
    )

    guild.get_member.assert_called_once_with(
        DISCORD_USER_ID
    )
    guild.fetch_member.assert_awaited_once_with(
        DISCORD_USER_ID
    )
    grant_existing_mock.assert_awaited_once_with(
        member=member,
        role=role,
    )
