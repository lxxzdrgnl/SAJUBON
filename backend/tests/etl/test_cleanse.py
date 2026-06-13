from scripts.etl.cleanse import cleanse_text

def test_html_tags_removed():
    assert cleanse_text("용꿈은 <BR>귀한<br/> 자식") == "용꿈은 귀한 자식"

def test_broken_markup_removed():
    # 6/2 spec §4.2 명시 사례: 깨진 <FONT c< body> 류
    assert cleanse_text("길하다<FONT c< body>흉하다") == "길하다 흉하다"

def test_whitespace_normalized():
    assert cleanse_text("  복이   많다.\r\n\r\n재물운  ") == "복이 많다.\n재물운"

def test_empty_and_none():
    assert cleanse_text("") == ""
    assert cleanse_text(None) == ""
