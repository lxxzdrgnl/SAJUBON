"""add daily_fortune_records table

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_fortune_records",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("birth_hash", sa.String(64), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("profile_name", sa.String(50), nullable=False, server_default=""),
        sa.Column("keyword", sa.String(50), nullable=False, server_default=""),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "birth_hash", "date", name="uq_daily_record_user_birth_date"),
    )
    op.create_index("ix_daily_fortune_records_user_id", "daily_fortune_records", ["user_id"])
    op.create_index("ix_daily_fortune_records_birth_hash", "daily_fortune_records", ["birth_hash"])


def downgrade() -> None:
    op.drop_index("ix_daily_fortune_records_birth_hash", table_name="daily_fortune_records")
    op.drop_index("ix_daily_fortune_records_user_id", table_name="daily_fortune_records")
    op.drop_table("daily_fortune_records")
