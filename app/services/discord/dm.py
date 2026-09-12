import httpx

from app.core.config import settings


class DiscordDMError(RuntimeError):
    pass


async def send_approval_dm(
    *,
    discord_user_id: int,
    invite_code: str,
) -> None:
    if not settings.discord_bot_token:
        raise DiscordDMError(
            "Discord bot token is not configured."
        )

    create_dm_endpoint = (
        f"{settings.discord_api_base_url}"
        "/users/@me/channels"
    )

    headers = {
        "Authorization": (
            f"Bot {settings.discord_bot_token}"
        ),
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:
            dm_response = await client.post(
                create_dm_endpoint,
                headers=headers,
                json={
                    "recipient_id": str(
                        discord_user_id
                    )
                },
            )

            if dm_response.status_code not in {
                200,
                201,
            }:
                raise DiscordDMError(
                    "Discord rejected DM channel creation."
                )

            try:
                dm_payload = dm_response.json()
                channel_id = dm_payload["id"]
            except Exception as exc:
                raise DiscordDMError(
                    "Discord returned an invalid DM "
                    "channel response."
                ) from exc

            message_endpoint = (
                f"{settings.discord_api_base_url}"
                f"/channels/{channel_id}/messages"
            )

            invite_url = (
                f"https://discord.gg/{invite_code}"
            )

            message = (
                "Your SCANLY verification has been "
                "approved.\n\n"
                "Use this private access link to enter "
                "the Discord server:\n"
                f"{invite_url}\n\n"
                "This link is limited and expires shortly. "
                "Do not share it."
            )

            message_response = await client.post(
                message_endpoint,
                headers=headers,
                json={
                    "content": message,
                },
            )

    except DiscordDMError:
        raise
    except httpx.HTTPError as exc:
        raise DiscordDMError(
            "Discord approval DM request failed."
        ) from exc

    if message_response.status_code not in {
        200,
        201,
    }:
        raise DiscordDMError(
            "Discord rejected approval DM delivery."
        )
