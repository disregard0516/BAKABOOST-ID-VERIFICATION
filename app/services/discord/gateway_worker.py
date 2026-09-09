from __future__ import annotations

import asyncio
import logging
from uuid import UUID

import discord

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.access.grant_service import (
    consume_access_grant_for_discord_user,
    get_eligible_access_grant_for_discord_user,
    list_issued_access_grant_discord_user_ids,
)

logger = logging.getLogger("bakaboost.discord.gateway")

RECONCILIATION_INTERVAL_SECONDS = 10.0


class DiscordGatewayConfigurationError(RuntimeError):
    pass


def _required_discord_id(
    value: str,
    *,
    setting_name: str,
) -> int:
    raw_value = value.strip()

    if not raw_value:
        raise DiscordGatewayConfigurationError(
            f"{setting_name} is required."
        )

    try:
        parsed_value = int(raw_value)
    except ValueError as exc:
        raise DiscordGatewayConfigurationError(
            f"{setting_name} must be a Discord snowflake ID."
        ) from exc

    if parsed_value <= 0:
        raise DiscordGatewayConfigurationError(
            f"{setting_name} must be a positive Discord snowflake ID."
        )

    return parsed_value


def _load_gateway_configuration() -> tuple[str, int, int]:
    token = settings.discord_bot_token.strip()

    if not token:
        raise DiscordGatewayConfigurationError(
            "DISCORD_BOT_TOKEN is required."
        )

    guild_id = _required_discord_id(
        settings.discord_guild_id,
        setting_name="DISCORD_GUILD_ID",
    )

    verified_role_id = _required_discord_id(
        settings.discord_verified_role_id,
        setting_name="DISCORD_VERIFIED_ROLE_ID",
    )

    return token, guild_id, verified_role_id


class BakaboostDiscordClient(discord.Client):
    def __init__(
        self,
        *,
        guild_id: int,
        verified_role_id: int,
    ) -> None:
        intents = discord.Intents.none()
        intents.guilds = True
        intents.members = True

        super().__init__(
            intents=intents,
        )

        self.guild_id = guild_id
        self.verified_role_id = verified_role_id
        self._reconciliation_task: asyncio.Task[None] | None = None

    async def on_ready(self) -> None:
        if self.user is None:
            logger.error(
                "Discord Gateway connected without a bot user."
            )
            return

        logger.info(
            "Discord Gateway ready as bot user %s (%s).",
            self.user,
            self.user.id,
        )

        guild = self.get_guild(
            self.guild_id
        )

        if guild is None:
            logger.error(
                "Configured Discord guild %s is unavailable "
                "to the bot.",
                self.guild_id,
            )
            return

        role = guild.get_role(
            self.verified_role_id
        )

        if role is None:
            logger.error(
                "Configured verified role %s does not exist "
                "in guild %s.",
                self.verified_role_id,
                guild.id,
            )
            return

        logger.info(
            "BAKABOOST Discord enforcement ready for guild %s "
            "with verified role %s.",
            guild.id,
            role.id,
        )

        await self._reconcile_existing_members(
            guild=guild,
            role=role,
        )

        self._ensure_reconciliation_task()

    def _ensure_reconciliation_task(self) -> None:
        if (
            self._reconciliation_task is not None
            and not self._reconciliation_task.done()
        ):
            return

        self._reconciliation_task = asyncio.create_task(
            self._reconciliation_loop(),
            name="bakaboost-discord-reconciliation",
        )

    async def _reconciliation_loop(self) -> None:
        while not self.is_closed():
            await asyncio.sleep(
                RECONCILIATION_INTERVAL_SECONDS
            )

            guild = self.get_guild(
                self.guild_id
            )

            if guild is None:
                logger.warning(
                    "Periodic Discord reconciliation skipped: "
                    "guild %s is unavailable.",
                    self.guild_id,
                )
                continue

            role = guild.get_role(
                self.verified_role_id
            )

            if role is None:
                logger.warning(
                    "Periodic Discord reconciliation skipped: "
                    "verified role %s is unavailable in guild %s.",
                    self.verified_role_id,
                    guild.id,
                )
                continue

            try:
                await self._reconcile_existing_members(
                    guild=guild,
                    role=role,
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(
                    "Periodic Discord reconciliation failed for "
                    "guild %s; the worker will retry.",
                    guild.id,
                )

    async def close(self) -> None:
        reconciliation_task = self._reconciliation_task

        if (
            reconciliation_task is not None
            and not reconciliation_task.done()
        ):
            reconciliation_task.cancel()

            try:
                await reconciliation_task
            except asyncio.CancelledError:
                pass

        await super().close()

    async def on_member_join(
        self,
        member: discord.Member,
    ) -> None:
        if member.guild.id != self.guild_id:
            return

        if member.bot:
            logger.info(
                "Ignoring bot join for Discord user %s.",
                member.id,
            )
            return

        grant_id = await self._find_eligible_grant_id(
            discord_user_id=member.id,
        )

        if grant_id is None:
            logger.warning(
                "Discord user %s joined guild %s without an "
                "eligible BAKABOOST access grant.",
                member.id,
                member.guild.id,
            )

            #
            # Deliberately do not kick or quarantine yet.
            # Unauthorized-join policy must be explicitly
            # finalized before enforcement is enabled.
            #
            return

        role = member.guild.get_role(
            self.verified_role_id
        )

        if role is None:
            logger.error(
                "Cannot grant Discord access to user %s: "
                "verified role %s is unavailable.",
                member.id,
                self.verified_role_id,
            )
            return

        role_present_before = role in member.roles

        try:
            if not role_present_before:
                await member.add_roles(
                    role,
                    reason=(
                        "BAKABOOST approved identity "
                        "verification"
                    ),
                )

            consumed = await self._consume_grant(
                grant_id=grant_id,
                discord_user_id=member.id,
            )

            if consumed:
                logger.info(
                    "Discord access granted and consumed for "
                    "user %s using grant %s.",
                    member.id,
                    grant_id,
                )
                return

            logger.warning(
                "Discord grant %s for user %s became "
                "ineligible before final consumption.",
                grant_id,
                member.id,
            )

            await self._remove_role_after_failed_consumption(
                member=member,
                role=role,
                grant_id=grant_id,
            )

        except discord.Forbidden:
            logger.exception(
                "Discord denied role management for user %s.",
                member.id,
            )

        except discord.HTTPException:
            logger.exception(
                "Discord API error while granting access to "
                "user %s.",
                member.id,
            )

        except Exception:
            logger.exception(
                "Unexpected Discord access enforcement failure "
                "for user %s.",
                member.id,
            )

            await self._remove_role_after_failed_consumption(
                member=member,
                role=role,
                grant_id=grant_id,
            )

    async def _reconcile_existing_members(
        self,
        *,
        guild: discord.Guild,
        role: discord.Role,
    ) -> None:
        async with AsyncSessionLocal() as session:
            discord_user_ids = await (
                list_issued_access_grant_discord_user_ids(
                    session
                )
            )

        if not discord_user_ids:
            return

        logger.info(
            "Reconciling %s issued Discord access grant(s) "
            "against existing guild members.",
            len(discord_user_ids),
        )

        for discord_user_id in discord_user_ids:
            member = guild.get_member(
                discord_user_id
            )

            if member is None:
                try:
                    member = await guild.fetch_member(
                        discord_user_id
                    )
                except discord.NotFound:
                    continue
                except discord.Forbidden:
                    logger.exception(
                        "Discord denied member lookup for "
                        "approved user %s in guild %s.",
                        discord_user_id,
                        guild.id,
                    )
                    continue
                except discord.HTTPException:
                    logger.exception(
                        "Discord API error while looking up "
                        "approved user %s in guild %s.",
                        discord_user_id,
                        guild.id,
                    )
                    continue

            if member.bot:
                continue

            await self._grant_existing_member_access(
                member=member,
                role=role,
            )

    async def _grant_existing_member_access(
        self,
        *,
        member: discord.Member,
        role: discord.Role,
    ) -> None:
        grant_id = await self._find_eligible_grant_id(
            discord_user_id=member.id,
        )

        if grant_id is None:
            return

        try:
            if role not in member.roles:
                await member.add_roles(
                    role,
                    reason=(
                        "BAKABOOST approved identity "
                        "verification"
                    ),
                )

            consumed = await self._consume_grant(
                grant_id=grant_id,
                discord_user_id=member.id,
                source="discord_existing_member",
            )

            if consumed:
                logger.info(
                    "Existing Discord member %s received access "
                    "and consumed grant %s.",
                    member.id,
                    grant_id,
                )
                return

            logger.warning(
                "Existing-member Discord grant %s for user %s "
                "became ineligible before final consumption.",
                grant_id,
                member.id,
            )

            await self._remove_role_after_failed_consumption(
                member=member,
                role=role,
                grant_id=grant_id,
            )

        except discord.Forbidden:
            logger.exception(
                "Discord denied role management for existing "
                "member %s.",
                member.id,
            )

        except discord.HTTPException:
            logger.exception(
                "Discord API error while reconciling existing "
                "member %s.",
                member.id,
            )

        except Exception:
            logger.exception(
                "Unexpected Discord reconciliation failure for "
                "existing member %s.",
                member.id,
            )

            await self._remove_role_after_failed_consumption(
                member=member,
                role=role,
                grant_id=grant_id,
            )

    async def _find_eligible_grant_id(
        self,
        *,
        discord_user_id: int,
    ) -> UUID | None:
        async with AsyncSessionLocal() as session:
            grant = await (
                get_eligible_access_grant_for_discord_user(
                    session,
                    discord_user_id=discord_user_id,
                )
            )

            if grant is None:
                return None

            return grant.id

    async def _consume_grant(
        self,
        *,
        grant_id: UUID,
        discord_user_id: int,
        source: str = "discord_guild_join",
    ) -> bool:
        async with AsyncSessionLocal() as session:
            grant = await (
                consume_access_grant_for_discord_user(
                    session,
                    grant_id=grant_id,
                    discord_user_id=discord_user_id,
                    source=source,
                )
            )

            return grant is not None

    async def _remove_role_after_failed_consumption(
        self,
        *,
        member: discord.Member,
        role: discord.Role,
        grant_id: UUID,
    ) -> None:
        try:
            await member.remove_roles(
                role,
                reason=(
                    "BAKABOOST access grant could not be "
                    "finalized"
                ),
            )

            logger.warning(
                "Removed verified role from user %s after "
                "grant %s failed final consumption.",
                member.id,
                grant_id,
            )

        except discord.Forbidden:
            logger.exception(
                "Discord denied compensating role removal "
                "for user %s after grant %s failed.",
                member.id,
                grant_id,
            )

        except discord.HTTPException:
            logger.exception(
                "Discord API error during compensating role "
                "removal for user %s after grant %s failed.",
                member.id,
                grant_id,
            )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format=(
            "%(asctime)s %(levelname)s "
            "%(name)s %(message)s"
        ),
    )

    token, guild_id, verified_role_id = (
        _load_gateway_configuration()
    )

    client = BakaboostDiscordClient(
        guild_id=guild_id,
        verified_role_id=verified_role_id,
    )

    client.run(
        token,
        log_handler=None,
    )


if __name__ == "__main__":
    main()
