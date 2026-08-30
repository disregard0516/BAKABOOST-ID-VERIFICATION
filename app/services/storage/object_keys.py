import secrets
from uuid import UUID


def build_evidence_object_key(
    *,
    verification_request_id: UUID,
    evidence_type: str,
) -> str:
    random_part = secrets.token_hex(16)

    return (
        "verification-evidence/"
        f"{verification_request_id}/"
        f"{evidence_type}/"
        f"{random_part}"
    )