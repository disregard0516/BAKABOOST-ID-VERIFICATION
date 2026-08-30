from app.core.security import (
    generate_verification_token,
    hash_verification_token,
    verification_tokens_match,
)


def test_generated_tokens_are_unique() -> None:
    token_a = generate_verification_token()
    token_b = generate_verification_token()

    assert token_a != token_b


def test_generated_token_is_not_empty() -> None:
    token = generate_verification_token()

    assert token
    assert len(token) >= 32


def test_hash_does_not_equal_raw_token() -> None:
    token = generate_verification_token()
    token_hash = hash_verification_token(token)

    assert token_hash != token


def test_same_token_produces_same_hash() -> None:
    token = generate_verification_token()

    assert (
        hash_verification_token(token)
        == hash_verification_token(token)
    )


def test_correct_token_matches() -> None:
    token = generate_verification_token()
    stored_hash = hash_verification_token(token)

    assert verification_tokens_match(
        token,
        stored_hash,
    )


def test_wrong_token_does_not_match() -> None:
    token = generate_verification_token()
    stored_hash = hash_verification_token(token)

    assert not verification_tokens_match(
        generate_verification_token(),
        stored_hash,
    )