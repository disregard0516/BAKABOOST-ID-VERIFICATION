import hashlib
import hmac
import secrets

from app.core.config import settings


class SecurityConfigurationError(RuntimeError):
    pass


def _get_token_pepper() -> bytes:
    pepper = settings.verification_token_pepper.strip()

    if not pepper or pepper == "CHANGE_ME_IN_ENV":
        raise SecurityConfigurationError(
            "VERIFICATION_TOKEN_PEPPER must be configured securely."
        )

    return pepper.encode("utf-8")


def generate_verification_token() -> str:
    """
    Generate a high-entropy URL-safe token.

    The raw token is returned to the caller once and must never be stored
    in the database or application logs.
    """
    return secrets.token_urlsafe(
        settings.verification_token_bytes
    )


def hash_verification_token(raw_token: str) -> str:
    """
    Derive the database-safe token representation using HMAC-SHA256.
    """
    if not raw_token:
        raise ValueError("Verification token cannot be empty.")

    return hmac.new(
        key=_get_token_pepper(),
        msg=raw_token.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()


def verification_tokens_match(
    raw_token: str,
    stored_hash: str,
) -> bool:
    candidate_hash = hash_verification_token(raw_token)

    return hmac.compare_digest(
        candidate_hash,
        stored_hash,
    )

def generate_secure_token(
    byte_length: int = 32,
) -> str:
    if byte_length < 16:
        raise ValueError(
            "Secure token length is too small."
        )

    return secrets.token_urlsafe(byte_length)


def sha256_token(
    raw_token: str,
) -> str:
    if not raw_token:
        raise ValueError(
            "Token cannot be empty."
        )

    return hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()