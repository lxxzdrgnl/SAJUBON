"""add saju_reports and report_shares tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saju_reports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_id", sa.Integer, sa.ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("birth_input", JSONB, nullable=False),
        sa.Column("request_topics", sa.Text, nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="ko"),
        sa.Column("tabs", JSONB, nullable=False),
        sa.Column("year_flow", JSONB, nullable=False),
        sa.Column("dae_un_analysis", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_saju_reports_user_id", "saju_reports", ["user_id"])

    op.create_table(
        "report_shares",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("report_id", sa.Integer, sa.ForeignKey("saju_reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("share_token", UUID(as_uuid=True), nullable=False),
        sa.Column("mask_birth", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_report_shares_share_token", "report_shares", ["share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_report_shares_share_token", table_name="report_shares")
    op.drop_table("report_shares")
    op.drop_index("ix_saju_reports_user_id", table_name="saju_reports")
    op.drop_table("saju_reports")
