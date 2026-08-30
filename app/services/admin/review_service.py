from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    ActorType,
    AuditAction,
    VerificationStatus,
)
from app.db.models.evidence_object import EvidenceObject
from app.db.models.verification_decision import (
    VerificationDecision,
)
from app.db.models.verification_request import (
    VerificationRequest,
)
from app.db.models.verification_submission import VerificationSubmission
from app.services.audit.service import (
    record_audit_event,
)
from app.services.verification.result_service import (
    upsert_approved_result,
)
from app.services.verification.state_machine import (
    require_transition,
)
from app.utils.time import utc_now


class CaseClaimError(ValueError):
    pass


async def claim_case(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    ip_address: str | None = None,
) -> VerificationRequest:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise CaseClaimError(
            "Verification request not found."
        )

    if request.status != VerificationStatus.QUEUED:
        raise CaseClaimError(
            "Case is not available to claim."
        )

    if request.assigned_reviewer_id is not None:
        raise CaseClaimError(
            "Case is already assigned."
        )

    require_transition(
        request.status,
        VerificationStatus.IN_REVIEW,
    )

    now = utc_now()

    request.status = VerificationStatus.IN_REVIEW
    request.assigned_reviewer_id = admin_id
    request.review_started_at = now
    request.updated_at = now
    request.last_activity_at = now

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.CASE_CLAIMED.value,
        verification_request_id=request.id,
        metadata={
            "from_status": (
                VerificationStatus.QUEUED.value
            ),
            "to_status": (
                VerificationStatus.IN_REVIEW.value
            ),
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(request)

    return request

async def get_review_detail(
    session: AsyncSession,
    *,
    request_id: UUID,
) -> tuple[
    VerificationRequest,
    list[
        tuple[
            VerificationSubmission,
            list[EvidenceObject],
        ]
    ],
]:
    request = await session.get(
        VerificationRequest,
        request_id,
    )

    if request is None:
        raise CaseClaimError(
            "Verification request not found."
        )

    submission_result = await session.execute(
        select(VerificationSubmission)
        .where(
            VerificationSubmission.verification_request_id
            == request.id
        )
        .order_by(
            VerificationSubmission.submitted_at.asc()
        )
    )

    submissions = list(
        submission_result.scalars().all()
    )

    output = []

    for submission in submissions:
        evidence_result = await session.execute(
            select(EvidenceObject).where(
                EvidenceObject.verification_submission_id
                == submission.id
            )
        )

        evidence_objects = list(
            evidence_result.scalars().all()
        )

        output.append(
            (
                submission,
                evidence_objects,
            )
        )

    return request, output

class DecisionError(ValueError):
    pass


async def record_decision(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    target_status: VerificationStatus,
    reason_code: str | None,
    internal_note: str | None,
    user_message: str | None,
    ip_address: str | None = None,
) -> VerificationRequest:
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise DecisionError(
            "Verification request not found."
        )

    if request.status != VerificationStatus.IN_REVIEW:
        raise DecisionError(
            "Case is not currently in review."
        )

    if request.assigned_reviewer_id != admin_id:
        raise DecisionError(
            "Case is assigned to another reviewer."
        )

    allowed_targets = {
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
        VerificationStatus.MORE_INFO,
    }

    if target_status not in allowed_targets:
        raise DecisionError(
            "Unsupported review decision."
        )

    require_transition(
        request.status,
        target_status,
    )

    now = utc_now()

    decision = VerificationDecision(
        verification_request_id=request.id,
        reviewer_admin_id=admin_id,
        decision=target_status.value,
        reason_code=reason_code,
        internal_note=internal_note,
        user_message=user_message,
        created_at=now,
    )

    session.add(decision)

    request.status = target_status

    if target_status == VerificationStatus.APPROVED:
        await upsert_approved_result(
            session,
            request=request,
        )
        
    request.updated_at = now
    request.last_activity_at = now

    if target_status in {
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
    }:
        request.decided_at = now

    if target_status == VerificationStatus.APPROVED:
        action = AuditAction.VERIFICATION_APPROVED

    elif target_status == VerificationStatus.REJECTED:
        action = AuditAction.VERIFICATION_REJECTED

    else:
        action = AuditAction.MORE_INFO_REQUESTED

    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=action.value,
        verification_request_id=request.id,
        metadata={
            "decision": target_status.value,
            "reason_code": reason_code,
        },
        ip_address=ip_address,
    )

    await session.commit()
    await session.refresh(request)

    return request

async def record_review_view(
    session: AsyncSession,
    *,
    request_id: UUID,
    admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    await record_audit_event(
        session,
        actor_type=ActorType.ADMIN.value,
        actor_id=str(admin_id),
        action=AuditAction.REQUEST_VIEWED.value,
        verification_request_id=request_id,
        ip_address=ip_address,
    )

    await session.commit()