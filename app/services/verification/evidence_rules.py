from app.core.constants import EvidenceType
from app.db.models.verification_request import (
    VerificationRequest,
)


class EvidenceNotRequestedError(ValueError):
    pass


def ensure_evidence_type_is_requested(
    *,
    request: VerificationRequest,
    evidence_type: EvidenceType,
) -> None:
    required = request.required_evidence_json

    allowed_map = {
        EvidenceType.DOCUMENT_FRONT:
            required.get(
                "document_front",
                False,
            ),

        EvidenceType.DOCUMENT_BACK:
            required.get(
                "document_back",
                False,
            ),

        EvidenceType.SELFIE:
            required.get(
                "selfie",
                False,
            ),

        EvidenceType.LIVENESS:
            required.get(
                "liveness",
                False,
            ),
    }

    if not allowed_map[evidence_type]:
        raise EvidenceNotRequestedError()