from app.db.models.verification_request import (
    VerificationRequest,
)
from app.schemas.submission import (
    VerificationSubmissionCreate,
)


class SubmissionValidationError(ValueError):
    pass


def validate_required_submission_fields(
    *,
    request: VerificationRequest,
    payload: VerificationSubmissionCreate,
) -> None:
    required = request.required_evidence_json

    if (
        required.get("legal_name")
        and not payload.legal_name
    ):
        raise SubmissionValidationError(
            "Legal name is required."
        )

    if (
        required.get("date_of_birth")
        and payload.date_of_birth is None
    ):
        raise SubmissionValidationError(
            "Date of birth is required."
        )

    if (
        required.get("age_confirmation")
        and not payload.age_result
    ):
        raise SubmissionValidationError(
            "Age confirmation is required."
        )

    if (
        required.get("issuing_country")
        and not payload.issuing_country
    ):
        raise SubmissionValidationError(
            "Issuing country is required."
        )

    if (
        required.get("document_type")
        and not payload.document_type
    ):
        raise SubmissionValidationError(
            "Document type is required."
        )

    if not payload.consent_confirmed:
        raise SubmissionValidationError(
            "Consent confirmation is required."
        )

    if not payload.accuracy_confirmed:
        raise SubmissionValidationError(
            "Accuracy confirmation is required."
        )