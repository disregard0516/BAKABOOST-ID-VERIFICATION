from pydantic import BaseModel


class DiscordTokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str | None = None
    scope: str


class DiscordUser(BaseModel):
    id: str
    username: str

    discriminator: str | None = None
    global_name: str | None = None
    avatar: str | None = None