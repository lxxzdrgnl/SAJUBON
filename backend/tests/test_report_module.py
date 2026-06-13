from llm.reports.base import ReportModule, ReportTab


def test_report_tab_defaults():
    t = ReportTab(category="갈등", headline="속도가 다른 두 사람", content="...")
    assert t.requested is False


def test_dummy_module_conforms():
    class Dummy:
        key = "dummy"
        def assemble_signals(self, inputs): return {"x": 1}
        def build_rag_context(self, signals): return ""
        def output_schema(self): return ReportTab
        def system_prompt(self): return "sys"
        def format_message(self, signals): return "msg"
        def assemble_tabs(self, parsed, signals, request_topics): return [ReportTab(category="c", headline="h", content="b")]
    m: ReportModule = Dummy()
    assert m.assemble_tabs(None, {}, None)[0].category == "c"
