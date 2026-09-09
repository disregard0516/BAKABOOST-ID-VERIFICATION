import uuid
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.constants import (
    AccessGrantStatus,
    ActorType,
    AuditAction,
    VerificationStatus,
)
from app.db.models.discord_access_grant import DiscordAccessGrant
from app.db.models.verification_request import VerificationRequest
from app.services.access import grant_service
from app.utils.time import utc_now

DISCORD_USER_ID = 123456789012345678


def build_grant(
    *,
    status: AccessGrantStatus = AccessGrantStatus.ISSUED,
    expires_delta: timedelta = timedelta(minutes=10),
) -> DiscordAccessGrant:
    now = utc_now()

    return DiscordAccessGrant(
        id=uuid.uuid4(),
        verification_request_id=uuid.uuid4(),
        discord_user_id=DISCORD_USER_ID,
        status=status,
        invite_reference="encrypted-test-reference",
        issued_at=now,
        expires_at=now + expires_delta,
        consumed_at=None,
        revoked_at=None,
        created_at=now,
        updated_at=now,
    )


def build_request(
    grant: DiscordAccessGrant,
    *,
    status: VerificationStatus = VerificationStatus.APPROVED,
    discord_user_id: int = DISCORD_USER_ID,
) -> VerificationRequest:
    now = utc_now()

    request = VerificationRequest(
        id=grant.verification_request_id,
        assigned_discord_user_id=discord_user_id,
        status=status,
    )

    request.updated_at = now
    request.last_activity_at = now

    return request


def scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def scalars_first_result(value):
    scalars = MagicMock()
    scalars.first.return_value = value

    result = MagicMock()
    result.scalars.return_value = scalars
    return result


@pytest.mark.asyncio
async def test_eligible_grant_is_returned_without_consuming(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant()
    request = build_request(grant)

    session = AsyncMock()
    session.execute.side_effect = [
        scalars_first_result(grant),
        scalar_result(request),
    ]

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .get_eligible_access_grant_for_discord_user(
            session,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is grant
    assert grant.status == AccessGrantStatus.ISSUED
    assert grant.consumed_at is None

    session.commit.assert_not_awaited()
    session.refresh.assert_not_awaited()
    session.rollback.assert_not_awaited()
    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_valid_grant_consumes_after_revalidation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant()
    request = build_request(grant)

    session = AsyncMock()
    session.execute.side_effect = [
        scalar_result(grant),
        scalar_result(request),
    ]

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .consume_access_grant_for_discord_user(
            session,
            grant_id=grant.id,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is grant
    assert grant.status == AccessGrantStatus.CONSUMED
    assert grant.consumed_at is not None

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(grant)
    session.rollback.assert_not_awaited()

    audit_mock.assert_awaited_once()

    audit_call = audit_mock.await_args.kwargs

    assert audit_call["actor_type"] == ActorType.SYSTEM.value
    assert audit_call["actor_id"] == "discord_bot"
    assert (
        audit_call["action"]
        == AuditAction.ACCESS_CONSUMED.value
    )
    assert (
        audit_call["verification_request_id"]
        == request.id
    )
    assert (
        audit_call["metadata"]["discord_user_id"]
        == str(DISCORD_USER_ID)
    )
    assert (
        audit_call["metadata"]["source"]
        == "discord_guild_join"
    )


@pytest.mark.asyncio
async def test_no_issued_grant_returns_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()
    session.execute.return_value = (
        scalars_first_result(None)
    )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .get_eligible_access_grant_for_discord_user(
            session,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is None
    session.commit.assert_not_awaited()
    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_expired_grant_is_marked_expired(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant(
        expires_delta=timedelta(seconds=-1)
    )

    session = AsyncMock()
    session.execute.return_value = (
        scalars_first_result(grant)
    )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .get_eligible_access_grant_for_discord_user(
            session,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is None
    assert grant.status == AccessGrantStatus.EXPIRED
    assert grant.consumed_at is None

    session.commit.assert_awaited_once()
    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_revalidation_rejects_unapproved_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant()
    request = build_request(
        grant,
        status=VerificationStatus.REJECTED,
    )

    session = AsyncMock()
    session.execute.side_effect = [
        scalar_result(grant),
        scalar_result(request),
    ]

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .consume_access_grant_for_discord_user(
            session,
            grant_id=grant.id,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is None
    assert grant.status == AccessGrantStatus.ISSUED
    assert grant.consumed_at is None

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_revalidation_rejects_discord_id_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant()
    request = build_request(
        grant,
        discord_user_id=DISCORD_USER_ID + 1,
    )

    session = AsyncMock()
    session.execute.side_effect = [
        scalar_result(grant),
        scalar_result(request),
    ]

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .consume_access_grant_for_discord_user(
            session,
            grant_id=grant.id,
            discord_user_id=DISCORD_USER_ID,
        )
    )

    assert result is None
    assert grant.status == AccessGrantStatus.ISSUED
    assert grant.consumed_at is None

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_consumption_records_explicit_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant()
    request = build_request(grant)

    session = AsyncMock()
    session.execute.side_effect = [
        scalar_result(grant),
        scalar_result(request),
    ]

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await (
        grant_service
        .consume_access_grant_for_discord_user(
            session,
            grant_id=grant.id,
            discord_user_id=DISCORD_USER_ID,
            source="discord_existing_member",
        )
    )

    assert result is grant
    assert grant.status == AccessGrantStatus.CONSUMED

    audit_mock.assert_awaited_once()

    audit_call = audit_mock.await_args.kwargs

    assert (
        audit_call["metadata"]["source"]
        == "discord_existing_member"
    )


@pytest.mark.asyncio
async def test_list_issued_access_grant_discord_user_ids() -> None:
    session = AsyncMock()

    scalars = MagicMock()
    scalars.all.return_value = [
        DISCORD_USER_ID,
        DISCORD_USER_ID + 1,
    ]

    result = MagicMock()
    result.scalars.return_value = scalars
    session.execute.return_value = result

    discord_user_ids = await (
        grant_service.list_issued_access_grant_discord_user_ids(
            session
        )
    )

    assert discord_user_ids == [
        DISCORD_USER_ID,
        DISCORD_USER_ID + 1,
    ]

    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_issue_access_grant_sends_approval_dm_after_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    invite_mock = AsyncMock(
        return_value="test-invite-code"
    )
    dm_mock = AsyncMock()
    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        invite_mock,
    )
    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            return_value="encrypted-test-invite"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "send_approval_dm",
        dm_mock,
    )
    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await grant_service.issue_access_grant(
        session,
        request_id=request_id,
        admin_id=admin_id,
        ip_address="127.0.0.1",
    )

    assert result.status == AccessGrantStatus.ISSUED
    assert result.discord_user_id == DISCORD_USER_ID

    invite_mock.assert_awaited_once_with(
        discord_user_id=DISCORD_USER_ID
    )

    dm_mock.assert_awaited_once_with(
        discord_user_id=DISCORD_USER_ID,
        invite_code="test-invite-code",
    )

    assert session.commit.await_count == 2

    assert audit_mock.await_count == 2

    first_audit = audit_mock.await_args_list[0].kwargs
    second_audit = audit_mock.await_args_list[1].kwargs

    assert (
        first_audit["action"]
        == AuditAction.ACCESS_GRANTED.value
    )
    assert (
        second_audit["action"]
        == AuditAction.ACCESS_DM_SENT.value
    )
    assert (
        second_audit["actor_type"]
        == ActorType.SYSTEM.value
    )
    assert (
        second_audit["metadata"]["discord_user_id"]
        == str(DISCORD_USER_ID)
    )


@pytest.mark.asyncio
async def test_issue_access_grant_survives_approval_dm_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.discord.dm import DiscordDMError

    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    invite_mock = AsyncMock(
        return_value="test-invite-code"
    )
    dm_mock = AsyncMock(
        side_effect=DiscordDMError(
            "Discord rejected approval DM delivery."
        )
    )
    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        invite_mock,
    )
    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            return_value="encrypted-test-invite"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "send_approval_dm",
        dm_mock,
    )
    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await grant_service.issue_access_grant(
        session,
        request_id=request_id,
        admin_id=admin_id,
    )

    # The access grant remains valid even though the DM failed.
    assert result.status == AccessGrantStatus.ISSUED
    assert result.discord_user_id == DISCORD_USER_ID

    dm_mock.assert_awaited_once_with(
        discord_user_id=DISCORD_USER_ID,
        invite_code="test-invite-code",
    )

    # First commit persists the access grant.
    # Second commit persists only the DM-failure audit event.
    assert session.commit.await_count == 2

    assert audit_mock.await_count == 2

    first_audit = audit_mock.await_args_list[0].kwargs
    second_audit = audit_mock.await_args_list[1].kwargs

    assert (
        first_audit["action"]
        == AuditAction.ACCESS_GRANTED.value
    )
    assert (
        second_audit["action"]
        == AuditAction.ACCESS_DM_FAILED.value
    )
    assert (
        second_audit["actor_type"]
        == ActorType.SYSTEM.value
    )
    assert (
        second_audit["metadata"]["discord_user_id"]
        == str(DISCORD_USER_ID)
    )
    assert (
        second_audit["metadata"]["error_type"]
        == "DiscordDMError"
    )


@pytest.mark.asyncio
async def test_issue_access_grant_survives_unexpected_dm_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        AsyncMock(
            return_value="test-invite-code"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            return_value="encrypted-test-invite"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "send_approval_dm",
        AsyncMock(
            side_effect=RuntimeError(
                "unexpected discord failure"
            )
        ),
    )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await grant_service.issue_access_grant(
        session,
        request_id=request_id,
        admin_id=admin_id,
    )

    assert result.status == AccessGrantStatus.ISSUED
    assert result.discord_user_id == DISCORD_USER_ID

    assert session.commit.await_count == 2

    second_audit = audit_mock.await_args_list[1].kwargs

    assert (
        second_audit["action"]
        == AuditAction.ACCESS_DM_FAILED.value
    )
    assert (
        second_audit["metadata"]["error_type"]
        == "RuntimeError"
    )


@pytest.mark.asyncio
async def test_issue_access_grant_survives_dm_audit_commit_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    # First commit persists the grant.
    # Second commit is the best-effort DM audit and fails.
    session.commit.side_effect = [
        None,
        RuntimeError(
            "audit commit failed"
        ),
    ]

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        AsyncMock(
            return_value="test-invite-code"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            return_value="encrypted-test-invite"
        ),
    )
    monkeypatch.setattr(
        grant_service,
        "send_approval_dm",
        AsyncMock(),
    )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        audit_mock,
    )

    result = await grant_service.issue_access_grant(
        session,
        request_id=request_id,
        admin_id=admin_id,
    )

    assert result.status == AccessGrantStatus.ISSUED
    assert result.discord_user_id == DISCORD_USER_ID

    assert session.commit.await_count == 2
    session.rollback.assert_awaited_once()

    assert audit_mock.await_count == 2

    second_audit = audit_mock.await_args_list[1].kwargs

    assert (
        second_audit["action"]
        == AuditAction.ACCESS_DM_SENT.value
    )


@pytest.mark.asyncio
async def test_issue_access_grant_cleans_invite_when_encryption_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        AsyncMock(
            return_value="test-invite-code"
        ),
    )

    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            side_effect=RuntimeError(
                "encryption failed"
            )
        ),
    )

    delete_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "delete_discord_invite",
        delete_mock,
    )

    with pytest.raises(
        RuntimeError,
        match="encryption failed",
    ):
        await grant_service.issue_access_grant(
            session,
            request_id=request_id,
            admin_id=admin_id,
        )

    session.rollback.assert_awaited_once()

    delete_mock.assert_awaited_once_with(
        "test-invite-code"
    )


@pytest.mark.asyncio
async def test_issue_access_grant_cleans_invite_when_commit_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    request = VerificationRequest(
        id=request_id,
        assigned_discord_user_id=DISCORD_USER_ID,
        status=VerificationStatus.APPROVED,
    )

    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = [
        scalar_result(request),
        scalar_result(None),
    ]

    session.commit.side_effect = RuntimeError(
        "grant commit failed"
    )

    monkeypatch.setattr(
        grant_service,
        "create_targeted_discord_invite",
        AsyncMock(
            return_value="test-invite-code"
        ),
    )

    monkeypatch.setattr(
        grant_service,
        "encrypt_invite_code",
        MagicMock(
            return_value="encrypted-test-invite"
        ),
    )

    delete_mock = AsyncMock()

    monkeypatch.setattr(
        grant_service,
        "delete_discord_invite",
        delete_mock,
    )

    monkeypatch.setattr(
        grant_service,
        "record_audit_event",
        AsyncMock(),
    )

    with pytest.raises(
        RuntimeError,
        match="grant commit failed",
    ):
        await grant_service.issue_access_grant(
            session,
            request_id=request_id,
            admin_id=admin_id,
        )

    session.rollback.assert_awaited_once()

    delete_mock.assert_awaited_once_with(
        "test-invite-code"
    )



@pytest.mark.asyncio
async def test_applicant_access_returns_consumed_grant_without_invite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant(
        status=AccessGrantStatus.CONSUMED,
    )
    grant.consumed_at = utc_now()

    request = build_request(grant)

    session = AsyncMock()
    session.execute.return_value = scalar_result(grant)

    decrypt_mock = MagicMock()

    monkeypatch.setattr(
        grant_service,
        "decrypt_invite_code",
        decrypt_mock,
    )

    result = await grant_service.get_applicant_access(
        session,
        verification_request=request,
        discord_user_id=DISCORD_USER_ID,
    )

    assert result == (grant, None)
    assert grant.status == AccessGrantStatus.CONSUMED

    decrypt_mock.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_applicant_access_returns_revoked_grant_without_invite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    grant = build_grant(
        status=AccessGrantStatus.REVOKED,
    )
    grant.revoked_at = utc_now()

    request = build_request(grant)

    session = AsyncMock()
    session.execute.return_value = scalar_result(grant)

    decrypt_mock = MagicMock()

    monkeypatch.setattr(
        grant_service,
        "decrypt_invite_code",
        decrypt_mock,
    )

    result = await grant_service.get_applicant_access(
        session,
        verification_request=request,
        discord_user_id=DISCORD_USER_ID,
    )

    assert result == (grant, None)
    assert grant.status == AccessGrantStatus.REVOKED

    decrypt_mock.assert_not_called()
    session.commit.assert_not_awaited()
