"""
RAG 벡터 저장소 — pgvector(PostgreSQL 확장) 백엔드.

ChromaDB에서 마이그레이션. 벡터를 기존 Postgres 안의 `rag_documents` 테이블에 둔다.
임베딩은 rag.embedding.get_embedding_function()의 callable을 재사용한다.

공개 인터페이스(ChromaDB 시절과 동일하게 유지):
  - get_collection(name) → .upsert(ids, documents, metadatas) / .count() / .query(...)
  - search(collection_name, query, n_results=5, where=None) → [{id, document, metadata, distance}]
  - search_multi(query, categories=None, n_per_category=3) → {collection: [...]}

sync 동작 (ChromaDB도 sync였음). psycopg3 sync 커넥션 + 모듈 레벨 캐시.
"""

from __future__ import annotations
import threading

import psycopg
from pgvector.psycopg import register_vector

from core.config import settings

_conn: psycopg.Connection | None = None
_conn_lock = threading.Lock()
_ef = None  # EmbeddingFunction (callable: list[str] -> list[vector])

COLLECTIONS = [
    "ilju",               # 60갑자 일주론
    "ten_gods",           # 십성 해석
    "sin_sal",            # 신살 해석
    "structure_patterns", # 구조 패턴
    "dynamics",           # 동역학 (천간합·통근·지지관계·오행흐름)
    "wuxing",             # 오행 해석
    # Tier 2 corpus (spec §4.2)
    "corpus_saju",        # moonmarin8 사주 해석 텍스트 코퍼스
]


def _get_ef():
    global _ef
    if _ef is None:
        from rag.embedding import get_embedding_function
        _ef = get_embedding_function()
    return _ef


def _embed(texts: list[str]) -> list[list[float]]:
    """임베딩 callable을 재사용해 텍스트 → 벡터."""
    return list(_get_ef()(texts))


def get_connection() -> psycopg.Connection:
    """모듈 레벨 sync psycopg 커넥션 (pgvector 등록 + autocommit)."""
    global _conn
    with _conn_lock:
        if _conn is None or _conn.closed:
            # settings.postgres_url: postgresql://... (psycopg3 호환)
            _conn = psycopg.connect(settings.postgres_url, autocommit=True)
            register_vector(_conn)
        return _conn


# ─── where(dict) → SQL 변환 ──────────────────────────────────────────────

def _where_to_sql(where: dict | None) -> tuple[str, list]:
    """
    ChromaDB where dict를 metadata jsonb 동등 필터 SQL 조각으로 변환.
    {"key": "val"} → metadata->>'key' = 'val'
    여러 키는 AND. (ChromaDB 단순 동등 매칭만 지원)
    """
    if not where:
        return "", []
    clauses: list[str] = []
    params: list = []
    for key, val in where.items():
        clauses.append(f"metadata->>%s = %s")
        params.append(key)
        params.append(str(val))
    return " AND " + " AND ".join(clauses), params


# ─── Collection 핸들 ─────────────────────────────────────────────────────

class _PgCollection:
    """ChromaDB Collection의 upsert/count/query 인터페이스를 흉내내는 핸들."""

    def __init__(self, name: str):
        self.name = name

    def upsert(self, ids: list[str], documents: list[str], metadatas: list[dict]) -> None:
        if not ids:
            return
        import json
        embeddings = _embed(documents)
        conn = get_connection()
        with conn.cursor() as cur:
            for doc_id, doc, meta, emb in zip(ids, documents, metadatas, embeddings):
                cur.execute(
                    """
                    INSERT INTO rag_documents (collection, doc_id, document, metadata, embedding)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (collection, doc_id)
                    DO UPDATE SET document = EXCLUDED.document,
                                  metadata = EXCLUDED.metadata,
                                  embedding = EXCLUDED.embedding
                    """,
                    (self.name, doc_id, doc, json.dumps(meta or {}), emb),
                )

    def count(self) -> int:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM rag_documents WHERE collection = %s",
                (self.name,),
            )
            return cur.fetchone()[0]

    def query(
        self,
        query_texts: list[str],
        n_results: int = 5,
        where: dict | None = None,
    ) -> dict:
        """
        ChromaDB query() 반환 형태를 흉내:
          {"ids": [[...]], "documents": [[...]], "metadatas": [[...]], "distances": [[...]]}
        query_texts의 첫 항목만 사용 (기존 search() 사용 패턴과 동일).
        """
        qvec = _embed([query_texts[0]])[0]
        where_sql, where_params = _where_to_sql(where)
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT doc_id, document, metadata, embedding <=> %s AS distance
                FROM rag_documents
                WHERE collection = %s{where_sql}
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                [qvec, self.name, *where_params, qvec, n_results],
            )
            rows = cur.fetchall()

        ids = [r[0] for r in rows]
        docs = [r[1] for r in rows]
        metas = [r[2] or {} for r in rows]
        dists = [float(r[3]) for r in rows]
        return {
            "ids": [ids],
            "documents": [docs],
            "metadatas": [metas],
            "distances": [dists],
        }


def get_collection(name: str) -> _PgCollection:
    return _PgCollection(name)


# ─── 공개 검색 API (기존 시그니처·반환형 유지) ───────────────────────────

def search(
    collection_name: str,
    query: str,
    n_results: int = 5,
    where: dict | None = None,
) -> list[dict]:
    """
    시맨틱 검색.

    Returns:
        [{id, document, metadata, distance}, ...]
    """
    col = get_collection(collection_name)

    # 컬렉션이 비어 있으면 빈 리스트 반환 (임베딩 호출 절약)
    if col.count() == 0:
        return []

    res = col.query(query_texts=[query], n_results=n_results, where=where)
    results = []
    for i, doc in enumerate(res["documents"][0]):
        results.append({
            "id":       res["ids"][0][i],
            "document": doc,
            "metadata": res["metadatas"][0][i] if res["metadatas"] else {},
            "distance": res["distances"][0][i] if res["distances"] else None,
        })
    return results


def search_multi(
    query: str,
    categories: list[str] | None = None,
    n_per_category: int = 3,
) -> dict[str, list[dict]]:
    """
    여러 컬렉션 동시 검색.

    Returns:
        {collection_name: [{id, document, metadata, distance}]}
    """
    targets = categories or COLLECTIONS
    return {cat: search(cat, query, n_per_category) for cat in targets}
