"""운세 스토리 파이프라인 (A2) — 조립 + GPT 리라이트 + 폴백 단위 테스트.

LLM 실호출 금지: providers.get_llm을 스텁으로 교체한다.
"""

from __future__ import annotations

import json

import pytest

import llm.pipelines.daily_story as story


# ── 엔진 스텁 데이터 (DailyFortuneResponse dict 형태) ──
def _engine_data() -> dict:
    cats = ("exam", "money", "love", "career", "health", "social")
    labels = {
        "exam": "시험운", "money": "재물운", "love": "애정운",
        "career": "직장운", "health": "건강운", "social": "대인운",
    }
    scores = {"exam": 87, "money": 64, "love": 72, "career": 55, "health": 90, "social": 48}
    fortunes = {
        c: {"score": scores[c], "level": "좋음", "text": f"{labels[c]} 본문", "label": labels[c]}
        for c in cats
    }
    return {
        "target_date": "2026-06-13",
        "day_ganji": {"stem": "병", "branch": "오"},
        "overall": "오늘은 전반적으로 무난한 하루입니다.",
        "caution": "충동적인 결정을 조심하세요.",
        "basis": "오늘 지지의 화 기운이 강합니다.",
        "signals": [{"key": "gwi_in", "label": "천을귀인", "tone": "good", "desc": "오늘 지지 오는 내 일간 임의 천을귀인 → 도와주는 사람이 나타나는 날"}],
        "good_hours": [{"branch": "사", "label": "오전 9시 반~11시 반", "element": "화"}],
        "action": {"headline": "부탁할 일이 있다면 오늘 꺼내세요", "body": "천을귀인이 들어온 날입니다.", "good_hours": []},
        "fortunes": fortunes,
        "birth_day_pillar": {"stem": "임", "branch": "자", "stem_element": "수"},
    }


@pytest.fixture
def _stub_engine(monkeypatch):
    monkeypatch.setattr(story, "get_daily_fortune", lambda req: _Resp())


class _Resp:
    def model_dump(self):
        return _engine_data()


# ── 1. 조립: 카드 11장·순서·kind ──
def test_assemble_produces_11_cards_in_order():
    data = _engine_data()
    cards, scores, keyword = story.assemble_story(data, profile_name="홍길동")

    assert len(cards) == 11
    kinds = [c["kind"] for c in cards]
    assert kinds == [
        "intro", "overall",
        "category", "category", "category", "category", "category", "category",
        "caution", "action", "summary",
    ]
    # category 카드는 6개 키 순서대로
    cat_keys = [c["category_key"] for c in cards if c["kind"] == "category"]
    assert cat_keys == ["exam", "money", "love", "career", "health", "social"]
    # scores 매핑
    assert scores == {"exam": 87, "money": 64, "love": 72, "career": 55, "health": 90, "social": 48}
    # keyword는 최고점 카테고리(health=90) 기반
    assert keyword


def test_overall_card_has_avg_score():
    data = _engine_data()
    cards, _, _ = story.assemble_story(data, profile_name="")
    overall = next(c for c in cards if c["kind"] == "overall")
    assert overall["score"] is not None
    intro = cards[0]
    assert intro["kind"] == "intro"
    assert "병" in intro["body"] or "병" in intro["headline"] or "병오" in intro["body"]


def test_summary_headline_differs_from_keyword():
    """summary 카드 headline은 총운 첫 문장, keyword와 같아선 안 된다 (중복 방지)."""
    data = _engine_data()
    cards, _, keyword = story.assemble_story(data, profile_name="홍길동")
    summary = next(c for c in cards if c["kind"] == "summary")
    # headline은 keyword가 아닌 총운 첫 문장 기반
    assert summary["headline"] != keyword
    # 총운 본문(overall)에서 파생된 텍스트여야 함
    assert summary["headline"] in data["overall"] or summary["headline"].rstrip("…") in data["overall"]


def test_keyword_low_avg_uses_calm_word():
    """총점 50 미만이면 키워드가 긍정 도약형이 아닌 회복/안정 계열이어야 한다."""
    data = _engine_data()
    # 모든 점수를 낮게 — avg 40
    for key in data["fortunes"]:
        data["fortunes"][key]["score"] = 40
    _, _, keyword = story.assemble_story(data, profile_name="")
    # 저점 매핑 키워드들
    assert keyword in {"인내", "절약", "이해", "집중", "휴식", "배려", "안정"}


# ── 2. 리라이트 성공 (LLM 스텁) ──
class _FakeMsg:
    def __init__(self, content):
        self.content = content


class _FakeLLM:
    def __init__(self, payload):
        self._payload = payload

    async def ainvoke(self, messages):
        return _FakeMsg(self._payload)


def _rewrite_payload(cards):
    return json.dumps(
        [{"id": i, "headline": f"리라이트 {i}", "body": f"본문 {i}"} for i in range(len(cards))],
        ensure_ascii=False,
    )


async def test_rewrite_success(monkeypatch, _stub_engine):
    data = _engine_data()
    cards, _, _ = story.assemble_story(data, profile_name="홍길동")

    monkeypatch.setattr(story.settings, "openai_api_key", "sk-test", raising=False)
    monkeypatch.setattr(story, "get_llm", lambda *a, **k: _FakeLLM(_rewrite_payload(cards)))

    resp = await story.build_daily_story(
        _DummyReq(), profile_name="홍길동", date="2026-06-13"
    )
    assert resp.rewritten is True
    assert resp.cards[0].headline == "리라이트 0"
    # 점수·간지는 보존
    assert resp.day_ganji == {"stem": "병", "branch": "오"}
    assert resp.scores["health"] == 90
    # title은 리라이트가 안 건드림
    overall = next(c for c in resp.cards if c.kind == "overall")
    assert overall.score is not None


# ── 3. 폴백: 키 없음 / LLM 예외 ──
class _BoomLLM:
    async def ainvoke(self, messages):
        raise RuntimeError("no api key")


async def test_rewrite_failure_falls_back_to_template(monkeypatch, _stub_engine):
    monkeypatch.setattr(story.settings, "openai_api_key", "sk-test", raising=False)
    monkeypatch.setattr(story, "get_llm", lambda *a, **k: _BoomLLM())

    resp = await story.build_daily_story(
        _DummyReq(), profile_name="홍길동", date="2026-06-13"
    )
    assert resp.rewritten is False
    # 폴백이어도 11장·점수·간지는 정상
    assert len(resp.cards) == 11
    assert resp.scores["exam"] == 87
    assert resp.day_ganji == {"stem": "병", "branch": "오"}
    assert resp.keyword


async def test_rewrite_bad_json_falls_back(monkeypatch, _stub_engine):
    class _BadJson:
        async def ainvoke(self, messages):
            return _FakeMsg("이건 JSON이 아님")

    monkeypatch.setattr(story.settings, "openai_api_key", "sk-test", raising=False)
    monkeypatch.setattr(story, "get_llm", lambda *a, **k: _BadJson())
    resp = await story.build_daily_story(_DummyReq(), profile_name="", date="2026-06-13")
    assert resp.rewritten is False
    assert len(resp.cards) == 11


class _DummyReq:
    """get_daily_fortune에 넘기는 요청 — 스텁 엔진은 무시한다."""

    birth_date = "1990-03-15"
