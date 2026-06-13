"""명리 용어 단일 소스 glossary.

AI 프롬프트(영어 출력 지시)와 UI(en.json)가 동일 표기를 사용하도록
이 dict를 단일 진실 원천(SSOT)으로 관리한다.
"""

SAJU_GLOSSARY: dict[str, str] = {
    # ── 핵심 사주 개념 (spec §4 필수) ──────────────────────────────────
    "용신": "Yongsin (favorable element)",
    "대운": "Daeun (luck pillars)",
    "격국": "Gyeokguk (chart structure)",
    "신살": "Sinsal (symbolic stars)",
    "지장간": "Jijanggan (hidden stems)",
    "상생": "generating cycle",
    "상극": "controlling cycle",
    "일간": "Day Master",
    "오행": "Five Elements",
    "십성": "Ten Gods",
    # ── 오행 (Five Elements) ─────────────────────────────────────────────
    "목": "Wood",
    "화": "Fire",
    "토": "Earth",
    "금": "Metal",
    "수": "Water",
    # ── 사주 기둥 (Four Pillars) ─────────────────────────────────────────
    "년주": "Year Pillar",
    "월주": "Month Pillar",
    "일주": "Day Pillar",
    "시주": "Hour Pillar",
    # ── 천간 / 지지 ──────────────────────────────────────────────────────
    "천간": "Heavenly Stems",
    "지지": "Earthly Branches",
    # ── 간지 관계 (합·충·형·파·해) ──────────────────────────────────────
    "합": "combination (합)",
    "충": "clash (충)",
    "형": "punishment (형)",
    "파": "disruption (파)",
    "해": "harm (해)",
    # ── 십성 (Ten Gods) ──────────────────────────────────────────────────
    "비견": "Bigyeon (Parallel)",
    "겁재": "Geopjae (Rob Wealth)",
    "식신": "Siksin (Eating God)",
    "상관": "Sanggwan (Hurting Officer)",
    "편재": "Pyeonjae (Indirect Wealth)",
    "정재": "Jeongjae (Direct Wealth)",
    "편관": "Pyeongwan (Indirect Officer / Seven Killings)",
    "칠살": "Chilsal (Seven Killings)",
    "정관": "Jeonggwan (Direct Officer)",
    "편인": "Pyeonin (Indirect Resource)",
    "정인": "Jeongin (Direct Resource)",
    # ── 기타 주요 사주 용어 ──────────────────────────────────────────────
    "기신": "Gisin (unfavorable element)",
    "사주": "Saju (Four Pillars of Destiny)",
    "명리": "Myeongli (Destiny Analysis)",
    "세운": "Seun (annual fortune)",
    "월운": "Wol-un (monthly fortune)",
    "일운": "Il-un (daily fortune)",
    "공망": "Gongmang (Empty Space / Void)",
    "12운성": "Twelve Growth Stages",
    "12신살": "Twelve Symbolic Stars",
    "천을귀인": "Cheonul Gwiin (Heavenly Noble Benefactor)",
    "도화": "Dohwa (Peach Blossom)",
    "역마": "Yeokma (Travelling Star)",
    "화개": "Hwagae (Flower Canopy)",
    "양인": "Yangin (Goat Blade)",
}


def render_glossary(glossary: dict[str, str] = SAJU_GLOSSARY) -> str:
    """glossary dict를 '한글 → English' 줄 목록 문자열로 반환한다.

    프롬프트에 직접 주입할 수 있는 형태.
    """
    return "\n".join(f"{ko} → {en}" for ko, en in glossary.items())
