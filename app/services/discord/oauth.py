import logging
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.schemas.discord import (
    DiscordTokenResponse,
    DiscordUser,
)

logger = logging.getLogger(__name__)

class DiscordOAuthError(Exception):
    pass


def build_discord_authorization_url(
    *,
    state: str,
) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.discord_client_id,
        "scope": settings.discord_oauth_scope,
        "state": state,
        "redirect_uri": settings.discord_redirect_uri,
        "prompt": "consent",
    }

    return (
        f"{settings.discord_authorize_url}?"
        f"{urlencode(params)}"
    )


async def exchange_discord_code(
    *,
    code: str,
) -> DiscordTokenResponse:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.discord_redirect_uri,
    }

    auth = httpx.BasicAuth(
        settings.discord_client_id,
        settings.discord_client_secret,
    )

    headers = {
        "Content-Type": (
            "application/x-www-form-urlencoded"
        ),
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            response = await client.post(
                settings.discord_token_url,
                data=data,
                headers=headers,
                auth=auth,
            )

    except httpx.HTTPError as exc:
        raise DiscordOAuthError(
            "Discord OAuth token exchange failed."
        ) from exc

    if response.status_code != 200:
        try:
            error_payload = response.json()
            safe_error = {
                key: error_payload.get(key)
                for key in ("error", "error_description", "message", "code")
                if error_payload.get(key) is not None
            }
        except ValueError:
            safe_error = {"body": "<non-json response>"}

        logger.warning(
            "Discord OAuth token exchange rejected: status=%s error=%s",
            response.status_code,
            safe_error,
        )

        raise DiscordOAuthError(
            "Discord OAuth token exchange was rejected."
        )

    try:
        payload = response.json()

        return DiscordTokenResponse.model_validate(
            payload
        )

    except Exception as exc:
        raise DiscordOAuthError(
            "Discord returned an invalid OAuth response."
        ) from exc

async def fetch_discord_user(
    *,
    access_token: str,
) -> DiscordUser:
    headers = {
        "Authorization": (
            f"Bearer {access_token}"
        ),
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            response = await client.get(
                (
                    f"{settings.discord_api_base_url}"
                    "/users/@me"
                ),
                headers=headers,
            )

    except httpx.HTTPError as exc:
        raise DiscordOAuthError(
            "Unable to retrieve Discord account."
        ) from exc

    if response.status_code != 200:
        raise DiscordOAuthError(
            "Discord account lookup failed."
        )

    try:
        return DiscordUser.model_validate(
            response.json()
        )

    except Exception as exc:
        raise DiscordOAuthError(
            "Discord returned invalid account data."
        ) from exc