// 로그인 사용자용 시간대별 인사말 — apps/web/lib/greetings.ts에서 포팅(ko). 존댓말 + 가벼운 위트.
type GreetingSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'

function slotForHour(hour: number): GreetingSlot {
  if (hour < 5) return 'dawn'
  if (hour < 11) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

const POOL: Record<GreetingSlot, string[]> = {
  dawn: ['{name}님, 아직 안 주무셨네요', '{name}님, 늦은 시간까지 고생 많으세요', '{name}님, 새벽까지 바쁘셨나 봐요'],
  morning: ['{name}님, 오늘 운세 보러 갈까요?', '좋은 아침이에요, {name}님', '{name}님, 오늘 하루 어떨지 볼까요?', '{name}님, 잘 주무셨어요?'],
  afternoon: ['{name}님, 오후도 잘 보내고 계신가요?', '{name}님, 오늘 운세 아직이라면 지금이에요', '{name}님, 점심은 챙기셨어요?', '{name}님, 남은 하루도 잘 풀리길 바라요'],
  evening: ['{name}님, 오늘 하루 어떠셨어요?', '{name}님, 오늘도 수고 많았어요', '{name}님, 하루 마무리 잘 하고 계세요?'],
  night: ['{name}님, 내일 운세 미리 볼까요?', '{name}님, 편안한 밤 보내세요', '{name}님, 오늘 하루도 끝이네요'],
}

/** 시간대 풀에서 랜덤 1개 선택 후 {name} 치환. */
export function pickGreeting(name: string, hour: number): string {
  const pool = POOL[slotForHour(hour)]
  const msg = pool[Math.floor(Math.random() * pool.length) % pool.length]
  return msg.replaceAll('{name}', name)
}
