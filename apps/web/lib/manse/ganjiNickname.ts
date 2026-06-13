// 일주 닉네임 — 천간(색)·지지(띠 동물)로 "회색 쥐" 같은 캐릭터 문구를 만든다.
// 천간/지지는 엔진이 주는 한글 한 글자(stem='임', branch='자')를 입력으로 받는다.

/** 천간 → 색 이름 (사용자 워딩: 임·계 = 회색) + 일주 히어로 배경색(잉크 텍스트 가독 캔디 톤) */
interface StemColor {
  ko: string
  en: string
  /** 히어로 배경 hex */
  bg: string
}

const STEM_COLOR: Record<string, StemColor> = {
  갑: { ko: '푸른', en: 'Blue', bg: '#D6EAEA' },   // 목 — 흰색계열(은은한 청록)
  을: { ko: '푸른', en: 'Blue', bg: '#D6EAEA' },
  병: { ko: '붉은', en: 'Red', bg: '#FF9466' },
  정: { ko: '붉은', en: 'Red', bg: '#FF9466' },
  무: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  기: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  경: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },  // 금 — 백색(은빛 화이트)
  신: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },
  임: { ko: '회색', en: 'Gray', bg: '#B9C4CC' },
  계: { ko: '회색', en: 'Gray', bg: '#B9C4CC' },
}

/** 지지 → 띠 동물 */
interface BranchAnimal {
  ko: string
  en: string
}

const BRANCH_ANIMAL: Record<string, BranchAnimal> = {
  자: { ko: '쥐', en: 'Rat' },
  축: { ko: '소', en: 'Ox' },
  인: { ko: '호랑이', en: 'Tiger' },
  묘: { ko: '토끼', en: 'Rabbit' },
  진: { ko: '용', en: 'Dragon' },
  사: { ko: '뱀', en: 'Snake' },
  오: { ko: '말', en: 'Horse' },
  미: { ko: '양', en: 'Goat' },
  신: { ko: '원숭이', en: 'Monkey' },
  유: { ko: '닭', en: 'Rooster' },
  술: { ko: '개', en: 'Dog' },
  해: { ko: '돼지', en: 'Pig' },
}

export interface GanjiNickname {
  /** 한글 닉네임 — 예: '회색 쥐' */
  ko: string
  /** 영문 닉네임 — 예: 'Gray Rat' */
  en: string
  /** 일주 히어로 배경 hex */
  bg: string
}

const FALLBACK_BG = '#FFD900'

/**
 * 천간·지지로 일주 닉네임과 배경색을 만든다.
 * @param stem   천간 한글 한 글자 (예: '임')
 * @param branch 지지 한글 한 글자 (예: '자')
 */
export function ganjiNickname(stem: string, branch: string): GanjiNickname {
  const color = STEM_COLOR[stem]
  const animal = BRANCH_ANIMAL[branch]
  if (!color || !animal) {
    return { ko: '', en: '', bg: color?.bg ?? FALLBACK_BG }
  }
  return {
    ko: `${color.ko} ${animal.ko}`,
    en: `${color.en} ${animal.en}`,
    bg: color.bg,
  }
}
