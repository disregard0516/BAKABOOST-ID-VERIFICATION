from app.services.storage.file_validation import (
    detect_file_type,
)


def test_detect_jpeg() -> None:
    assert detect_file_type(
        b"\xff\xd8\xffanything"
    ) == "image/jpeg"


def test_detect_png() -> None:
    assert detect_file_type(
        b"\x89PNG\r\n\x1a\nanything"
    ) == "image/png"


def test_detect_pdf() -> None:
    assert detect_file_type(
        b"%PDF-1.7 anything"
    ) == "application/pdf"


def test_unknown_file_is_rejected() -> None:
    assert detect_file_type(
        b"not-a-valid-file"
    ) is None