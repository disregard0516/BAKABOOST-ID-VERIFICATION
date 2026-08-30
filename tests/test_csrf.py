import pytest

from app.services.security.csrf import (
    CSRFValidationError,
    generate_csrf_token,
    validate_csrf_token,
)


def test_matching_csrf_tokens_pass() -> None:
    token = generate_csrf_token()

    validate_csrf_token(
        cookie_token=token,
        header_token=token,
    )


def test_wrong_csrf_token_fails() -> None:
    with pytest.raises(
        CSRFValidationError
    ):
        validate_csrf_token(
            cookie_token="one",
            header_token="two",
        )


def test_missing_csrf_token_fails() -> None:
    with pytest.raises(
        CSRFValidationError
    ):
        validate_csrf_token(
            cookie_token=None,
            header_token=None,
        )