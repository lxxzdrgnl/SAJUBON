"""add compatibility_reports and compatibility_shares tables

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compatibility_reports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("person_a", JSONB, nullable=False),
        sa.Column("person_b", JSONB, nullable=False),
        sa.Column("request_topics", sa.Text, nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="ko"),
        sa.Column("score", JSONB, nullable=False),
        sa.Column("synastry", JSONB, nullable=False),
        sa.Column("tabs", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_compatibility_reports_user_id", "compatibility_reports", ["user_id"])

    op.create_table(
        "compatibility_shares",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("report_id", sa.Integer, sa.ForeignKey("compatibility_reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("share_token", UUID(as_uuid=True), nullable=False),
        sa.Column("mask_birth", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_compatibility_shares_share_token", "compatibility_shares", ["share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_compatibility_shares_share_token", table_name="compatibility_shares")
    op.drop_table("compatibility_shares")
    op.drop_index("ix_compatibility_reports_user_id", table_name="compatibility_reports")
    op.drop_table("compatibility_reports")
