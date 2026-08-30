from pydantic import BaseModel


class RequiredEvidence(BaseModel):
    legal_name: bool = False
    date_of_birth: bool = False
    age_confirmation: bool = False

    issuing_country: bool = False
    document_type: bool = True

    document_front: bool = True
    document_back: bool = False

    selfie: bool = False
    liveness: bool = False