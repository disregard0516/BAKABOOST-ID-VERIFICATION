import logging
from datetime import timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import (
    AccessGrantStatus,
    ActorType,
    AuditAction,
    VerificationStatus,
)
from app.db.models.discord_access_grant import (
    DiscordAccessGrant,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.services.access.crypto import (
    decrypt_invite_code,
    encrypt_invite_code,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.discord.dm import (
    send_approval_dm,
)
from app.services.discord.invites import (
    create_targeted_discord_invite,
    delete_discord_invite,
)
from app.utils.time import utc_now

logger = logging.getLogger(__name__)


class AccessGrantError(ValueError):
    pass


async def issue_access_grant(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    ip_address: str | None = None,
) -> DiscordAccessGrant:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise AccessGrantError(
            "Verification request not found."
        )

    if request.status != VerificationStatus.APPROVED:
        raise AccessGrantError(
            "Discord access can only be granted "
            "after approval."
        )

    existing_result = await session.execute(
        select(DiscordAccessGrant).where(
            DiscordAccessGrant.verification_request_id
            == request.id
        )
    )

    existing = existing_result.scalar_one_or_none()

    if (
        existing is not None
        and existing.status
        in {
            AccessGrantStatus.ISSUED,
            AccessGrantStatus.CONSUMED,
        }
    ):
        raise AccessGrantError(
            "An access grant already exists."
        )

    approved_discord_id = (
        request.assigned_discord_user_id
    )

    invite_code = await create_targeted_discord_invite(
        discord_user_id=approved_discord_id
    )

    grant_committed = False

    try:
        encrypted_reference = encrypt_invite_code(
            invite_code
        )

        now = utc_now()

        expires_at = (
            now
            + timedelta(
                seconds=(
                    settings.discord_invite_max_age_seconds
                )
            )
        )

        if existing is None:
            grant = DiscordAccessGrant(
                verification_request_id=request.id,
                discord_user_id=approved_discord_id,
                status=AccessGrantStatus.ISSUED,
                invite_reference=encrypted_reference,
                issued_at=now,
                expires_at=expires_at,
                created_at=now,
                updated_at=now,
            )

            session.add(grant)

        else:
            grant = existing

            grant.discord_user_id = approved_discord_id
            grant.status = AccessGrantStatus.ISSUED
            grant.invite_reference = encrypted_reference
            grant.issued_at = now
            grant.expires_at = expires_at
            grant.consumed_at = None
            grant.revoked_at = None
            grant.updated_at = now

        request.access_granted_at = now
        request.access_grant_expires_at = expires_at
        request.updated_at = now
        request.last_activity_at = now

        await record_audit_event(
            session,
            actor_type=ActorType.ADMIN.value,
            actor_id=str(admin_id),
            action=AuditAction.ACCESS_GRANTED.value,
            verification_request_id=request.id,
            metadata={
                "discord_user_id": str(
                    approved_discord_id
                ),
                "expires_at": expires_at.isoformat(),
                "max_uses": (
                    settings.discord_invite_max_uses
                ),
            },
            ip_address=ip_address,
        )

        await session.commit()
        grant_committed = True

    except Exception:
        try:
            await session.rollback()
        except Exception:
            logger.exception(
                "Unable to roll back failed Discord access "
                "grant transaction for verification request %s.",
                request.id,
            )

        if not grant_committed:
            try:
                await delete_discord_invite(invite_code)
            except Exception:
                logger.exception(
                    "Unable to clean up Discord invite after "
                    "failed access grant transaction for "
                    "verification request %s.",
                    request.id,
                )

        raise

    await session.refresh(grant)

    dm_action = AuditAction.ACCESS_DM_SENT.value
    dm_metadata = {
        "discord_user_id": str(
            approved_discord_id
        ),
    }

    try:
        await send_approval_dm(
            discord_user_id=approved_discord_id,
            invite_code=invite_code,
        )

    except Exception as exc:
        dm_action = AuditAction.ACCESS_DM_FAILED.value
        dm_metadata["error_type"] = type(exc).__name__

        logger.exception(
            "Approval DM delivery failed for Discord user %s; "
            "the committed access grant remains valid.",
            approved_discord_id,
        )

    try:
        await record_audit_event(
            session,
            actor_type=ActorType.SYSTEM.value,
            actor_id=None,
            action=dm_action,
            verification_request_id=request.id,
            metadata=dm_metadata,
            ip_address=None,
        )
        await session.commit()

    except Exception:
        logger.exception(
            "Unable to persist approval DM audit event for "
            "verification request %s; the committed access "
            "grant remains valid.",
            request.id,
        )

        try:
            await session.rollback()
        except Exception:
            logger.exception(
                "Unable to roll back failed approval DM "
                "audit transaction for verification request %s.",
                request.id,
            )

    return grant


async def expire_grant_if_needed(
    session: AsyncSession,
    *,
    grant: DiscordAccessGrant,
) -> bool:
    if grant.status != AccessGrantStatus.ISSUED:
        return False

    if (
        grant.expires_at is None
        or grant.expires_at > utc_now()
    ):
        return False

    grant.status = AccessGrantStatus.EXPIRED
    grant.updated_at = utc_now()

    await session.commit()

    return True


async def get_applicant_access(
    session: AsyncSession,
    *,
    verification_request: VerificationRequest,
    discord_user_id: int,
) -> tuple[
    DiscordAccessGrant,
    str | None,
] | None:
    if (
        verification_request.status
        != VerificationStatus.APPROVED
    ):
        return None

    if (
        discord_user_id
        != verification_request.assigned_discord_user_id
    ):
        raise AccessGrantError(
            "Access unavailable."
        )

    result = await session.execute(
        select(DiscordAccessGrant).where(
            DiscordAccessGrant.verification_request_id
            == verification_request.id
        )
    )

    grant = result.scalar_one_or_none()

    if grant is None:
        return None

    await expire_grant_if_needed(
        session,
        grant=grant,
    )

    if grant.discord_user_id != discord_user_id:
        raise AccessGrantError(
            "Access unavailable."
        )

    if grant.status != AccessGrantStatus.ISSUED:
        return grant, None

    if not grant.invite_reference:
        return None

    invite_code = decrypt_invite_code(
        grant.invite_reference
    )

    return grant, invite_code


async def revoke_access_grant(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    ip_address: str | None = None,
) -> DiscordAccessGrant:
    result = await session.execute(
        select(DiscordAccessGrant)
        .where(
            DiscordAccessGrant.verification_request_id
            == request_id
        )
        .with_for_update()
    )

    grant = result.scalar_one_or_none()

    if grant is None:
        raise AccessGrantError(
            "Access grant not found."
        )

    if grant.status == AccessGrantStatus.REVOKED:
        return grant

    if (
        grant.invite_reference
        and grant.status == AccessGrantStatus.ISSUED
    ):
        invite_code = decrypt_invite_code(
            grant.invite_reference
        )

        await delete_discord_invite(
            invite_code=invite_code
        )

    now = utc_now()

    grant.status = AccessGrantStatus.REVOKED
    grant.revoked_at = now
    grant.updated_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.ACCESS_REVOKED.value,
        verification_request_id=request_id,
        metadata={
            "discord_user_id": str(
                grant.discord_user_id
            )
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(grant)

    return grant


async def list_issued_access_grant_discord_user_ids(
    session: AsyncSession,
) -> list[int]:
    """
    Return Discord user IDs that currently have an ISSUED access grant.

    Each candidate is revalidated separately before Discord access is
    assigned, so this function intentionally does not consume grants.
    """

    result = await session.execute(
        select(DiscordAccessGrant.discord_user_id)
        .where(
            DiscordAccessGrant.status
            == AccessGrantStatus.ISSUED
        )
        .distinct()
    )

    return [
        int(discord_user_id)
        for discord_user_id in result.scalars().all()
    ]


async def get_eligible_access_grant_for_discord_user(
    session: AsyncSession,
    *,
    discord_user_id: int,
) -> DiscordAccessGrant | None:
    """
    Return the currently eligible issued grant for an exact
    Discord user without consuming it.

    This check happens before Discord role assignment. The grant
    must be revalidated by consume_access_grant_for_discord_user()
    after the role assignment succeeds.
    """

    result = await session.execute(
        select(DiscordAccessGrant)
        .where(
            DiscordAccessGrant.discord_user_id
            == discord_user_id,
            DiscordAccessGrant.status
            == AccessGrantStatus.ISSUED,
        )
        .order_by(
            DiscordAccessGrant.issued_at.desc()
        )
    )

    grant = result.scalars().first()

    if grant is None:
        return None

    now = utc_now()

    if (
        grant.expires_at is None
        or grant.expires_at <= now
    ):
        if (
            grant.expires_at is not None
            and grant.expires_at <= now
        ):
            grant.status = AccessGrantStatus.EXPIRED
            grant.updated_at = now
            await session.commit()

        return None

    request_result = await session.execute(
        select(VerificationRequest).where(
            VerificationRequest.id
            == grant.verification_request_id
        )
    )

    request = request_result.scalar_one_or_none()

    if (
        request is None
        or request.status
        != VerificationStatus.APPROVED
        or request.assigned_discord_user_id
        != discord_user_id
    ):
        return None

    return grant


async def consume_access_grant_for_discord_user(
    session: AsyncSession,
    *,
    grant_id: UUID,
    discord_user_id: int,
    source: str = "discord_guild_join",
) -> DiscordAccessGrant | None:
    """
    Atomically consume one specific access grant after Discord
    access has successfully been assigned.

    The grant and verification request are revalidated while
    locked so a revoke, expiry, or identity mismatch cannot be
    bypassed between eligibility check and role assignment.
    """

    result = await session.execute(
        select(DiscordAccessGrant)
        .where(
            DiscordAccessGrant.id == grant_id,
            DiscordAccessGrant.discord_user_id
            == discord_user_id,
            DiscordAccessGrant.status
            == AccessGrantStatus.ISSUED,
        )
        .with_for_update()
    )

    grant = result.scalar_one_or_none()

    if grant is None:
        return None

    now = utc_now()

    if (
        grant.expires_at is None
        or grant.expires_at <= now
    ):
        if (
            grant.expires_at is not None
            and grant.expires_at <= now
        ):
            grant.status = AccessGrantStatus.EXPIRED
            grant.updated_at = now
            await session.commit()

        return None

    request_result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id
            == grant.verification_request_id
        )
        .with_for_update()
    )

    request = request_result.scalar_one_or_none()

    if (
        request is None
        or request.status
        != VerificationStatus.APPROVED
        or request.assigned_discord_user_id
        != discord_user_id
    ):
        await session.rollback()
        return None

    grant.status = AccessGrantStatus.CONSUMED
    grant.consumed_at = now
    grant.updated_at = now

    request.last_activity_at = now
    request.updated_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.SYSTEM.value,
        actor_id="discord_bot",
        action=AuditAction.ACCESS_CONSUMED.value,
        verification_request_id=request.id,
        metadata={
            "discord_user_id": str(discord_user_id),
            "source": source,
        },
    )

    await session.commit()
    await session.refresh(grant)

    return grant

