"""add deleted_at for soft delete on user content tables

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("saju_reports", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("compatibility_reports", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("consultations", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("daily_fortune_records", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_saju_reports_deleted_at", "saju_reports", ["deleted_at"])
    op.create_index("ix_compatibility_reports_deleted_at", "compatibility_reports", ["deleted_at"])
    op.create_index("ix_consultations_deleted_at", "consultations", ["deleted_at"])
    op.create_index("ix_daily_fortune_records_deleted_at", "daily_fortune_records", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_daily_fortune_records_deleted_at", table_name="daily_fortune_records")
    op.drop_index("ix_consultations_deleted_at", table_name="consultations")
    op.drop_index("ix_compatibility_reports_deleted_at", table_name="compatibility_reports")
    op.drop_index("ix_saju_reports_deleted_at", table_name="saju_reports")
    op.drop_column("daily_fortune_records", "deleted_at")
    op.drop_column("consultations", "deleted_at")
    op.drop_column("compatibility_reports", "deleted_at")
    op.drop_column("saju_reports", "deleted_at")
