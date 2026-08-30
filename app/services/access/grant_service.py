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
from app.services.discord.invites import (
    create_targeted_discord_invite,
    delete_discord_invite,
)
from app.utils.time import utc_now


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
    await session.refresh(grant)

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
    str,
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

    expired = await expire_grant_if_needed(
        session,
        grant=grant,
    )

    if expired:
        return None

    if grant.status != AccessGrantStatus.ISSUED:
        return None

    if grant.discord_user_id != discord_user_id:
        raise AccessGrantError(
            "Access unavailable."
        )

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