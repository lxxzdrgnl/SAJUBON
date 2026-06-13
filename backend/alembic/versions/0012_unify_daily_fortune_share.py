"""unify daily fortune share into daily_fortune_records

- daily_fortune_records.share_token 추가 (+ unique index)
- daily_fortune_records.user_id nullable (게스트 공유 레코드 허용)
- daily_shares 테이블 drop (재계산 방식 제거, 단일 스냅샷 토큰으로 통일)

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "daily_fortune_records",
        sa.Column("share_token", sa.String(16), nullable=True),
    )
    op.create_index(
        "ix_daily_fortune_records_share_token",
        "daily_fortune_records",
        ["share_token"],
        unique=True,
    )
    op.alter_column(
        "daily_fortune_records", "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.drop_table("daily_shares")


def downgrade() -> None:
    op.create_table(
        "daily_shares",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("share_token", UUID(as_uuid=True), unique=True, nullable=False,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("birth_input", JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.alter_column(
        "daily_fortune_records", "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_index("ix_daily_fortune_records_share_token", table_name="daily_fortune_records")
    op.drop_column("daily_fortune_records", "share_token")
