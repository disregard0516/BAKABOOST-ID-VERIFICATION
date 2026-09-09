import base64
import hashlib
import hmac
import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
)
from app.db.models.admin import Admin
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.services.audit.service import (
    record_audit_event,
)


class EvidenceReviewError(ValueError):
    pass


def _encode_preview_token_part(value: bytes) -> str:
    return (
        base64.urlsafe_b64encode(value)
        .rstrip(b"=")
        .decode("ascii")
    )


def _decode_preview_token_part(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)

    try:
        return base64.urlsafe_b64decode(
            value + padding
        )
    except Exception as exc:
        raise EvidenceReviewError(
            "Evidence preview link is invalid."
        ) from exc


def _create_evidence_preview_token(
    *,
    evidence_id: UUID,
    admin_id: UUID,
) -> str:
    expires_at = (
        int(time.time())
        + settings.evidence_signed_url_ttl_seconds
    )

    payload = (
        f"{evidence_id}:{admin_id}:{expires_at}"
    ).encode("ascii")

    signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).digest()

    return (
        f"{_encode_preview_token_part(payload)}."
        f"{_encode_preview_token_part(signature)}"
    )


def verify_evidence_preview_token(
    *,
    token: str,
    evidence_id: UUID,
    admin_id: UUID,
) -> None:
    try:
        payload_part, signature_part = token.split(
            ".",
            1,
        )
    except ValueError as exc:
        raise EvidenceReviewError(
            "Evidence preview link is invalid."
        ) from exc

    payload = _decode_preview_token_part(
        payload_part
    )
    supplied_signature = (
        _decode_preview_token_part(
            signature_part
        )
    )

    expected_signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).digest()

    if not hmac.compare_digest(
        supplied_signature,
        expected_signature,
    ):
        raise EvidenceReviewError(
            "Evidence preview link is invalid."
        )

    try:
        (
            token_evidence_id,
            token_admin_id,
            expires_at_text,
        ) = payload.decode("ascii").split(
            ":",
            2,
        )

        parsed_evidence_id = UUID(
            token_evidence_id
        )
        parsed_admin_id = UUID(
            token_admin_id
        )
        expires_at = int(
            expires_at_text
        )
    except (
        UnicodeDecodeError,
        ValueError,
    ) as exc:
        raise EvidenceReviewError(
            "Evidence preview link is invalid."
        ) from exc

    if (
        parsed_evidence_id != evidence_id
        or parsed_admin_id != admin_id
    ):
        raise EvidenceReviewError(
            "Evidence preview link is invalid."
        )

    if expires_at < int(time.time()):
        raise EvidenceReviewError(
            "Evidence preview link has expired."
        )


async def get_previewable_evidence(
    session: AsyncSession,
    *,
    evidence_id: UUID,
) -> EvidenceObject:
    evidence = await session.get(
        EvidenceObject,
        evidence_id,
    )

    if evidence is None:
        raise EvidenceReviewError(
            "Evidence not found."
        )

    if (
        evidence.status
        != EvidenceObjectStatus.ATTACHED
    ):
        raise EvidenceReviewError(
            "Evidence unavailable."
        )

    return evidence


async def create_evidence_preview_url(
    session: AsyncSession,
    *,
    evidence_id: UUID,
    admin: Admin,
    ip_address: str | None = None,
) -> str:
    evidence = await get_previewable_evidence(
        session,
        evidence_id=evidence_id,
    )

    token = _create_evidence_preview_token(
        evidence_id=evidence.id,
        admin_id=admin.id,
    )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin.id),
        action=(
            AuditAction.EVIDENCE_PREVIEWED.value
        ),
        verification_request_id=(
            evidence.verification_request_id
        ),
        metadata={
            "evidence_id": str(evidence.id),
            "evidence_type": evidence.evidence_type,
        },
        ip_address=ip_address,
    )

    await session.commit()

    return (
        "/api/admin/verification-requests/"
        f"evidence/{evidence.id}/content"
        f"?token={token}"
    )


async def record_evidence_download(
    session: AsyncSession,
    *,
    evidence_id: UUID,
    admin: Admin,
    ip_address: str | None = None,
) -> None:
    evidence = await session.get(
        EvidenceObject,
        evidence_id,
    )

    if evidence is None:
        raise EvidenceReviewError(
            "Evidence not found."
        )

    if (
        evidence.status
        != EvidenceObjectStatus.ATTACHED
    ):
        raise EvidenceReviewError(
            "Evidence unavailable."
        )

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin.id),
        action=(
            AuditAction.EVIDENCE_DOWNLOADED.value
        ),
        verification_request_id=(
            evidence.verification_request_id
        ),
        metadata={
            "evidence_id": str(evidence.id),
            "evidence_type": evidence.evidence_type,
        },
        ip_address=ip_address,
    )

    await session.commit()