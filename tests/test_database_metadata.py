from app.db import models  # noqa: F401
from app.db.base import Base

EXPECTED_TABLES = {
    "admins",
    "admin_notes",
    "audit_events",
    "discord_access_grants",
    "discord_oauth_states",
    "evidence_objects",
    "retention_policies",
    "system_job_runs",
    "verification_decisions",
    "verification_requests",
    "verification_results",
    "verification_sessions",
    "verification_submissions",
}


def test_expected_database_tables_exist() -> None:
    assert EXPECTED_TABLES.issubset(
        set(Base.metadata.tables)
    )