"""add secure admin sessions

Revision ID: c2333de5bb2c
Revises: 24e419fa1333
Create Date: 2026-09-01 02:22:52.537609
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2333de5bb2c"

down_revision: str | Sequence[str] | None = "24e419fa1333"

branch_labels: str | Sequence[str] | None = None

depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ========================================================
    # ADMIN SERVER-MANAGED SESSIONS
    # ========================================================

    op.create_table(
        "admin_sessions",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "admin_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "token_hash",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "csrf_token_hash",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "security_version",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "authenticated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "mfa_verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "phishing_resistant_verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "auth_method",
            sa.String(length=80),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "rotated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "revoke_reason",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "is_revoked",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "ip_address",
            sa.String(length=45),
            nullable=True,
        ),
        sa.Column(
            "user_agent",
            sa.String(length=512),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admins.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ========================================================
    # ADMIN SESSION INDEXES
    # ========================================================

    op.create_index(
        "ix_admin_sessions_admin_active",
        "admin_sessions",
        [
            "admin_id",
            "is_revoked",
            "expires_at",
        ],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_admin_id"),
        "admin_sessions",
        ["admin_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_expires_at"),
        "admin_sessions",
        ["expires_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_is_revoked"),
        "admin_sessions",
        ["is_revoked"],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_last_seen_at"),
        "admin_sessions",
        ["last_seen_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_revoked_at"),
        "admin_sessions",
        ["revoked_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_admin_sessions_token_hash"),
        "admin_sessions",
        ["token_hash"],
        unique=True,
    )

    # ========================================================
    # ADMIN ACCOUNT SECURITY VERSION
    # ========================================================

    #
    # IMPORTANT:
    #
    # Existing administrators need an initial value.
    #
    # We temporarily apply a database default of 1 so that
    # existing rows can be migrated safely.
    #
    op.add_column(
        "admins",
        sa.Column(
            "security_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )

    #
    # Remove the temporary database-level migration default.
    #
    # New values remain controlled by the SQLAlchemy model /
    # application logic.
    #
    op.alter_column(
        "admins",
        "security_version",
        server_default=None,
    )

    # ========================================================
    # ADMIN ACCOUNT LIFECYCLE
    # ========================================================

    op.add_column(
        "admins",
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "admins",
        sa.Column(
            "activated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "admins",
        sa.Column(
            "disabled_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "admins",
        sa.Column(
            "security_updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # ========================================================
    # ADMIN LOOKUP INDEX
    # ========================================================

    op.create_index(
        op.f("ix_admins_is_active"),
        "admins",
        ["is_active"],
        unique=False,
    )


def downgrade() -> None:
    # ========================================================
    # ADMINS
    # ========================================================

    op.drop_index(
        op.f("ix_admins_is_active"),
        table_name="admins",
    )

    op.drop_column(
        "admins",
        "security_updated_at",
    )

    op.drop_column(
        "admins",
        "disabled_at",
    )

    op.drop_column(
        "admins",
        "activated_at",
    )

    op.drop_column(
        "admins",
        "invited_at",
    )

    op.drop_column(
        "admins",
        "security_version",
    )

    # ========================================================
    # ADMIN SESSIONS
    # ========================================================

    op.drop_index(
        op.f("ix_admin_sessions_token_hash"),
        table_name="admin_sessions",
    )

    op.drop_index(
        op.f("ix_admin_sessions_revoked_at"),
        table_name="admin_sessions",
    )

    op.drop_index(
        op.f("ix_admin_sessions_last_seen_at"),
        table_name="admin_sessions",
    )

    op.drop_index(
        op.f("ix_admin_sessions_is_revoked"),
        table_name="admin_sessions",
    )

    op.drop_index(
        op.f("ix_admin_sessions_expires_at"),
        table_name="admin_sessions",
    )

    op.drop_index(
        op.f("ix_admin_sessions_admin_id"),
        table_name="admin_sessions",
    )

    op.drop_index(
        "ix_admin_sessions_admin_active",
        table_name="admin_sessions",
    )

    op.drop_table(
        "admin_sessions",
    )