"""add partner_info to chat_sessions

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_sessions",
        sa.Column("partner_info", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_sessions", "partner_info")
