# Chat Tools: 십이운성 & 합충 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `get_twelve_un_seong` and `get_hap_chung` as two new chart tools to the saju chat agent, with matching compact cards in the frontend ToolCard.

**Architecture:** Both tools follow the exact `_birth_info(config) → handle_calculate_saju(**birth_info) → _envelope(summary, data)` pattern from `saju_tools.py`. The `get_hap_chung` tool's `data` payload mirrors the keys that `HapChungPanel.tsx` already reads from `SajuCalcResponse` (`branch_relations`, `gong_mang`, four `*_pillar` objects). The frontend cards are added as new branches in `renderContent()` inside `ToolCard.tsx`.

**Tech Stack:** Python 3.10 + LangChain tools, FastAPI, Next.js 15 App Router, TypeScript, next-intl i18n, pytest, vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/llm/tools/saju_tools.py` — add 2 tools, update CHART_TOOL_NAMES |
| Modify | `backend/llm/pipelines/chat.py` — import + add to CHAT_TOOLS |
| Modify | `backend/llm/prompts/chat.py` — extend chart tool rules in system prompt |
| Modify | `backend/tests/test_chat_tools.py` — add test class for 2 new tools |
| Modify | `apps/web/components/chat/ToolCard.tsx` — add 2 mini cards + switch cases |
| Modify | `apps/web/messages/ko.json` — add i18n keys |
| Modify | `apps/web/messages/en.json` — add i18n keys |

---

## Task 1: Backend — add get_twelve_un_seong tool

**Files:**
- Modify: `backend/llm/tools/saju_tools.py`

The `PillarInfo` schema (`backend/schemas/saju.py`) confirms each pillar has `twelve_wun: str`. The tool extracts `twelve_wun` from all four pillars and returns it as `data`.

- [ ] **Step 1: Add `get_twelve_un_seong` to saju_tools.py**

In `backend/llm/tools/saju_tools.py`, after the `get_strength` tool definition (line 294) and before `# ─── Domain-to-ten-god mapping`, add:

```python
@tool
async def get_twelve_un_seong(config: RunnableConfig = None) -> str:
    """12운성(십이운성) 분석. '12운성', '각 기둥 생로병사', '기둥별 생애단계' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    day = saju["day_pillar"]
    pillars_wun = {}
    for key in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar"):
        p = saju.get(key)
        if p:
            pillars_wun[key] = {
                "stem": p["stem"],
                "branch": p["branch"],
                "twelve_wun": p["twelve_wun"],
            }
    wun_labels = [f"{p['stem']}{p['branch']}({p['twelve_wun']})" for p in pillars_wun.values()]
    summary = (
        f"일간 {day['stem']}의 12운성: "
        + ", ".join(wun_labels)
    )
    data = {
        "pillars_wun": pillars_wun,
        "day_stem": day["stem"],
        "day_element": day["stem_element"],
    }
    return _envelope(summary, data)
```

Also add `"get_twelve_un_seong"` to `CHART_TOOL_NAMES` frozenset at the top of the file (add after `"get_strength"`):

```python
CHART_TOOL_NAMES = frozenset({
    "get_dae_un",
    "get_wol_un",
    "get_yeon_un",
    "get_daily_fortune",
    "get_il_jin",
    "get_compatibility_detail",
    "get_wuxing_balance",
    "get_ten_gods",
    "get_sin_sal",
    "get_palja",
    "get_strength",
    "get_twelve_un_seong",
    "get_hap_chung",
})
```

(Add `get_hap_chung` at the same time since both are in CHART_TOOL_NAMES together.)

- [ ] **Step 2: Add `get_hap_chung` tool in saju_tools.py**

Directly after `get_twelve_un_seong`, add:

```python
@tool
async def get_hap_chung(config: RunnableConfig = None) -> str:
    """합충 관계 분석. '합충', '기둥끼리 관계', '충', '삼합/육합', '공망' 질문에 사용."""
    birth_info = _birth_info(config)
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    branch_relations = saju.get("branch_relations", {})
    gong_mang = saju.get("gong_mang", {"vacant_branches": [], "affected_pillars": []})

    # 활성 관계 종류 요약 (비어있지 않은 키)
    active_keys = [k for k, v in branch_relations.items() if v]
    summary_parts = []
    if active_keys:
        summary_parts.append("·".join(active_keys) + " 관계가 있습니다")
    if gong_mang.get("affected_pillars"):
        affected = "·".join(gong_mang["affected_pillars"])
        summary_parts.append(f"{affected}주에 공망")
    summary = (
        "합충 관계: " + ", ".join(summary_parts)
        if summary_parts
        else "특별한 합충 관계가 없습니다."
    )

    data = {
        "year_pillar":   saju.get("year_pillar"),
        "month_pillar":  saju.get("month_pillar"),
        "day_pillar":    saju.get("day_pillar"),
        "hour_pillar":   saju.get("hour_pillar"),
        "branch_relations": branch_relations,
        "gong_mang":     gong_mang,
    }
    return _envelope(summary, data)
```

- [ ] **Step 3: Verify CHART_TOOL_NAMES contains both new tools**

Open `backend/llm/tools/saju_tools.py` and confirm the frozenset has 13 entries including `"get_twelve_un_seong"` and `"get_hap_chung"`.

- [ ] **Step 4: Run backend tests (expect pass — no new tests yet)**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q tests/test_chat_tools.py 2>&1 | tail -5
```

Expected: All existing tests pass.

---

## Task 2: Backend — register tools in pipeline + system prompt

**Files:**
- Modify: `backend/llm/pipelines/chat.py`
- Modify: `backend/llm/prompts/chat.py`

- [ ] **Step 1: Import + register in chat.py**

In `backend/llm/pipelines/chat.py`, update the import block (lines 17–23) to add the two new tools:

```python
from llm.tools.saju_tools import (
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
    get_compatibility_detail, request_partner_profile,
    get_wuxing_balance, get_ten_gods, get_sin_sal, get_palja, get_strength,
    get_twelve_un_seong, get_hap_chung,
)
```

Update the `CHAT_TOOLS` list (lines 25–32):

```python
CHAT_TOOLS = [
    search_rag, get_daily_fortune, get_wol_un, get_dae_un,
    get_yeon_un, get_il_jin, convert_calendar,
    get_current_luck_overview, find_favorable_periods,
    evaluate_specific_date, explain_past_event, check_current_sin_sal_timing,
    get_compatibility_detail, request_partner_profile,
    get_wuxing_balance, get_ten_gods, get_sin_sal, get_palja, get_strength,
    get_twelve_un_seong, get_hap_chung,
]
```

- [ ] **Step 2: Update system prompt in chat.py**

In `backend/llm/prompts/chat.py`, in `build_chat_system_prompt`, find the section that starts with `- 원국(만세력) 구조를 물으면` (around line 80) and extend it. Replace the entire paragraph:

```
- 원국(만세력) 구조를 물으면 **반드시 해당 카드 tool을 호출**해 시각자료를 띄우세요:
  오행/기운 균형 → get_wuxing_balance, 십성 → get_ten_gods, 신살 → get_sin_sal,
  사주팔자/원국 → get_palja, 강약·용신 → get_strength.
  해당 주제 질문이면 반드시 호출해 차트를 띄우고, **오행 비율·신살 이름·간지 같은 데이터를 텍스트로 나열하지 말고 해석만** 말하세요.
```

with:

```
- 원국(만세력) 구조를 물으면 **반드시 해당 카드 tool을 호출**해 시각자료를 띄우세요:
  오행/기운 균형 → get_wuxing_balance, 십성 → get_ten_gods, 신살 → get_sin_sal,
  사주팔자/원국 → get_palja, 강약·용신 → get_strength,
  12운성/십이운성/기둥별 생애단계 → get_twelve_un_seong, 합충/기둥관계/충·합 → get_hap_chung.
  해당 주제 질문이면 반드시 호출해 차트를 띄우고, **오행 비율·신살 이름·간지 같은 데이터를 텍스트로 나열하지 말고 해석만** 말하세요.
- 십이운성과 합충은 일반 사용자에게 생소한 개념입니다. 차트를 띄울 때 반드시 **쉬운 한 문장으로 무엇인지 먼저 설명**하세요.
  예) "12운성은 각 기둥의 기운이 생·장·쇠·사 중 어느 생애 단계에 있는지를 보는 분석이에요." (← 이런 식으로 한 줄 설명 후 해석)
  예) "합충은 기둥끼리 끌어당기거나(합) 부딪히는(충) 관계예요. 어떤 힘이 서로 작용하는지 보여드릴게요." (← 이런 식)
  데이터 나열은 금지 — 숫자·간지·관계 이름을 텍스트로 읊지 말고 차트가 보여줍니다.
```

- [ ] **Step 3: Run full backend tests again**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q 2>&1 | tail -10
```

Expected: All existing tests pass.

---

## Task 3: Backend — add tests for the two new tools

**Files:**
- Modify: `backend/tests/test_chat_tools.py`

- [ ] **Step 1: Add imports for new tools**

In `backend/tests/test_chat_tools.py`, update the import from `llm.tools.saju_tools` to include the new tools:

```python
from llm.tools.saju_tools import (
    extract_summary,
    request_partner_profile,
    get_compatibility_detail,
    REQUEST_PARTNER_SIGNAL,
    CHART_TOOL_NAMES,
    _compute_current_luck_overview,
    _compute_find_favorable_periods,
    _compute_evaluate_specific_date,
    _compute_check_current_sin_sal_timing,
    get_wuxing_balance,
    get_ten_gods,
    get_sin_sal,
    get_palja,
    get_strength,
    get_twelve_un_seong,
    get_hap_chung,
)
```

- [ ] **Step 2: Add new tool entries to _CARD_TOOLS and _CARD_DATA_KEYS**

In `test_chat_tools.py`, find the `_CARD_TOOLS` dict and add both tools:

```python
_CARD_TOOLS = {
    "get_wuxing_balance": get_wuxing_balance,
    "get_ten_gods":       get_ten_gods,
    "get_sin_sal":        get_sin_sal,
    "get_palja":          get_palja,
    "get_strength":       get_strength,
    "get_twelve_un_seong": get_twelve_un_seong,
    "get_hap_chung":      get_hap_chung,
}
```

And add their required data keys to `_CARD_DATA_KEYS`:

```python
_CARD_DATA_KEYS = {
    "get_wuxing_balance": [
        "wuxing_count_hap", "wuxing_count", "wuxing_chars",
        "wuxing_hap_contributions", "dominant_elements", "weak_elements",
        "day_stem_element",
    ],
    "get_ten_gods":  ["ten_gods_distribution", "structure_patterns"],
    "get_sin_sal":   ["sin_sals"],
    "get_palja":     ["year_pillar", "month_pillar", "day_pillar", "hour_pillar", "day_stem", "gyeok_guk"],
    "get_strength":  ["day_master_strength", "yong_sin"],
    "get_twelve_un_seong": ["pillars_wun", "day_stem", "day_element"],
    "get_hap_chung": ["year_pillar", "month_pillar", "day_pillar", "branch_relations", "gong_mang"],
}
```

- [ ] **Step 3: Add dedicated test class for the two new tools**

Append to `test_chat_tools.py` after the existing `TestVisualCardTools` class:

```python
class TestTwelveUnSeongTool:
    def _config(self) -> RunnableConfig:
        return {"configurable": {"birth_info": _BIRTH_SELF}}

    def test_in_chart_whitelist(self):
        assert "get_twelve_un_seong" in CHART_TOOL_NAMES

    def test_tool_name(self):
        assert get_twelve_un_seong.name == "get_twelve_un_seong"

    def test_envelope_shape(self):
        parsed = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))
        assert "summary" in parsed and isinstance(parsed["summary"], str)
        assert "data" in parsed and isinstance(parsed["data"], dict)

    def test_pillars_wun_contains_wun(self):
        data = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))["data"]
        assert "pillars_wun" in data
        pillars_wun = data["pillars_wun"]
        # at minimum year/month/day pillars are always present
        for pk in ("year_pillar", "month_pillar", "day_pillar"):
            assert pk in pillars_wun, f"missing {pk}"
            assert "twelve_wun" in pillars_wun[pk], f"{pk} missing twelve_wun"
            assert isinstance(pillars_wun[pk]["twelve_wun"], str)
            assert pillars_wun[pk]["twelve_wun"], f"{pk} has empty twelve_wun"

    def test_day_stem_and_element(self):
        data = json.loads(_invoke(get_twelve_un_seong, {}, self._config()))["data"]
        assert "day_stem" in data and data["day_stem"]
        assert "day_element" in data and data["day_element"]


class TestHapChungTool:
    def _config(self) -> RunnableConfig:
        return {"configurable": {"birth_info": _BIRTH_SELF}}

    def test_in_chart_whitelist(self):
        assert "get_hap_chung" in CHART_TOOL_NAMES

    def test_tool_name(self):
        assert get_hap_chung.name == "get_hap_chung"

    def test_envelope_shape(self):
        parsed = json.loads(_invoke(get_hap_chung, {}, self._config()))
        assert "summary" in parsed and isinstance(parsed["summary"], str)
        assert "data" in parsed and isinstance(parsed["data"], dict)

    def test_data_contains_pillars_and_relations(self):
        data = json.loads(_invoke(get_hap_chung, {}, self._config()))["data"]
        for pk in ("year_pillar", "month_pillar", "day_pillar"):
            assert pk in data, f"missing {pk}"
        assert "branch_relations" in data
        assert isinstance(data["branch_relations"], dict)
        assert "gong_mang" in data
        assert "vacant_branches" in data["gong_mang"]
        assert "affected_pillars" in data["gong_mang"]
```

- [ ] **Step 4: Run tests including the new ones**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q tests/test_chat_tools.py 2>&1 | tail -15
```

Expected: All tests pass, including `TestTwelveUnSeongTool` (5 tests) and `TestHapChungTool` (4 tests).

- [ ] **Step 5: Commit backend changes**

```bash
cd /home/rheon/Desktop/projects/SajuGuri && git add backend/llm/tools/saju_tools.py backend/llm/pipelines/chat.py backend/llm/prompts/chat.py backend/tests/test_chat_tools.py
git commit -m "feat: add get_twelve_un_seong and get_hap_chung chat tools

12운성·합충 차트 tool 추가.
- saju_tools.py: 두 tool 정의, CHART_TOOL_NAMES에 등록
- chat.py pipeline: CHAT_TOOLS에 등록
- chat.py prompt: 새 tool 호출 규칙 + 어려운 개념 설명 지침 추가
- test_chat_tools.py: 두 tool 검증 테스트 추가 (envelope·data 키·whitelist)"
```

---

## Task 4: Frontend — i18n keys

**Files:**
- Modify: `apps/web/messages/ko.json`
- Modify: `apps/web/messages/en.json`

Both new tools need label entries in `chat.toolCard.labels` and descriptive hint strings in a new `chat.toolCard.hints` section.

- [ ] **Step 1: Add ko.json keys**

In `apps/web/messages/ko.json`, inside `"chat" > "toolCard" > "labels"`, add after `"get_strength": "강약·용신"`:

```json
"get_twelve_un_seong": "12운성",
"get_hap_chung": "합충 관계"
```

Then add a new `"hints"` object inside `"chat" > "toolCard"`, after `"sinSal"`:

```json
"hints": {
  "twelveUnSeong": "12운성 = 각 기둥의 기운이 어느 생애 단계에 있는지",
  "hapChung": "합충 = 기둥끼리 끌어당기거나(합) 부딪히는(충) 관계"
}
```

- [ ] **Step 2: Add en.json keys**

In `apps/web/messages/en.json`, inside `"chat" > "toolCard" > "labels"`, add after `"get_strength": "Strength & Yongsin"`:

```json
"get_twelve_un_seong": "12-Stage Cycle",
"get_hap_chung": "Combinations & Clashes"
```

Then add a new `"hints"` object inside `"chat" > "toolCard"`, after `"sinSal"`:

```json
"hints": {
  "twelveUnSeong": "12-stage cycle = which life phase each pillar's energy is in",
  "hapChung": "Comb./Clash = whether pillars attract each other (합) or collide (충)"
}
```

- [ ] **Step 3: Run i18n check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri && node apps/web/scripts/check-i18n.mjs
```

Expected: Exit 0, no errors.

---

## Task 5: Frontend — TwelveUnSeongMini card

**Files:**
- Modify: `apps/web/components/chat/ToolCard.tsx`

The card shows 4 pillars (년/월/일/시) × 십이운성 label in a compact horizontal strip. Pillar keys in payload are `pillars_wun.year_pillar`, `pillars_wun.month_pillar`, etc.

- [ ] **Step 1: Add TwelveUnSeongMini component to ToolCard.tsx**

Add after the `StrengthMini` component (after line 334, before `// ── 메인 컴포넌트`):

```tsx
/** 12운성 — 4기둥 × 운성 라벨 스트립 */
function TwelveUnSeongMini({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const pillarsWun = (payload.pillars_wun ?? {}) as Record<string, { stem: string; branch: string; twelve_wun: string } | undefined>
  const order: Array<[string, string]> = [
    ['year_pillar', '연'],
    ['month_pillar', '월'],
    ['day_pillar', '일'],
    ['hour_pillar', '시'],
  ]
  const active = order.filter(([k]) => pillarsWun[k])
  if (active.length === 0) return null

  return (
    <div>
      <div className="flex gap-1.5">
        {active.map(([key, label]) => {
          const p = pillarsWun[key]!
          return (
            <div key={key} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] border-border-soft bg-surface px-1.5 py-2 text-center">
              <span className="text-[9px] font-bold text-text-sub">{label}주</span>
              <span className="font-serif text-base font-black leading-none text-ink">{p.stem}{p.branch}</span>
              <span className="mt-0.5 rounded-md bg-yellow-tint px-1.5 py-0.5 text-[10px] font-extrabold text-ink">{p.twelve_wun}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-text-sub">{t('hints.twelveUnSeong')}</p>
    </div>
  )
}
```

- [ ] **Step 2: Add HapChungMini component to ToolCard.tsx**

Add after `TwelveUnSeongMini` (still before `// ── 메인 컴포넌트`):

```tsx
/** 합충 관계 — 활성 관계 타입별 컴팩트 표시 */
function HapChungMini({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const br = (payload.branch_relations ?? {}) as Record<string, unknown>
  const gm = (payload.gong_mang ?? { vacant_branches: [], affected_pillars: [] }) as {
    vacant_branches: string[]
    affected_pillars: string[]
  }

  type RelEntry = { label: string; items: string[] }
  const relations: RelEntry[] = []

  // 충
  const chung = br.chung as Array<{ pair?: string[]; pillars?: string[] }> | undefined
  if (chung?.length) {
    relations.push({ label: '충', items: chung.map((v) => (v.pair ?? []).join('↔')) })
  }
  // 육합
  const yukHap = br.yuk_hap as Array<{ pair?: string[]; element?: string; is_effective?: boolean }> | undefined
  if (yukHap?.length) {
    relations.push({
      label: '육합',
      items: yukHap.map((v) => {
        const pair = (v.pair ?? []).join('')
        const broken = v.is_effective === false ? '(파괴)' : ''
        return `${pair}합${broken}`
      }),
    })
  }
  // 삼합
  const samHap = br.sam_hap as Array<{ name?: string; branches?: string[] }> | undefined
  if (samHap?.length) {
    relations.push({ label: '삼합', items: samHap.map((v) => v.name ?? (v.branches ?? []).join('')) })
  }
  // 공망
  if (gm.affected_pillars.length) {
    const PLABEL: Record<string, string> = { year: '연', month: '월', day: '일', hour: '시' }
    relations.push({ label: '공망', items: gm.affected_pillars.map((p) => PLABEL[p] ?? p) })
  }

  const HAP_COLOR = '#00A86B'
  const CHUNG_COLOR = '#FF6B00'

  return (
    <div>
      {relations.length === 0 ? (
        <p className="text-xs text-text-sub">{t('fields.none')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {relations.map((rel) => (
            <div key={rel.label} className="flex flex-wrap items-center gap-1">
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
                style={{ color: rel.label === '충' || rel.label === '공망' ? CHUNG_COLOR : HAP_COLOR, background: `${rel.label === '충' || rel.label === '공망' ? CHUNG_COLOR : HAP_COLOR}1A` }}
              >
                {rel.label}
              </span>
              {rel.items.map((item, i) => (
                <span key={i} className="text-xs font-bold text-ink">{item}</span>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-text-sub">{t('hints.hapChung')}</p>
    </div>
  )
}
```

- [ ] **Step 3: Add switch cases in renderContent**

In `ToolCard.tsx`, inside `renderContent`, add before the `default:` case:

```tsx
case 'get_twelve_un_seong':
  return <TwelveUnSeongMini payload={payload} t={t} />
case 'get_hap_chung':
  return <HapChungMini payload={payload} t={t} />
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit 2>&1 | tail -20
```

Expected: Exit 0, no errors.

- [ ] **Step 5: Run colors check**

```bash
cd /home/rheon/Desktop/projects/SajuGuri && node apps/web/scripts/check-colors.mjs --strict 2>&1
```

Expected: Exit 0. Note: `#00A86B` and `#FF6B00` are in the ALLOWED set per `check-colors.mjs` (they are the 오행 5색). `inline style` is used for these, not Tailwind arbitrary values — the script checks `text-[#...]` patterns in class strings only, not `style={{...}}`.

- [ ] **Step 6: Run i18n check (verify no regressions)**

```bash
cd /home/rheon/Desktop/projects/SajuGuri && node apps/web/scripts/check-i18n.mjs
```

Expected: Exit 0.

- [ ] **Step 7: Run frontend tests**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx vitest run 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 8: Run full backend tests (regression)**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q 2>&1 | tail -10
```

Expected: All pass.

- [ ] **Step 9: Commit frontend changes**

```bash
cd /home/rheon/Desktop/projects/SajuGuri && git add apps/web/components/chat/ToolCard.tsx apps/web/messages/ko.json apps/web/messages/en.json
git commit -m "feat: add TwelveUnSeongMini and HapChungMini cards to ToolCard

채팅 ToolCard에 12운성·합충 카드 추가.
- TwelveUnSeongMini: 4기둥 × 운성 라벨 스트립 + 1줄 범례
- HapChungMini: 충·합·공망 관계 칩 + 1줄 설명
- ko/en i18n labels + hints 추가"
```

---

## data payload 키 계약 (백↔프 일치)

### get_twelve_un_seong

```
data = {
  "pillars_wun": {
    "year_pillar":  { "stem": str, "branch": str, "twelve_wun": str },
    "month_pillar": { "stem": str, "branch": str, "twelve_wun": str },
    "day_pillar":   { "stem": str, "branch": str, "twelve_wun": str },
    "hour_pillar":  { "stem": str, "branch": str, "twelve_wun": str }  // only if birth_time present
  },
  "day_stem":    str,   // e.g. "갑"
  "day_element": str,   // e.g. "목"
}
```

Frontend reads: `payload.pillars_wun` → iterates `year_pillar/month_pillar/day_pillar/hour_pillar` each with `.stem`, `.branch`, `.twelve_wun`.

### get_hap_chung

```
data = {
  "year_pillar":   PillarInfo | None,
  "month_pillar":  PillarInfo | None,
  "day_pillar":    PillarInfo,
  "hour_pillar":   PillarInfo | None,
  "branch_relations": {
    "chung":         [ { "pair": [str, str], "pillars"?: [...] } ],
    "yuk_hap":       [ { "pair": [str, str], "element": str, "is_effective": bool, ... } ],
    "sam_hap":       [ { "name": str, "branches": [str, ...], "element": str } ],
    "cheon_gan_hap": [ { ... } ],
    // ... other relation keys present in engine output
  },
  "gong_mang": { "vacant_branches": [str, str], "affected_pillars": [str] }
}
```

Frontend reads: `payload.branch_relations.chung`, `payload.branch_relations.yuk_hap`, `payload.branch_relations.sam_hap`, `payload.gong_mang.affected_pillars` for compact display. Pillars are provided for future reference (same structure as `get_palja`).

---

## Self-Review Checklist

- [x] **CHART_TOOL_NAMES** in `saju_tools.py` updated with both tools.
- [x] **chat_sse.py** uses `from llm.tools.saju_tools import CHART_TOOL_NAMES` — no separate copy, automatically picks up new entries.
- [x] **Prompts** updated with two tool names + user-friendly explanation guidelines.
- [x] **Tests** cover: envelope shape, data keys, whitelist registration, tool name.
- [x] **i18n** ko+en both updated, `check-i18n.mjs` will pass.
- [x] **Colors** use `inline style` with ohaeng 5색 hex values (`#00A86B`, `#FF6B00`) that are already in the ALLOWED set in `check-colors.mjs`. No Tailwind `text-[#...]` arbitrary classes.
- [x] **No Co-Authored-By**, no scope parens in commit messages.
- [x] **`chat_sse.py`** imports `CHART_TOOL_NAMES` directly from `saju_tools.py` — confirmed at line 17 of `chat_sse.py`. No separate copy to update.
