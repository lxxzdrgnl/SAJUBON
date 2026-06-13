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
  갑: { ko: '푸른', en: 'Blue', bg: '#7FC7BE' },   // 목 — 또렷한 청록
  을: { ko: '푸른', en: 'Blue', bg: '#7FC7BE' },
  병: { ko: '붉은', en: 'Red', bg: '#F5623A' },   // 화 — 또렷한 적색
  정: { ko: '붉은', en: 'Red', bg: '#F5623A' },
  무: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  기: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  경: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },  // 금 — 백색(은빛 화이트)
  신: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },
  임: { ko: '회색', en: 'Gray', bg: '#8B8178' },   // 수 — 웜그레이
  계: { ko: '회색', en: 'Gray', bg: '#8B8178' },
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

/**
 * 마스코트 몸통·일주 히어로·아바타 배경 일간 오행색 (design.md §8 — 단일 출처).
 * STEM_COLOR.bg에서 파생 — 히어로/마스코트/아바타가 항상 같은 색을 쓰게 한다.
 *   갑·을 푸른 #7FC7BE / 병·정 붉은 #F5623A / 무·기 황금 #FFD900 /
 *   경·신 은빛 #E8EAED(흰색계열) / 임·계 회색 #8B8178(웜그레이)
 */
export const STEM_BG: Record<string, string> = Object.fromEntries(
  Object.entries(STEM_COLOR).map(([k, v]) => [k, v.bg]),
)

/** 마스코트 기본 몸통색(일간 미상 시) — 현행 옐로. */
export const MASCOT_DEFAULT_BG = '#FFD900'

/** 웜그레이(임·계) 몸통은 디테일이 묻히므로 이목구비 검정 강조 + 글로우 처리. */
const GREY_STEMS = new Set(['#8B8178'])

export interface MascotBody {
  /** SVG 몸통에 칠할 색 */
  color: string
  /** 회색 보정 대상 여부 (이목구비 검정 강조 + 글로우) */
  grey: boolean
}

/**
 * 일간 한글(예: '임')로 마스코트 몸통색·회색 여부를 해결한다.
 * day_stem이 없거나 미지면 기본 옐로(비-회색).
 */
export function stemToMascotBody(stem?: string | null): MascotBody {
  const color = (stem && STEM_BG[stem]) || MASCOT_DEFAULT_BG
  return { color, grey: GREY_STEMS.has(color) }
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
