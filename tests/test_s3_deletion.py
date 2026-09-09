from unittest.mock import MagicMock

import pytest

from app.services.storage import s3

TEST_BUCKET = "test-private-evidence-bucket"


@pytest.fixture(autouse=True)
def configure_s3_bucket(monkeypatch):
    """
    Configure an isolated private evidence bucket for storage
    deletion tests.
    """
    monkeypatch.setattr(
        s3.settings,
        "s3_bucket_name",
        TEST_BUCKET,
    )


def test_delete_private_object_uses_exact_delete_object(
    monkeypatch,
) -> None:
    client = MagicMock()

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    object_key = (
        "verification-evidence/"
        "request/document_front/object"
    )

    s3.delete_private_object(
        object_key=object_key
    )

    client.delete_object.assert_called_once_with(
        Bucket=TEST_BUCKET,
        Key=object_key,
    )


def test_delete_private_object_does_not_use_versioning_apis(
    monkeypatch,
) -> None:
    client = MagicMock()

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    object_key = "evidence/object"

    s3.delete_private_object(
        object_key=object_key
    )

    client.get_bucket_versioning.assert_not_called()
    client.get_paginator.assert_not_called()
    client.delete_objects.assert_not_called()

    client.delete_object.assert_called_once_with(
        Bucket=TEST_BUCKET,
        Key=object_key,
    )


def test_delete_private_object_does_not_modify_neighboring_keys(
    monkeypatch,
) -> None:
    client = MagicMock()

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    object_key = "evidence/object"

    s3.delete_private_object(
        object_key=object_key
    )

    assert client.delete_object.call_count == 1
    assert (
        client.delete_object.call_args.kwargs
        == {
            "Bucket": TEST_BUCKET,
            "Key": object_key,
        }
    )
