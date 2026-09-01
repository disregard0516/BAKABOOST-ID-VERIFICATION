from unittest.mock import MagicMock

import pytest

from app.services.storage import s3

TEST_BUCKET = "test-private-evidence-bucket"


@pytest.fixture(autouse=True)
def configure_s3_bucket(monkeypatch):
    """
    These tests validate S3 deletion behavior specifically.

    Local evidence fallback is tested separately and should not
    silently change the storage backend exercised by this file.
    """

    monkeypatch.setattr(
        s3.settings,
        "s3_bucket_name",
        TEST_BUCKET,
    )


def test_non_versioned_bucket_uses_delete_object(
    monkeypatch,
) -> None:
    client = MagicMock()

    client.get_bucket_versioning.return_value = {}

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


def test_versioned_bucket_deletes_versions_and_markers(
    monkeypatch,
) -> None:
    client = MagicMock()

    client.get_bucket_versioning.return_value = {
        "Status": "Enabled"
    }

    paginator = MagicMock()

    object_key = (
        "verification-evidence/"
        "request/document_front/object"
    )

    paginator.paginate.return_value = [
        {
            "Versions": [
                {
                    "Key": object_key,
                    "VersionId": "version-1",
                },
                {
                    "Key": object_key,
                    "VersionId": "version-2",
                },
                {
                    "Key": (
                        f"{object_key}-other"
                    ),
                    "VersionId": "do-not-delete",
                },
            ],
            "DeleteMarkers": [
                {
                    "Key": object_key,
                    "VersionId": "marker-1",
                }
            ],
        }
    ]

    client.get_paginator.return_value = paginator

    client.delete_objects.return_value = {}

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    s3.delete_private_object(
        object_key=object_key
    )

    client.delete_objects.assert_called_once_with(
        Bucket=TEST_BUCKET,
        Delete={
            "Objects": [
                {
                    "Key": object_key,
                    "VersionId": "version-1",
                },
                {
                    "Key": object_key,
                    "VersionId": "version-2",
                },
                {
                    "Key": object_key,
                    "VersionId": "marker-1",
                },
            ],
            "Quiet": True,
        },
    )


def test_versioned_deletion_ignores_neighboring_keys(
    monkeypatch,
) -> None:
    client = MagicMock()

    client.get_bucket_versioning.return_value = {
        "Status": "Enabled"
    }

    paginator = MagicMock()

    paginator.paginate.return_value = [
        {
            "Versions": [
                {
                    "Key": "evidence/object",
                    "VersionId": "correct",
                },
                {
                    "Key": "evidence/object-backup",
                    "VersionId": "neighbor",
                },
            ],
            "DeleteMarkers": [],
        }
    ]

    client.get_paginator.return_value = paginator
    client.delete_objects.return_value = {}

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    s3.delete_private_object(
        object_key="evidence/object"
    )

    delete_payload = (
        client.delete_objects
        .call_args.kwargs["Delete"]
        ["Objects"]
    )

    assert delete_payload == [
        {
            "Key": "evidence/object",
            "VersionId": "correct",
        }
    ]


def test_versioned_deletion_raises_on_s3_delete_errors(
    monkeypatch,
) -> None:
    client = MagicMock()

    client.get_bucket_versioning.return_value = {
        "Status": "Enabled"
    }

    paginator = MagicMock()

    paginator.paginate.return_value = [
        {
            "Versions": [
                {
                    "Key": "evidence/object",
                    "VersionId": "version-1",
                }
            ],
            "DeleteMarkers": [],
        }
    ]

    client.get_paginator.return_value = paginator

    client.delete_objects.return_value = {
        "Errors": [
            {
                "Key": "evidence/object",
                "VersionId": "version-1",
                "Code": "AccessDenied",
            }
        ]
    }

    monkeypatch.setattr(
        s3,
        "get_s3_client",
        lambda: client,
    )

    with pytest.raises(
        s3.StorageDeletionError
    ):
        s3.delete_private_object(
            object_key="evidence/object"
        )