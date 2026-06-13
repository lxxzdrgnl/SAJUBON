from scripts.etl.classify import classify_table

def test_saju_ai_generated():
    assert classify_table("S087") == {"domain": "saju", "trust": "ai_generated"}

def test_classical_jamidusu():
    assert classify_table("J017") == {"domain": "jamidusu", "trust": "classical"}

def test_classical_saju_range():
    # 6/2 spec §2.3: S045~S056은 정통 고전 문체
    assert classify_table("S045")["trust"] == "classical"
    assert classify_table("S044")["trust"] == "ai_generated"

def test_compatibility():
    assert classify_table("G001")["domain"] == "compatibility"

def test_lookup_tables_excluded():
    assert classify_table("LunarToSolar") is None   # 계산·참조 테이블 → 인제스트 제외
    assert classify_table("namedata") is None

def test_unknown_default():
    assert classify_table("ZZZ9") == {"domain": "misc", "trust": "ai_generated"}
