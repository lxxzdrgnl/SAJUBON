"""채팅 SSE 이벤트 매핑 — LangGraph astream_events → 프론트 계약 이벤트.

순수 함수만 둔다 (DB·LLM 부수효과 없음) — 단위 테스트 대상.

프론트 계약 (plan 공통 SSE):
  {"type":"token","content":"..."}
  {"type":"tool_result","tool":"get_dae_un","payload":{...}}
  {"type":"request_partner"}
  {"type":"title","title":"..."}
  {"type":"done"}
"""

from __future__ import annotations

import json

from llm.tools.saju_tools import CHART_TOOL_NAMES, REQUEST_PARTNER_SIGNAL


def _tool_output_str(output) -> str:
    """on_tool_end output에서 문자열 콘텐츠를 추출 (ToolMessage·str·기타 호환)."""
    if output is None:
        return ""
    content = getattr(output, "content", output)
    if isinstance(content, str):
        return content
    return str(content)


def map_stream_event(event: dict) -> dict | None:
    """LangGraph astream_events 이벤트 1개 → 프론트 이벤트 dict 또는 None(무시).

    - on_chat_model_stream → token
    - on_tool_end(request_partner_profile) → request_partner
    - on_tool_end(차트 화이트리스트 tool) → tool_result(payload=data)
    """
    etype = event.get("event")

    if etype == "on_chat_model_stream":
        chunk = event.get("data", {}).get("chunk")
        content = getattr(chunk, "content", None)
        if content:
            return {"type": "token", "content": content}
        return None

    if etype == "on_tool_end":
        name = event.get("name", "")
        raw = _tool_output_str(event.get("data", {}).get("output"))

        if name == "request_partner_profile" or raw == REQUEST_PARTNER_SIGNAL:
            return {"type": "request_partner"}

        if name in CHART_TOOL_NAMES:
            try:
                parsed = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return None
            data = parsed.get("data") if isinstance(parsed, dict) else None
            if not isinstance(data, dict):
                return None
            # 궁합 tool이 상대 정보 부족 신호를 줄 때는 차트 대신 request_partner 의미.
            if data.get("need_partner"):
                return {"type": "request_partner"}
            return {"type": "tool_result", "tool": name, "payload": data}

    return None


def sse(payload: dict) -> str:
    """이벤트 dict → SSE data 라인."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
