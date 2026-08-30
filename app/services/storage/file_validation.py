import hashlib
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


class InvalidEvidenceFileError(ValueError):
    pass


@dataclass(frozen=True)
class ValidatedFile:
    content: bytes
    content_type: str
    size_bytes: int
    checksum_sha256: str


GENERIC_UPLOAD_CONTENT_TYPES = {
    "",
    "application/octet-stream",
}

ALLOWED_EXTENSIONS_BY_TYPE: dict[
    str,
    set[str],
] = {
    "image/jpeg": {
        ".jpg",
        ".jpeg",
    },
    "image/png": {
        ".png",
    },
    "image/webp": {
        ".webp",
    },
    "application/pdf": {
        ".pdf",
    },
}

SUSPICIOUS_PDF_MARKERS = (
    b"/JavaScript",
    b"/JS",
    b"/Launch",
    b"/EmbeddedFile",
    b"/RichMedia",
)


def _allowed_content_types() -> set[str]:
    return {
        item.strip().lower()
        for item
        in settings.evidence_allowed_content_types.split(
            ","
        )
        if item.strip()
    }


def _normalize_content_type(
    value: str | None,
) -> str:
    if not value:
        return ""

    return (
        value
        .split(
            ";",
            maxsplit=1,
        )[0]
        .strip()
        .lower()
    )


def detect_file_type(
    content: bytes,
) -> str | None:
    if (
        len(content) >= 4
        and content.startswith(
            b"\xff\xd8\xff"
        )
    ):
        return "image/jpeg"

    if (
        len(content) >= 8
        and content.startswith(
            b"\x89PNG\r\n\x1a\n"
        )
    ):
        return "image/png"

    if (
        len(content) >= 12
        and content.startswith(
            b"RIFF"
        )
        and content[8:12]
        == b"WEBP"
    ):
        return "image/webp"

    if (
        len(content) >= 8
        and content.startswith(
            b"%PDF-"
        )
    ):
        return "application/pdf"

    return None


def _validate_jpeg(
    content: bytes,
) -> None:
    if len(content) < 4:
        raise InvalidEvidenceFileError(
            "Invalid JPEG file."
        )

    if not content.endswith(
        b"\xff\xd9"
    ):
        raise InvalidEvidenceFileError(
            "JPEG file appears incomplete."
        )


def _validate_png(
    content: bytes,
) -> None:
    if len(content) < 20:
        raise InvalidEvidenceFileError(
            "Invalid PNG file."
        )

    if b"IEND" not in content[-32:]:
        raise InvalidEvidenceFileError(
            "PNG file appears incomplete."
        )


def _validate_webp(
    content: bytes,
) -> None:
    if len(content) < 12:
        raise InvalidEvidenceFileError(
            "Invalid WebP file."
        )

    declared_size = int.from_bytes(
        content[4:8],
        byteorder="little",
        signed=False,
    )

    expected_size = declared_size + 8

    if expected_size != len(
        content
    ):
        raise InvalidEvidenceFileError(
            "WebP file appears malformed."
        )


def _validate_pdf(
    content: bytes,
) -> None:
    if len(content) < 8:
        raise InvalidEvidenceFileError(
            "Invalid PDF file."
        )

    #
    # PDF allows whitespace after %%EOF,
    # so inspect the trimmed tail.
    #
    trimmed = content.rstrip()

    if not trimmed.endswith(
        b"%%EOF"
    ):
        raise InvalidEvidenceFileError(
            "PDF file appears incomplete."
        )

    #
    # Evidence PDFs should be passive
    # documents. Reject obvious active or
    # embedded-content features.
    #
    for marker in (
        SUSPICIOUS_PDF_MARKERS
    ):
        if marker in content:
            raise InvalidEvidenceFileError(
                "PDF contains unsupported active content."
            )


def _validate_file_structure(
    content: bytes,
    content_type: str,
) -> None:
    if content_type == "image/jpeg":
        _validate_jpeg(
            content
        )
        return

    if content_type == "image/png":
        _validate_png(
            content
        )
        return

    if content_type == "image/webp":
        _validate_webp(
            content
        )
        return

    if content_type == "application/pdf":
        _validate_pdf(
            content
        )
        return

    raise InvalidEvidenceFileError(
        "Unsupported file format."
    )


def _validate_declared_content_type(
    upload: UploadFile,
    detected_type: str,
) -> None:
    declared_type = (
        _normalize_content_type(
            upload.content_type
        )
    )

    if (
        declared_type
        in GENERIC_UPLOAD_CONTENT_TYPES
    ):
        return

    if declared_type != detected_type:
        raise InvalidEvidenceFileError(
            "Uploaded file type does not match its content."
        )


def _validate_filename_extension(
    upload: UploadFile,
    detected_type: str,
) -> None:
    #
    # Filename is never trusted for type
    # detection, but an obviously conflicting
    # extension is useful to reject.
    #
    filename = (
        upload.filename or ""
    ).strip()

    if not filename:
        return

    extension = (
        Path(filename)
        .suffix
        .lower()
    )

    if not extension:
        return

    allowed_extensions = (
        ALLOWED_EXTENSIONS_BY_TYPE
        .get(
            detected_type,
            set(),
        )
    )

    if (
        allowed_extensions
        and extension
        not in allowed_extensions
    ):
        raise InvalidEvidenceFileError(
            "File extension does not match its content."
        )


async def validate_evidence_upload(
    upload: UploadFile,
) -> ValidatedFile:
    max_size = (
        settings
        .evidence_max_file_size_bytes
    )

    if max_size <= 0:
        raise RuntimeError(
            "Evidence maximum file size is invalid."
        )

    content = await upload.read(
        max_size + 1
    )

    if not content:
        raise InvalidEvidenceFileError(
            "Uploaded file is empty."
        )

    if len(content) > max_size:
        raise InvalidEvidenceFileError(
            "Uploaded file exceeds the allowed size."
        )

    detected_type = detect_file_type(
        content
    )

    if detected_type is None:
        raise InvalidEvidenceFileError(
            "Unsupported or invalid file format."
        )

    allowed_types = (
        _allowed_content_types()
    )

    if detected_type not in allowed_types:
        raise InvalidEvidenceFileError(
            "File type is not allowed."
        )

    _validate_declared_content_type(
        upload,
        detected_type,
    )

    _validate_filename_extension(
        upload,
        detected_type,
    )

    _validate_file_structure(
        content,
        detected_type,
    )

    checksum = hashlib.sha256(
        content
    ).hexdigest()

    return ValidatedFile(
        content=content,
        content_type=(
            detected_type
        ),
        size_bytes=len(
            content
        ),
        checksum_sha256=(
            checksum
        ),
    )