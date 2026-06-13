"""add rag_documents table with pgvector

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

EMBEDDING_DIM = 1536  # openai text-embedding-3-small


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "rag_documents",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("collection", sa.Text, nullable=False),
        sa.Column("doc_id", sa.Text, nullable=False),
        sa.Column("document", sa.Text, nullable=True),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column("embedding", sa.Text, nullable=True),  # placeholder, altered below
    )
    # embedding 컬럼을 vector(1536)로 교체 (alembic 기본 타입에 vector 없음)
    op.execute(f"ALTER TABLE rag_documents ALTER COLUMN embedding TYPE vector({EMBEDDING_DIM}) USING NULL")

    op.create_unique_constraint(
        "uq_rag_documents_collection_doc_id",
        "rag_documents",
        ["collection", "doc_id"],
    )

    # HNSW 코사인 거리 인덱스
    op.execute(
        "CREATE INDEX ix_rag_documents_embedding_hnsw "
        "ON rag_documents USING hnsw (embedding vector_cosine_ops)"
    )
    op.create_index(
        "ix_rag_documents_collection",
        "rag_documents",
        ["collection"],
    )


def downgrade() -> None:
    op.drop_index("ix_rag_documents_collection", table_name="rag_documents")
    op.execute("DROP INDEX IF EXISTS ix_rag_documents_embedding_hnsw")
    op.drop_constraint(
        "uq_rag_documents_collection_doc_id",
        "rag_documents",
        type_="unique",
    )
    op.drop_table("rag_documents")
    # 확장은 다른 테이블이 의존할 수 있으므로 제거하지 않는다.
