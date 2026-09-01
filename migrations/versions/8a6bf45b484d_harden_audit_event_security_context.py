"""harden audit event security context

Revision ID: 8a6bf45b484d
Revises: c2333de5bb2c
Create Date: 2026-09-01 03:31:27.365625

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8a6bf45b484d"

down_revision: str | Sequence[str] | None = "c2333de5bb2c"

branch_labels: str | Sequence[str] | None = None

depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    # ========================================================
    # AUDIT SECURITY CONTEXT
    # ========================================================

    op.add_column(
        "audit_events",
        sa.Column(
            "admin_session_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    #
    # Existing audit rows pre-date the outcome field.
    #
    # Backfill them as successful historical operations, then
    # remove the temporary database default so application code
    # remains responsible for explicitly defining future
    # outcomes.
    #
    op.add_column(
        "audit_events",
        sa.Column(
            "outcome",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text(
                "'success'"
            ),
        ),
    )

    op.alter_column(
        "audit_events",
        "outcome",
        server_default=None,
    )

    op.add_column(
        "audit_events",
        sa.Column(
            "request_id",
            sa.String(length=128),
            nullable=True,
        ),
    )

    op.add_column(
        "audit_events",
        sa.Column(
            "user_agent",
            sa.String(length=512),
            nullable=True,
        ),
    )

    # ========================================================
    # INDEXES
    # ========================================================

    op.create_index(
        "ix_audit_events_admin_session_created",
        "audit_events",
        [
            "admin_session_id",
            "created_at",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_audit_events_admin_session_id"
        ),
        "audit_events",
        [
            "admin_session_id",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_audit_events_outcome"
        ),
        "audit_events",
        [
            "outcome",
        ],
        unique=False,
    )

    op.create_index(
        op.f(
            "ix_audit_events_request_id"
        ),
        "audit_events",
        [
            "request_id",
        ],
        unique=False,
    )

    op.create_index(
        "ix_audit_events_request_id_created",
        "audit_events",
        [
            "request_id",
            "created_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "ix_audit_events_request_id_created",
        table_name="audit_events",
    )

    op.drop_index(
        op.f(
            "ix_audit_events_request_id"
        ),
        table_name="audit_events",
    )

    op.drop_index(
        op.f(
            "ix_audit_events_outcome"
        ),
        table_name="audit_events",
    )

    op.drop_index(
        op.f(
            "ix_audit_events_admin_session_id"
        ),
        table_name="audit_events",
    )

    op.drop_index(
        "ix_audit_events_admin_session_created",
        table_name="audit_events",
    )

    op.drop_column(
        "audit_events",
        "user_agent",
    )

    op.drop_column(
        "audit_events",
        "request_id",
    )

    op.drop_column(
        "audit_events",
        "outcome",
    )

    op.drop_column(
        "audit_events",
        "admin_session_id",
    )