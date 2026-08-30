from functools import lru_cache
from typing import Any

import boto3
from botocore.client import BaseClient

from app.core.config import settings


class StorageConfigurationError(RuntimeError):
    pass


class StorageDeletionError(RuntimeError):
    pass


@lru_cache
def get_s3_client() -> BaseClient:
    if not settings.s3_bucket_name:
        raise StorageConfigurationError(
            "S3_BUCKET_NAME is not configured."
        )

    return boto3.client(
        "s3",
        endpoint_url=(
            settings.s3_endpoint_url or None
        ),
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=(
            settings.s3_secret_access_key
        ),
    )


def upload_private_object(
    *,
    object_key: str,
    content: bytes,
    content_type: str,
) -> None:
    client = get_s3_client()

    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
        Body=content,
        ContentType=content_type,
    )


def _delete_object_versions(
    *,
    client: BaseClient,
    object_key: str,
) -> None:
    """
    Permanently remove every version and delete
    marker for one exact object key.

    Required when bucket versioning is Enabled or
    Suspended. Prefix matching is filtered back to
    the exact key so neighboring objects cannot be
    deleted accidentally.
    """
    paginator = client.get_paginator(
        "list_object_versions"
    )

    objects_to_delete: list[
        dict[str, str]
    ] = []

    for page in paginator.paginate(
        Bucket=settings.s3_bucket_name,
        Prefix=object_key,
    ):
        for version in page.get(
            "Versions",
            [],
        ):
            if (
                version.get("Key")
                == object_key
            ):
                objects_to_delete.append(
                    {
                        "Key": object_key,
                        "VersionId": (
                            version[
                                "VersionId"
                            ]
                        ),
                    }
                )

        for marker in page.get(
            "DeleteMarkers",
            [],
        ):
            if (
                marker.get("Key")
                == object_key
            ):
                objects_to_delete.append(
                    {
                        "Key": object_key,
                        "VersionId": (
                            marker[
                                "VersionId"
                            ]
                        ),
                    }
                )

    #
    # S3 DeleteObjects accepts at most
    # 1,000 objects per request.
    #
    for start in range(
        0,
        len(objects_to_delete),
        1000,
    ):
        batch = objects_to_delete[
            start : start + 1000
        ]

        if not batch:
            continue

        response: dict[str, Any] = (
            client.delete_objects(
                Bucket=settings.s3_bucket_name,
                Delete={
                    "Objects": batch,
                    "Quiet": True,
                },
            )
        )

        errors = response.get(
            "Errors",
            [],
        )

        if errors:
            raise StorageDeletionError(
                "One or more S3 object versions "
                "could not be deleted."
            )


def delete_private_object(
    *,
    object_key: str,
) -> None:
    """
    Physically remove a private evidence object.

    For a non-versioned bucket, DeleteObject is
    sufficient and is idempotent.

    For an Enabled/Suspended versioned bucket,
    every exact-key object version and delete
    marker is removed.
    """
    client = get_s3_client()

    versioning = (
        client.get_bucket_versioning(
            Bucket=settings.s3_bucket_name
        )
    )

    versioning_status = (
        versioning.get("Status")
    )

    if versioning_status in {
        "Enabled",
        "Suspended",
    }:
        _delete_object_versions(
            client=client,
            object_key=object_key,
        )

        return

    client.delete_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
    )


def create_signed_read_url(
    *,
    object_key: str,
) -> str:
    client = get_s3_client()

    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": object_key,
        },
        ExpiresIn=(
            settings
            .evidence_signed_url_ttl_seconds
        ),
    )