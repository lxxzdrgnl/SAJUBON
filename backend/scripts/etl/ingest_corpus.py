"""
corpus_saju Tier 2 인제스트 CLI.

moonmarin8 덤프에서 사주 해석 텍스트를 추출해 ChromaDB corpus_saju 컬렉션에 인제스트한다.

사용법:
    uv run python -m scripts.etl.ingest_corpus \\
        --dump /path/to/dump.sql \\
        --domain saju \\
        --limit 100 \\
        --dry-run

옵션:
    --dump PATH      덤프 파일 경로 (필수)
    --domain DOMAIN  대상 도메인 (기본: saju)
    --limit N        최대 처리 행 수 (기본: 무제한)
    --dry-run        임베딩 호출 없이 건수·표본만 출력
"""

from __future__ import annotations
import argparse
import hashlib
import logging
import sys
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

MIN_TEXT_LEN = 200  # 200자 미만 스킵


def _text_id(table: str, num: int | str) -> str:
    """문서 ID 생성 — 테이블명 + 행번호 기반."""
    return f"corpus_{table}_{num}"


def _extract_text(row: dict) -> str:
    """행에서 주요 텍스트 컬럼을 추출해 결합."""
    parts: list[str] = []
    # DB_title / DB_title_1: 제목
    for key in ("DB_title", "DB_title_1"):
        if row.get(key):
            parts.append(str(row[key]))
    # DB_data: 본문 (가장 중요)
    if row.get("DB_data"):
        parts.append(str(row["DB_data"]))
    # 기타 텍스트 컬럼
    for key, val in row.items():
        if key not in ("DB_num", "DB_express", "DB_check", "DB_title", "DB_title_1", "DB_data"):
            if isinstance(val, str) and val:
                parts.append(val)
    return " ".join(p for p in parts if p)


def run_ingest(
    dump_path: str | Path,
    domain: str = "saju",
    limit: int | None = None,
    dry_run: bool = False,
) -> dict:
    """
    인제스트 실행.

    Returns:
        {processed, skipped_short, skipped_dup, ingested, samples}
    """
    from scripts.etl.parse_dump import list_tables, iter_all_tables_rows
    from scripts.etl.cleanse import cleanse_text
    from scripts.etl.classify import classify_table

    dump_path = Path(dump_path)
    if not dump_path.exists():
        raise FileNotFoundError(f"덤프 파일 없음: {dump_path}")

    # 대상 도메인 테이블 목록
    all_tables = list_tables(dump_path)
    target_tables = [
        t for t in all_tables
        if (c := classify_table(t)) is not None and c["domain"] == domain
    ]
    logger.info(f"대상 도메인={domain}, 테이블 수={len(target_tables)}")
    # table → trust 매핑 (단일 패스에서 참조)
    table_trust: dict[str, str] = {
        t: classify_table(t)["trust"]
        for t in target_tables
    }

    # ChromaDB 컬렉션 (dry-run 시 연결 안 함)
    collection = None
    if not dry_run:
        from dotenv import load_dotenv
        load_dotenv()
        from rag.db import get_collection
        collection = get_collection(f"corpus_{domain}")

    seen_hashes: set[str] = set()
    stats = {
        "processed": 0,
        "skipped_short": 0,
        "skipped_dup": 0,
        "ingested": 0,
        "samples": [],
    }

    batch_ids: list[str] = []
    batch_docs: list[str] = []
    batch_metas: list[dict] = []
    BATCH_SIZE = 100

    def flush_batch():
        if not batch_ids or dry_run:
            return
        try:
            collection.upsert(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_metas,
            )
        except Exception as e:
            logger.error(f"배치 upsert 실패 (건너뜀): {e}")
        finally:
            batch_ids.clear()
            batch_docs.clear()
            batch_metas.clear()

    total_processed = 0

    for table, row in iter_all_tables_rows(dump_path, set(target_tables)):
        try:
            trust = table_trust[table]
            raw_text = _extract_text(row)
            text = cleanse_text(raw_text)

            stats["processed"] += 1
            total_processed += 1

            # 200자 미만 스킵
            if len(text) < MIN_TEXT_LEN:
                stats["skipped_short"] += 1
                continue

            # 중복 텍스트 스킵 (해시 기반)
            text_hash = hashlib.md5(text.encode()).hexdigest()
            if text_hash in seen_hashes:
                stats["skipped_dup"] += 1
                continue
            seen_hashes.add(text_hash)

            doc_id = _text_id(table, row.get("DB_num", stats["ingested"]))
            meta = {
                "source": "moonmarin8",
                "domain": domain,
                "trust": trust,
                "table": table,
                "express": str(row.get("DB_express", "")),
            }

            if dry_run:
                if len(stats["samples"]) < 10:
                    stats["samples"].append({
                        "id": doc_id,
                        "text_preview": text[:120],
                        "meta": meta,
                    })
                stats["ingested"] += 1
            else:
                batch_ids.append(doc_id)
                batch_docs.append(text)
                batch_metas.append(meta)
                stats["ingested"] += 1

                if len(batch_ids) >= BATCH_SIZE:
                    flush_batch()

            # limit 체크
            if limit is not None and total_processed >= limit:
                break

        except Exception as e:
            logger.warning(f"행 처리 실패 (테이블={table}, 스킵): {e}")
            continue

    # 남은 배치 플러시
    flush_batch()

    return stats


def main():
    parser = argparse.ArgumentParser(description="corpus_saju 인제스트 CLI")
    parser.add_argument("--dump", required=True, help="mysqldump 파일 경로")
    parser.add_argument("--domain", default="saju", help="대상 도메인 (기본: saju)")
    parser.add_argument("--limit", type=int, default=None, help="최대 처리 행 수")
    parser.add_argument("--dry-run", action="store_true", help="임베딩 호출 없이 건수·표본 출력")
    args = parser.parse_args()

    try:
        stats = run_ingest(
            dump_path=args.dump,
            domain=args.domain,
            limit=args.limit,
            dry_run=args.dry_run,
        )
    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)

    print(f"\n{'=== DRY RUN ===' if args.dry_run else '=== 인제스트 완료 ==='}")
    print(f"  처리 행: {stats['processed']}")
    print(f"  200자 미만 스킵: {stats['skipped_short']}")
    print(f"  중복 스킵: {stats['skipped_dup']}")
    print(f"  인제스트{'(예정)' if args.dry_run else ''}: {stats['ingested']}")

    if args.dry_run and stats["samples"]:
        print("\n--- 표본 (최대 10건) ---")
        for i, s in enumerate(stats["samples"], 1):
            print(f"\n[{i}] ID={s['id']}")
            print(f"    META={s['meta']}")
            print(f"    TEXT={s['text_preview']}...")


if __name__ == "__main__":
    main()
