from unittest.mock import MagicMock

from app.services.storage import s3


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

    s3.delete_private_object(
        object_key=(
            "verification-evidence/"
            "request/document_front/object"
        )
    )

    client.delete_object.assert_called_once_with(
        Bucket=s3.settings.s3_bucket_name,
        Key=(
            "verification-evidence/"
            "request/document_front/object"
        ),
    )

    client.get_paginator.assert_not_called()


def test_versioned_bucket_deletes_versions_and_markers(
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
                    "Key": (
                        "verification-evidence/"
                        "request/document_front/object"
                    ),
                    "VersionId": "version-1",
                },
                {
                    "Key": (
                        "verification-evidence/"
                        "request/document_front/object"
                    ),
                    "VersionId": "version-2",
                },
                {
                    "Key": (
                        "verification-evidence/"
                        "request/document_front/object-other"
                    ),
                    "VersionId": "do-not-delete",
                },
            ],
            "DeleteMarkers": [
                {
                    "Key": (
                        "verification-evidence/"
                        "request/document_front/object"
                    ),
                    "VersionId": "marker-1",
                }
            ],
        }
    ]

    client.get_paginator.return_value = (
        paginator
    )

    client.delete_objects.return_value = {}

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

    client.delete_objects.assert_called_once_with(
        Bucket=s3.settings.s3_bucket_name,
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

    client.delete_object.assert_not_called()


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

    client.get_paginator.return_value = (
        paginator
    )

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

    client.get_paginator.return_value = (
        paginator
    )

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

    try:
        s3.delete_private_object(
            object_key="evidence/object"
        )
    except s3.StorageDeletionError:
        pass
    else:
        raise AssertionError(
            "Expected StorageDeletionError"
        )