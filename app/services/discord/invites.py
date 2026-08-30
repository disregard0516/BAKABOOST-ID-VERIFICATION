import io

import httpx

from app.core.config import settings


class DiscordInviteError(RuntimeError):
    pass


async def create_targeted_discord_invite(
    *,
    discord_user_id: int,
) -> str:
    if not settings.discord_bot_token:
        raise DiscordInviteError(
            "Discord bot token is not configured."
        )

    if not settings.discord_invite_channel_id:
        raise DiscordInviteError(
            "Discord invite channel is not configured."
        )

    endpoint = (
        f"{settings.discord_api_base_url}"
        f"/channels/"
        f"{settings.discord_invite_channel_id}"
        "/invites"
    )

    headers = {
        "Authorization": (
            f"Bot {settings.discord_bot_token}"
        ),
        "X-Audit-Log-Reason": (
            "Approved identity verification access grant"
        ),
    }

    csv_content = (
        "user_id\n"
        f"{discord_user_id}\n"
    )

    files = {
        "target_users_file": (
            "target-users.csv",
            io.BytesIO(
                csv_content.encode("utf-8")
            ),
            "text/csv",
        ),
    }

    data = {
        "payload_json": (
            "{"
            f'"max_age":'
            f'{settings.discord_invite_max_age_seconds},'
            f'"max_uses":'
            f'{settings.discord_invite_max_uses},'
            '"temporary":false,'
            '"unique":true'
            "}"
        )
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:
            response = await client.post(
                endpoint,
                headers=headers,
                data=data,
                files=files,
            )

    except httpx.HTTPError as exc:
        raise DiscordInviteError(
            "Discord invite creation failed."
        ) from exc

    if response.status_code not in {
        200,
        201,
    }:
        raise DiscordInviteError(
            "Discord rejected invite creation."
        )

    try:
        payload = response.json()
        invite_code = payload["code"]

    except Exception as exc:
        raise DiscordInviteError(
            "Discord returned an invalid invite response."
        ) from exc

    return str(invite_code)

async def delete_discord_invite(
    *,
    invite_code: str,
) -> None:
    endpoint = (
        f"{settings.discord_api_base_url}"
        f"/invites/{invite_code}"
    )

    headers = {
        "Authorization": (
            f"Bot {settings.discord_bot_token}"
        ),
        "X-Audit-Log-Reason": (
            "Verification access revoked"
        ),
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:
            response = await client.delete(
                endpoint,
                headers=headers,
            )

    except httpx.HTTPError as exc:
        raise DiscordInviteError(
            "Unable to revoke Discord invite."
        ) from exc

    if response.status_code not in {
        200,
        204,
        404,
    }:
        raise DiscordInviteError(
            "Discord rejected invite revocation."
        )