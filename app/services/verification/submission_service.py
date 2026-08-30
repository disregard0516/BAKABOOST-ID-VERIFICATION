from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AuditAction,
    EvidenceObjectStatus,
    VerificationStatus,
)
from app.db.models.evidence_object import EvidenceObject
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.models.verification_submission import (
    VerificationSubmission,
)
from app.schemas.submission import (
    VerificationSubmissionCreate,
)
from app.services.audit.service import (
    record_audit_event,
)
from app.services.retention.service import (
    get_default_retention_policy,
    schedule_evidence_retention,
)
from app.services.verification.state_machine import (
    require_transition,
)
from app.services.verification.submission_rules import (
    SubmissionValidationError,
    validate_required_submission_fields,
)
from app.utils.time import utc_now


async def create_submission(
    session: AsyncSession,
    *,
    verification_request: VerificationRequest,
    verification_session: VerificationSession,
    payload: VerificationSubmissionCreate,
) -> VerificationSubmission:
    if verification_request.status not in {
        VerificationStatus.PENDING,
        VerificationStatus.MORE_INFO,
    }:
        raise SubmissionValidationError(
            "Submission is not allowed in the current state."
        )

    if (
        verification_request.submission_count
        >= verification_request.max_submissions
    ):
        raise SubmissionValidationError(
            "Submission limit reached."
        )

    validate_required_submission_fields(
        request=verification_request,
        payload=payload,
    )

    unique_evidence_ids = set(
        payload.evidence_ids
    )

    if len(unique_evidence_ids) != len(
        payload.evidence_ids
    ):
        raise SubmissionValidationError(
            "Duplicate evidence objects are not allowed."
        )

    result = await session.execute(
        select(EvidenceObject).where(
            EvidenceObject.id.in_(
                unique_evidence_ids
            )
        )
    )

    evidence_objects = list(
        result.scalars().all()
    )

    if len(evidence_objects) != len(
        unique_evidence_ids
    ):
        raise SubmissionValidationError(
            "One or more evidence objects are invalid."
        )

    now = utc_now()

    for evidence in evidence_objects:
        if (
            evidence.verification_request_id
            != verification_request.id
        ):
            raise SubmissionValidationError(
                "Evidence does not belong to this request."
            )

        if (
            evidence.status
            != EvidenceObjectStatus.TEMPORARY
        ):
            raise SubmissionValidationError(
                "Evidence is not available for submission."
            )

        if (
            evidence.expires_at is not None
            and evidence.expires_at <= now
        ):
            raise SubmissionValidationError(
                "Evidence upload has expired."
            )

    submission = VerificationSubmission(
        verification_request_id=(
            verification_request.id
        ),
        legal_name=payload.legal_name,
        date_of_birth=payload.date_of_birth,
        age_result=payload.age_result,
        issuing_country=(
            payload.issuing_country.upper()
            if payload.issuing_country
            else None
        ),
        document_type=payload.document_type,
        evidence_object_refs=[
            str(evidence.id)
            for evidence in evidence_objects
        ],
        consent_confirmed=(
            payload.consent_confirmed
        ),
        accuracy_confirmed=(
            payload.accuracy_confirmed
        ),
        client_risk_metadata={},
        submitted_at=now,
    )

    session.add(submission)

    await session.flush()

    #
    # Attach all validated evidence to this
    # submission first.
    #
    for evidence in evidence_objects:
        evidence.verification_submission_id = (
            submission.id
        )

        evidence.status = (
            EvidenceObjectStatus.ATTACHED
        )

        evidence.attached_at = now

        #
        # Temporary-upload expiry no longer
        # applies once evidence is attached.
        #
        evidence.expires_at = None

    #
    # Resolve the retention policy once.
    #
    # Previously this lookup and another
    # evidence loop were nested inside the
    # attachment loop, causing retention to
    # be scheduled repeatedly.
    #
    retention_policy = (
        await get_default_retention_policy(
            session
        )
    )

    if retention_policy is not None:
        for evidence in evidence_objects:
            await schedule_evidence_retention(
                session,
                evidence=evidence,
                retention_days=(
                    retention_policy
                    .raw_evidence_retention_days
                ),
            )

    previous_status = (
        verification_request.status
    )

    require_transition(
        previous_status,
        VerificationStatus.QUEUED,
    )

    verification_request.status = (
        VerificationStatus.QUEUED
    )

    verification_request.submission_count += 1

    verification_request.queue_entered_at = now
    verification_request.updated_at = now
    verification_request.last_activity_at = now

    action = (
        AuditAction.SUBMISSION_CREATED
        if previous_status
        == VerificationStatus.PENDING
        else AuditAction.SUBMISSION_RESUBMITTED
    )

    await record_audit_event(
        session,
        actor_type=(
            ActorType.VERIFICATION_USER.value
        ),
        actor_id=str(
            verification_session.discord_user_id
        ),
        action=action.value,
        verification_request_id=(
            verification_request.id
        ),
        metadata={
            "submission_count": (
                verification_request
                .submission_count
            ),
            "evidence_count": len(
                evidence_objects
            ),
        },
    )

    await session.commit()

    await session.refresh(
        submission
    )

    return submission