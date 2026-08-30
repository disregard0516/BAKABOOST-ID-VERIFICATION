import secrets

from app.core.config import settings


class CSRFValidationError(Exception):
    pass


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(
        settings.csrf_token_bytes
    )


def validate_csrf_token(
    *,
    cookie_token: str | None,
    header_token: str | None,
) -> None:
    if not cookie_token or not header_token:
        raise CSRFValidationError()

    if not secrets.compare_digest(
        cookie_token,
        header_token,
    ):
        raise CSRFValidationError()