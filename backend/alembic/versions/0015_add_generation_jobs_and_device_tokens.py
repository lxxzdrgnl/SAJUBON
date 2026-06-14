"""add generation_jobs and device_tokens tables

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "generation_jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.String(30), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="pending"),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("result_id", sa.Integer, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_generation_jobs_user_status", "generation_jobs", ["user_id", "status"])
    op.create_index("ix_generation_jobs_status_created", "generation_jobs", ["status", "created_at"])

    op.create_table(
        "device_tokens",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(10), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "token", name="uq_device_tokens_user_token"),
    )


def downgrade() -> None:
    op.drop_table("device_tokens")
    op.drop_index("ix_generation_jobs_status_created", table_name="generation_jobs")
    op.drop_index("ix_generation_jobs_user_status", table_name="generation_jobs")
    op.drop_table("generation_jobs")
