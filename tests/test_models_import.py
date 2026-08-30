from app.db.models import (
    Admin,
    AdminNote,
    AuditEvent,
    DiscordAccessGrant,
    DiscordOAuthState,
    EvidenceObject,
    RetentionPolicy,
    SystemJobRun,
    VerificationDecision,
    VerificationRequest,
    VerificationResult,
    VerificationSession,
    VerificationSubmission,
)


def test_all_database_models_import() -> None:
    models = [
        Admin,
        AdminNote,
        AuditEvent,
        DiscordAccessGrant,
        DiscordOAuthState,
        EvidenceObject,
        RetentionPolicy,
        SystemJobRun,
        VerificationDecision,
        VerificationRequest,
        VerificationResult,
        VerificationSession,
        VerificationSubmission,
    ]

    assert len(models) == 13