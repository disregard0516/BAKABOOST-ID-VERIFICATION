import uuid
from unittest.mock import AsyncMock

import pytest

from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
)
from app.db.models.evidence_object import (
    EvidenceObject,
)
from app.services.retention import (
    evidence_deletion,
)
from app.utils.time import utc_now


def build_evidence(
    *,
    status: EvidenceObjectStatus = (
        EvidenceObjectStatus.ATTACHED
    ),
) -> EvidenceObject:
    return EvidenceObject(
        id=uuid.uuid4(),
        verification_request_id=uuid.uuid4(),
        verification_submission_id=None,
        mobile_capture_session_id=None,
        object_key=(
            "verification-evidence/"
            f"{uuid.uuid4()}/document_front/"
            "test-object"
        ),
        evidence_type="document_front",
        content_type="image/jpeg",
        size_bytes=1024,
        checksum_sha256="a" * 64,
        status=status,
        uploaded_at=utc_now(),
        expires_at=None,
        attached_at=utc_now(),
        deleted_at=None,
        deletion_due_at=None,
        deletion_reason=None,
        deleted_by_admin_id=None,
    )


@pytest.mark.asyncio
async def test_successful_storage_deletion_marks_evidence_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    evidence = build_evidence()

    deleted_object_keys: list[str] = []

    def fake_delete_private_object(
        *,
        object_key: str,
    ) -> None:
        deleted_object_keys.append(
            object_key
        )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        evidence_deletion,
        "delete_private_object",
        fake_delete_private_object,
    )

    monkeypatch.setattr(
        evidence_deletion,
        "record_audit_event",
        audit_mock,
    )

    session = AsyncMock()

    await evidence_deletion.mark_evidence_deleted(
        session,
        evidence=evidence,
        actor_type=ActorType.SYSTEM.value,
        actor_id=None,
        reason="retention_policy",
    )

    assert deleted_object_keys == [
        evidence.object_key
    ]

    assert (
        evidence.status
        == EvidenceObjectStatus.DELETED
    )

    assert evidence.deleted_at is not None
    assert (
        evidence.deletion_reason
        == "retention_policy"
    )

    audit_mock.assert_awaited_once()

    audit_call = (
        audit_mock.await_args.kwargs
    )

    assert (
        audit_call["action"]
        == AuditAction.EVIDENCE_DELETED.value
    )

    assert (
        audit_call[
            "verification_request_id"
        ]
        == evidence.verification_request_id
    )

    assert (
        audit_call["metadata"][
            "evidence_id"
        ]
        == str(evidence.id)
    )


@pytest.mark.asyncio
async def test_storage_failure_does_not_mark_evidence_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    evidence = build_evidence()

    original_status = evidence.status

    def failing_delete_private_object(
        *,
        object_key: str,
    ) -> None:
        raise RuntimeError(
            "simulated storage failure"
        )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        evidence_deletion,
        "delete_private_object",
        failing_delete_private_object,
    )

    monkeypatch.setattr(
        evidence_deletion,
        "record_audit_event",
        audit_mock,
    )

    session = AsyncMock()

    with pytest.raises(
        RuntimeError,
        match="simulated storage failure",
    ):
        await (
            evidence_deletion
            .mark_evidence_deleted(
                session,
                evidence=evidence,
                actor_type=(
                    ActorType.SYSTEM.value
                ),
                actor_id=None,
                reason="retention_policy",
            )
        )

    #
    # Critical invariant:
    #
    # Storage failure must never produce a
    # false DELETED database state.
    #
    assert evidence.status == original_status
    assert evidence.deleted_at is None
    assert evidence.deletion_reason is None

    audit_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_deleted_evidence_can_retry_storage_deletion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    evidence = build_evidence(
        status=EvidenceObjectStatus.DELETED
    )

    existing_deleted_at = utc_now()

    evidence.deleted_at = (
        existing_deleted_at
    )
    evidence.deletion_reason = (
        "retention_policy"
    )

    deleted_object_keys: list[str] = []

    def fake_delete_private_object(
        *,
        object_key: str,
    ) -> None:
        deleted_object_keys.append(
            object_key
        )

    audit_mock = AsyncMock()

    monkeypatch.setattr(
        evidence_deletion,
        "delete_private_object",
        fake_delete_private_object,
    )

    monkeypatch.setattr(
        evidence_deletion,
        "record_audit_event",
        audit_mock,
    )

    session = AsyncMock()

    await evidence_deletion.mark_evidence_deleted(
        session,
        evidence=evidence,
        actor_type=ActorType.SYSTEM.value,
        actor_id=None,
        reason="retry_cleanup",
    )

    #
    # Storage deletion is retried even though the
    # database already says DELETED. This repairs
    # records produced by older/partial cleanup
    # behavior.
    #
    assert deleted_object_keys == [
        evidence.object_key
    ]

    assert (
        evidence.status
        == EvidenceObjectStatus.DELETED
    )

    #
    # Existing deletion metadata must remain
    # stable on an idempotent retry.
    #
    assert (
        evidence.deleted_at
        == existing_deleted_at
    )

    assert (
        evidence.deletion_reason
        == "retention_policy"
    )

    #
    # Do not create duplicate deletion audit
    # events for an already-deleted record.
    #
    audit_mock.assert_not_awaited()