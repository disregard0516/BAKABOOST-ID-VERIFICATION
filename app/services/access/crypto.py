from cryptography.fernet import (
    Fernet,
    InvalidToken,
)

from app.core.config import settings


class AccessGrantCryptoError(RuntimeError):
    pass


def _fernet() -> Fernet:
    key = settings.access_grant_encryption_key.strip()

    if not key:
        raise AccessGrantCryptoError(
            "ACCESS_GRANT_ENCRYPTION_KEY is not configured."
        )

    try:
        return Fernet(
            key.encode("utf-8")
        )

    except Exception as exc:
        raise AccessGrantCryptoError(
            "Invalid access-grant encryption key."
        ) from exc


def encrypt_invite_code(
    invite_code: str,
) -> str:
    return (
        _fernet()
        .encrypt(
            invite_code.encode("utf-8")
        )
        .decode("utf-8")
    )


def decrypt_invite_code(
    encrypted_value: str,
) -> str:
    try:
        return (
            _fernet()
            .decrypt(
                encrypted_value.encode("utf-8")
            )
            .decode("utf-8")
        )

    except InvalidToken as exc:
        raise AccessGrantCryptoError(
            "Unable to decrypt access grant."
        ) from exc