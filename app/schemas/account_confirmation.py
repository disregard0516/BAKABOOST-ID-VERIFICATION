from pydantic import BaseModel


class DiscordAccountConfirmationResponse(BaseModel):
    discord_user_id: str
    username: str
    avatar_url: str | None