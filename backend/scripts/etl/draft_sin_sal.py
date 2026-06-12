"""
신살 Tier1 보강 초안 생성기.

엔진이 계산하는 신살 목록과 rag/knowledge/sin_sal.json의 9개를 대조해
갭 신살 풀이를 LLM 초안으로 생성 → scripts/etl/out/sin_sal_draft.json 저장.

rag/knowledge/sin_sal.json 직접 수정 금지 — 사람 검수 게이트 (spec §5 ④b).

사용법:
    uv run python -m scripts.etl.draft_sin_sal [--limit N] [--out PATH] [--show-gap-only]
"""

from __future__ import annotations
import argparse
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).parent.parent.parent
KNOWLEDGE_DIR = BACKEND_DIR / "rag" / "knowledge"
OUT_DIR = Path(__file__).parent / "out"
DUMP_PATH = Path("/home/rheon/Downloads/20250522_moonmarin8_DB_Backup.sql")

# ─── 갭 산출 ─────────────────────────────────────────────────────

def compute_gap() -> dict:
    """
    engine sin_sals vs knowledge sin_sals → 갭 목록 산출.

    Returns:
        {
          "engine": [...],      # 엔진 계산 목록
          "knowledge": [...],   # knowledge JSON 목록
          "gap": [...],         # 엔진에 있지만 knowledge에 없는 것
          "knowledge_only": [...],  # knowledge에 있지만 엔진에 없는 것
        }
    """
    from engine.calc.sin_sal import SIN_SAL_INFO, _TWELVE_SIN_SAL_GROUPS

    engine_names = set(SIN_SAL_INFO.keys())
    engine_names.add("삼재")

    with open(KNOWLEDGE_DIR / "sin_sal.json", encoding="utf-8") as f:
        knowledge_entries = json.load(f)
    knowledge_names = {e["name"] for e in knowledge_entries}

    gap = sorted(engine_names - knowledge_names)
    knowledge_only = sorted(knowledge_names - engine_names)

    return {
        "engine": sorted(engine_names),
        "knowledge": sorted(knowledge_names),
        "gap": gap,
        "knowledge_only": knowledge_only,
    }


# ─── 덤프 소스 수집 ──────────────────────────────────────────────

def collect_source_texts(gap_names: list[str]) -> dict[str, list[str]]:
    """
    갭 신살별로 S126에서 관련 풀이 텍스트를 수집.

    Returns:
        {sin_sal_name: [cleaned_text, ...]}
    """
    if not DUMP_PATH.exists():
        logger.warning(f"덤프 파일 없음: {DUMP_PATH} — 소스 텍스트 없이 진행")
        return {name: [] for name in gap_names}

    from scripts.etl.parse_dump import iter_table_rows
    from scripts.etl.cleanse import cleanse_text

    # S126의 DB_express → 신살명 매핑 (정규화된 이름으로 매핑)
    # DB_express는 '천을귀인', '원진살', '문곡' 등 다양한 형태
    name_to_texts: dict[str, list[str]] = {name: [] for name in gap_names}

    # 검색 키워드 맵 (gap 이름 → S126 DB_express에서 찾을 키워드)
    # 일부는 _disp 버전이 별도 있음
    search_map: dict[str, list[str]] = {
        "원진살": ["원진살"],
        "고신살": ["고신살", "고신살_disp"],
        "관귀학관": ["관귀학관"],
        "문곡귀인": ["문곡", "문창"],
        "태극귀인": ["태극귀인"],
        "현침살": ["현침살"],
        "홍염살": ["홍염살"],
        "월덕귀인": ["월덕귀인", "월덕귀인_disp"],
        "황은대사": ["황은대사", "황은대사_disp"],
        "삼재": ["삼재살1_disp", "삼재살2_disp", "삼재살3_disp"],
    }

    for row in iter_table_rows(DUMP_PATH, "S126"):
        express = row.get("DB_express", "") or ""
        data = row.get("DB_data", "") or ""
        text = cleanse_text(data)
        if not text:
            continue

        for gap_name in gap_names:
            keywords = search_map.get(gap_name, [gap_name])
            if any(kw == express or express.startswith(kw) for kw in keywords):
                name_to_texts[gap_name].append(text)

    return name_to_texts


# ─── 스키마 읽기 ─────────────────────────────────────────────────

def _load_schema_example() -> dict:
    """기존 sin_sal.json 첫 번째 항목을 스키마 예제로 반환."""
    with open(KNOWLEDGE_DIR / "sin_sal.json", encoding="utf-8") as f:
        entries = json.load(f)
    return entries[0]


# ─── LLM 프롬프트 빌드 ───────────────────────────────────────────

def build_prompt(sin_sal_name: str, source_texts: list[str], schema_example: dict) -> str:
    """신살 초안 생성 프롬프트."""
    schema_str = json.dumps(schema_example, ensure_ascii=False, indent=2)
    sources_str = "\n\n".join(f"[출처 {i+1}]\n{t}" for i, t in enumerate(source_texts[:3]))
    if not sources_str:
        sources_str = "(관련 덤프 텍스트 없음 — 명리학 기본 지식으로 작성)"

    return f"""당신은 사주명리학 전문가입니다. 아래 신살({sin_sal_name})에 대한 RAG 지식 베이스 항목을 JSON으로 작성해주세요.

## 작성할 신살
이름: {sin_sal_name}

## 참고 텍스트 (덤프 원문)
{sources_str}

## 스키마 예시 (이 구조를 정확히 따를 것)
```json
{schema_str}
```

## 작성 규칙
1. id: "ss_" + 이름을 영문 스네이크케이스 (예: "ss_wongin_sal")
2. name: 한국어 이름 정확히 ("{sin_sal_name}")
3. hanja: 한자 표기
4. type: "lucky" | "unlucky" | "neutral" 중 하나
5. priority: 1~100 (중요도, 기존 항목 참고)
6. embedding_context: 검색용 한국어 맥락 설명 (1~2문장, 본질 요약)
7. engine_tags: 영문 스네이크케이스 태그 5개 (엔진 검색용)
8. interpretation_tags: 영문 스네이크케이스 태그 5개 (Writer 힌트)
9. pillar_nuance: 연·월·일·시 기둥별 발현 특성
10. vulnerability: 주의 사항
11. consulting_tip: 상담 멘트 (실용적 조언, 1~3문장, 한국어 자연스럽게)
12. activation_rule: 성립 조건 설명
13. interpretation_scope: "sinsal_reference_only" 고정

JSON만 출력하세요. 코드블록(```)을 포함하지 마세요."""


# ─── 초안 생성 ───────────────────────────────────────────────────

def generate_draft(
    sin_sal_name: str,
    source_texts: list[str],
    schema_example: dict,
    llm,
) -> dict | None:
    """LLM으로 신살 초안 생성."""
    from langchain_core.messages import HumanMessage

    prompt = build_prompt(sin_sal_name, source_texts, schema_example)
    logger.info(f"  [{sin_sal_name}] LLM 호출 중...")

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()

        # JSON 파싱
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        entry = json.loads(content)
        entry["_draft"] = True  # 사람 검수 미완 표시
        entry["_sources"] = f"S126·{sin_sal_name}" if source_texts else "knowledge_only"
        return entry
    except json.JSONDecodeError as e:
        logger.error(f"  [{sin_sal_name}] JSON 파싱 실패: {e}\n응답: {content[:200]}")
        return None
    except Exception as e:
        logger.error(f"  [{sin_sal_name}] LLM 호출 실패: {e}")
        return None


# ─── 메인 ────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="신살 Tier1 보강 초안 생성기")
    parser.add_argument("--limit", type=int, default=None, help="처리할 최대 갭 신살 수")
    parser.add_argument("--out", type=str, default=None, help="출력 파일 경로")
    parser.add_argument("--show-gap-only", action="store_true", help="갭 목록만 출력 (LLM 호출 없음)")
    parser.add_argument("--provider", type=str, default=None, help="LLM provider (gemini/openai/claude)")
    args = parser.parse_args()

    # 갭 산출
    gap_info = compute_gap()
    print(f"\n=== 신살 갭 분석 ===")
    print(f"엔진 계산 신살: {len(gap_info['engine'])}개 → {gap_info['engine']}")
    print(f"knowledge 신살: {len(gap_info['knowledge'])}개 → {gap_info['knowledge']}")
    print(f"갭 (엔진에 있지만 knowledge에 없음): {len(gap_info['gap'])}개 → {gap_info['gap']}")
    print(f"knowledge 전용 (엔진에 없음): {gap_info['knowledge_only']}")

    if args.show_gap_only:
        return

    gap_names = gap_info["gap"]
    if args.limit:
        gap_names = gap_names[:args.limit]
        logger.info(f"--limit {args.limit}: 처음 {len(gap_names)}개만 처리")

    if not gap_names:
        print("갭이 없습니다.")
        return

    # 소스 텍스트 수집
    logger.info("덤프에서 신살 풀이 텍스트 수집 중...")
    source_texts_map = collect_source_texts(gap_names)
    for name, texts in source_texts_map.items():
        logger.info(f"  {name}: {len(texts)}개 텍스트 발견")

    # 스키마 예제
    schema_example = _load_schema_example()

    # LLM 초기화
    try:
        from dotenv import load_dotenv
        load_dotenv(BACKEND_DIR / "backend" / ".env", override=False)
        # .env 경로 재시도
        load_dotenv(BACKEND_DIR / ".env", override=False)
        # 실제 .env 위치
        import subprocess
        result = subprocess.run(
            ["find", str(BACKEND_DIR.parent), "-name", ".env", "-maxdepth", "3"],
            capture_output=True, text=True
        )
        for env_file in result.stdout.strip().splitlines():
            load_dotenv(env_file, override=False)
    except Exception:
        pass

    # .env 직접 로드
    env_path = Path("/home/rheon/Desktop/projects/SajuGuri/backend/.env")
    if env_path.exists():
        from dotenv import load_dotenv as _load
        _load(env_path, override=True)

    try:
        from llm.providers import get_llm
        llm = get_llm(provider=args.provider, temperature=0.3)
        logger.info(f"LLM 초기화 완료: provider={args.provider or 'default'}")
    except Exception as e:
        logger.error(f"LLM 초기화 실패: {e}")
        logger.info("프롬프트 빌드 검증만 진행합니다 (DONE_WITH_CONCERNS)")
        for name in gap_names[:2]:
            prompt = build_prompt(name, source_texts_map[name], schema_example)
            print(f"\n--- 프롬프트 미리보기 [{name}] ---")
            print(prompt[:500] + "...")
        return

    # 초안 생성
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = Path(args.out) if args.out else OUT_DIR / "sin_sal_draft.json"

    drafts = []
    for name in gap_names:
        logger.info(f"신살 초안 생성: {name}")
        draft = generate_draft(name, source_texts_map[name], schema_example, llm)
        if draft:
            drafts.append(draft)
            logger.info(f"  [{name}] 완료")
        else:
            logger.warning(f"  [{name}] 실패 — 스킵")

    # 저장
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)

    print(f"\n=== 초안 생성 완료 ===")
    print(f"  성공: {len(drafts)}/{len(gap_names)}개")
    print(f"  저장: {out_path}")
    print(f"  ⚠️  검수 필요 — rag/knowledge/sin_sal.json에 직접 반영 금지")


if __name__ == "__main__":
    main()
