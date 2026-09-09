"""make submitted evidence retention indefinite

Revision ID: 3f9b4d6a1c72
Revises: ccaae55f6a36
Create Date: 2026-09-07

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3f9b4d6a1c72"
down_revision: str | Sequence[str] | None = "ccaae55f6a36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove legacy automatic-deletion deadlines."""

    evidence_objects = sa.table(
        "evidence_objects",
        sa.column(
            "deletion_due_at",
            sa.DateTime(timezone=True),
        ),
    )

    op.execute(
        evidence_objects.update()
        .where(
            evidence_objects.c.deletion_due_at.is_not(
                None
            )
        )
        .values(
            deletion_due_at=None
        )
    )


def downgrade() -> None:
    """
    No destructive downgrade.

    Previous deletion deadlines cannot be reconstructed
    safely after they have been cleared.
    """

