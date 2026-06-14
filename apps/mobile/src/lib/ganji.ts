// 일주 닉네임·마스코트 색 — apps/web/lib/manse/ganjiNickname.ts에서 그대로 포팅 (순수 로직).
// 천간/지지는 엔진이 주는 한글 한 글자(stem='임', branch='자')를 입력으로 받는다.

interface StemColor {
  ko: string
  en: string
  bg: string
}

const STEM_COLOR: Record<string, StemColor> = {
  갑: { ko: '푸른', en: 'Blue', bg: '#7FC7BE' },
  을: { ko: '푸른', en: 'Blue', bg: '#7FC7BE' },
  병: { ko: '붉은', en: 'Red', bg: '#EA6845' },
  정: { ko: '붉은', en: 'Red', bg: '#EA6845' },
  무: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  기: { ko: '황금', en: 'Golden', bg: '#FFD900' },
  경: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },
  신: { ko: '은빛', en: 'Silver', bg: '#E8EAED' },
  임: { ko: '회색', en: 'Gray', bg: '#8B8178' },
  계: { ko: '회색', en: 'Gray', bg: '#8B8178' },
}

const BRANCH_ANIMAL: Record<string, { ko: string; en: string }> = {
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

export const STEM_BG: Record<string, string> = Object.fromEntries(
  Object.entries(STEM_COLOR).map(([k, v]) => [k, v.bg]),
)

export const MASCOT_DEFAULT_BG = '#FFD900'

const GREY_STEMS = new Set(['#8B8178'])

export interface MascotBody {
  color: string
  grey: boolean
}

/** 일간 한글(예: '임')로 마스코트 몸통색·회색 여부를 해결한다. */
export function stemToMascotBody(stem?: string | null): MascotBody {
  const color = (stem && STEM_BG[stem]) || MASCOT_DEFAULT_BG
  return { color, grey: GREY_STEMS.has(color) }
}

export interface GanjiNickname {
  ko: string
  en: string
  bg: string
}

const FALLBACK_BG = '#FFD900'

/** 천간·지지로 일주 닉네임과 배경색을 만든다. */
export function ganjiNickname(stem: string, branch: string): GanjiNickname {
  const color = STEM_COLOR[stem]
  const animal = BRANCH_ANIMAL[branch]
  if (!color || !animal) {
    return { ko: '', en: '', bg: color?.bg ?? FALLBACK_BG }
  }
  return { ko: `${color.ko} ${animal.ko}`, en: `${color.en} ${animal.en}`, bg: color.bg }
}
