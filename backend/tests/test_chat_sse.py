"""채팅 SSE 이벤트 매핑 단위 테스트 (A3) — 순수 함수만."""

import json

from langchain_core.messages import AIMessageChunk

from llm.chat_sse import map_stream_event, sse
from llm.tools.saju_tools import REQUEST_PARTNER_SIGNAL, _envelope


_AGENT_META = {"metadata": {"langgraph_node": "agent"}}


def test_token_event():
    ev = {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content="안녕")}, **_AGENT_META}
    assert map_stream_event(ev) == {"type": "token", "content": "안녕"}


def test_empty_token_ignored():
    ev = {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content="")}, **_AGENT_META}
    assert map_stream_event(ev) is None


def test_guard_node_token_excluded():
    """guard 노드 LLM('OK|general' 분류) 토큰은 스트리밍 제외."""
    ev = {"event": "on_chat_model_stream", "data": {"chunk": AIMessageChunk(content="OK|general")},
          "metadata": {"langgraph_node": "guard"}}
    assert map_stream_event(ev) is None


def test_request_partner_by_tool_name():
    ev = {"event": "on_tool_end", "name": "request_partner_profile",
          "data": {"output": REQUEST_PARTNER_SIGNAL}}
    assert map_stream_event(ev) == {"type": "request_partner"}


def test_chart_tool_result_extracts_data():
    payload = {"dae_un_list": [{"ganji": "갑자"}]}
    ev = {"event": "on_tool_end", "name": "get_dae_un",
          "data": {"output": _envelope("대운입니다", payload)}}
    out = map_stream_event(ev)
    assert out == {"type": "tool_result", "tool": "get_dae_un", "payload": payload}


def test_compatibility_need_partner_becomes_request_partner():
    ev = {"event": "on_tool_end", "name": "get_compatibility_detail",
          "data": {"output": _envelope("상대 필요", {"need_partner": True})}}
    assert map_stream_event(ev) == {"type": "request_partner"}


def test_non_whitelisted_tool_ignored():
    ev = {"event": "on_tool_end", "name": "search_rag",
          "data": {"output": json.dumps({"x": 1})}}
    assert map_stream_event(ev) is None


def test_tool_output_as_toolmessage():
    """on_tool_end output이 ToolMessage 형태(.content)일 때도 처리."""
    from langchain_core.messages import ToolMessage
    payload = {"year": 2026, "months": []}
    msg = ToolMessage(content=_envelope("월운", payload), tool_call_id="x")
    ev = {"event": "on_tool_end", "name": "get_wol_un", "data": {"output": msg}}
    out = map_stream_event(ev)
    assert out["type"] == "tool_result"
    assert out["payload"] == payload


def test_sse_serialization():
    line = sse({"type": "done"})
    assert line == 'data: {"type": "done"}\n\n'
