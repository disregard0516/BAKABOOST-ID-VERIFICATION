"""add evidence object lifecycle status

Revision ID: f6c098e9cc11
Revises: f51bc7ffc54e
Create Date: 2026-08-25

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f6c098e9cc11"
down_revision: str | Sequence[str] | None = "f51bc7ffc54e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


evidence_object_status_enum = postgresql.ENUM(
    "temporary",
    "attached",
    "deleted",
    name="evidence_object_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    # PostgreSQL ENUMs are independent database TYPE objects.
    # Create the type before adding a column that uses it.
    evidence_object_status_enum.create(
        bind,
        checkfirst=True,
    )

    # Start nullable/defaulted so this migration also works if
    # evidence_objects already contains rows.
    op.add_column(
        "evidence_objects",
        sa.Column(
            "status",
            evidence_object_status_enum,
            nullable=True,
            server_default=sa.text(
                "'temporary'::evidence_object_status"
            ),
        ),
    )

    # Existing objects represented by is_temporary=False were
    # already attached/permanent objects.
    op.execute(
        """
        UPDATE evidence_objects
        SET status = CASE
            WHEN is_temporary = TRUE
                THEN 'temporary'::evidence_object_status
            ELSE
                'attached'::evidence_object_status
        END
        """
    )

    op.alter_column(
        "evidence_objects",
        "status",
        nullable=False,
        server_default=None,
    )

    op.drop_index(
        "ix_evidence_objects_is_temporary",
        table_name="evidence_objects",
    )

    op.create_index(
        "ix_evidence_objects_status",
        "evidence_objects",
        ["status"],
        unique=False,
    )

    op.drop_column(
        "evidence_objects",
        "is_temporary",
    )


def downgrade() -> None:
    bind = op.get_bind()

    # Restore the old representation first.
    op.add_column(
        "evidence_objects",
        sa.Column(
            "is_temporary",
            sa.Boolean(),
            nullable=True,
            server_default=sa.true(),
        ),
    )

    op.execute(
        """
        UPDATE evidence_objects
        SET is_temporary = CASE
            WHEN status = 'temporary'::evidence_object_status
                THEN TRUE
            ELSE
                FALSE
        END
        """
    )

    op.alter_column(
        "evidence_objects",
        "is_temporary",
        nullable=False,
        server_default=None,
    )

    op.create_index(
        "ix_evidence_objects_is_temporary",
        "evidence_objects",
        ["is_temporary"],
        unique=False,
    )

    op.drop_index(
        "ix_evidence_objects_status",
        table_name="evidence_objects",
    )

    op.drop_column(
        "evidence_objects",
        "status",
    )

    evidence_object_status_enum.drop(
        bind,
        checkfirst=True,
    )