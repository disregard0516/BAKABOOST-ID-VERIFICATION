from functools import lru_cache

import boto3
from botocore.client import BaseClient

from app.core.config import settings


class StorageConfigurationError(RuntimeError):
    pass


@lru_cache
def get_s3_client() -> BaseClient:
    """
    Return the configured private S3-compatible storage client.

    Production uses Cloudflare R2 through its S3-compatible API.
    The client is cached because configuration is immutable for the
    lifetime of the application process.
    """
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
    """
    Upload one evidence object to private object storage.

    No public ACL is applied. Public access must also remain disabled
    at the bucket/provider level.
    """
    client = get_s3_client()

    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
        Body=content,
        ContentType=content_type,
    )


def delete_private_object(
    *,
    object_key: str,
) -> None:
    """
    Physically delete one exact private evidence object.

    BAKABOOST production storage uses Cloudflare R2. R2 implements
    the S3 DeleteObject operation but does not implement S3 bucket
    versioning APIs such as GetBucketVersioning.

    Therefore deletion intentionally targets only the exact object
    key with DeleteObject and performs no version-discovery calls.

    DeleteObject is safe for the application's cleanup and manual
    evidence-deletion flows and does not prefix-match neighboring
    evidence objects.
    """
    client = get_s3_client()

    client.delete_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
    )


def create_signed_read_url(
    *,
    object_key: str,
) -> str:
    """
    Create a short-lived signed URL for one private evidence object.
    """
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


def open_private_object(
    *,
    object_key: str,
):
    """
    Open one private evidence object for server-side streaming.

    The returned S3 response contains a StreamingBody under
    ``Body``. Callers are responsible for closing that body
    after streaming completes.

    Evidence bytes remain private: the browser never receives
    object-storage credentials or a direct R2 object URL.
    """
    client = get_s3_client()

    return client.get_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
    )
