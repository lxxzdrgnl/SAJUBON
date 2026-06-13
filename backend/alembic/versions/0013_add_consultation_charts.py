"""add charts column to consultations

- consultations.charts JSONB nullable — {charts: [...], more: [...]} 스냅샷
  (한줄상담 응답의 ToolCard 차트를 영속화해 공유 페이지·히스토리에서 재현)

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column("charts", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("consultations", "charts")
