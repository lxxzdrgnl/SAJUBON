/**
 * 로그인 사용자용 시간대별 인사말 풀 — 매 요청 랜덤 선택.
 * 존댓말 + 가벼운 위트 (리포트·채팅 톤과 동일 결, design.md §6).
 * {name} 자리에 이메일 로컬파트가 들어간다.
 */

export type GreetingSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'

export function slotForHour(hour: number): GreetingSlot {
  if (hour < 5) return 'dawn'
  if (hour < 11) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

const POOL: Record<'ko' | 'en', Record<GreetingSlot, string[]>> = {
  ko: {
    dawn: [
      '{name}님, 이 시간까지 깨어 계신 것도 운명일까요?',
      '{name}님, 새벽 기운은 또 다르답니다',
    ],
    morning: [
      '{name}님, 오늘 기운 보러 갈까요?',
      '좋은 아침이에요 {name}님, 오늘 일진부터 볼까요?',
      '{name}님, 오늘은 어떤 하루가 기다릴까요?',
    ],
    afternoon: [
      '{name}님, 오후의 흐름도 챙겨볼까요?',
      '{name}님, 잠깐 쉬어가며 운세 한 장 어때요?',
      '{name}님, 남은 하루의 기운이 궁금하지 않으세요?',
    ],
    evening: [
      '{name}님, 오늘 하루 수고했어요. 운세로 마무리할까요?',
      '{name}님, 저녁의 기운은 차분하게 읽혀요',
    ],
    night: [
      '{name}님, 주무시기 전에 내일 기운 살짝 볼까요?',
      '{name}님, 밤하늘 보며 운세 한 장 어때요?',
    ],
  },
  en: {
    dawn: [
      '{name}, still up? Maybe it’s destiny',
      '{name}, the dawn carries a different energy',
    ],
    morning: [
      '{name}, shall we check today’s energy?',
      'Good morning {name}, ready for today’s reading?',
      '{name}, wonder what today holds?',
    ],
    afternoon: [
      '{name}, how about a midday check-in?',
      '{name}, take a break with a quick reading',
      '{name}, curious about the rest of your day?',
    ],
    evening: [
      '{name}, long day? Let’s wrap it up with a reading',
      '{name}, evenings read calm and clear',
    ],
    night: [
      '{name}, a peek at tomorrow before bed?',
      '{name}, one last reading under the night sky',
    ],
  },
}

/** 시간대 풀에서 랜덤 1개 선택 후 {name} 치환. rand 주입은 테스트용 */
export function pickGreeting(
  locale: 'ko' | 'en',
  name: string,
  hour: number,
  rand: () => number = Math.random,
): string {
  const pool = POOL[locale][slotForHour(hour)]
  const msg = pool[Math.floor(rand() * pool.length) % pool.length]
  return msg.replaceAll('{name}', name)
}
