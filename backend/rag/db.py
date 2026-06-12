"""
ChromaDB 연결 및 검색.
"""

from __future__ import annotations
import os
import chromadb

_client: chromadb.ClientAPI | None = None
_ef = None  # EmbeddingFunction (provider에 따라 타입 다름)

COLLECTIONS = [
    "ilju",              # 60갑자 일주론
    "ten_gods",          # 십성 해석
    "sin_sal",           # 신살 해석
    "structure_patterns", # 구조 패턴
    "dynamics",          # 동역학 (천간합·통근·지지관계·오행흐름)
    "wuxing",            # 오행 해석
    # Tier 2 corpus (spec §4.2)
    "corpus_saju",       # moonmarin8 사주 해석 텍스트 코퍼스
]


def _get_ef():
    global _ef
    if _ef is None:
        from rag.embedding import get_embedding_function
        _ef = get_embedding_function()
    return _ef


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        path = os.getenv("CHROMA_PATH", "./chroma_db")
        _client = chromadb.PersistentClient(path=path)
    return _client


def get_collection(name: str) -> chromadb.Collection:
    return get_client().get_or_create_collection(
        name=name,
        embedding_function=_get_ef(),
        metadata={"hnsw:space": "cosine"},
    )


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

    # 컬렉션이 비어 있으면 빈 리스트 반환
    if col.count() == 0:
        return []

    n = min(n_results, col.count())
    kwargs: dict = {"query_texts": [query], "n_results": n}
    if where:
        kwargs["where"] = where

    res = col.query(**kwargs)
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
