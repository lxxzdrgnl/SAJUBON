"""add name column to users (구글 프로필 닉네임 저장)

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "name")
