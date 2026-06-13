import type { SajuCalcResponse, SinSal } from '@sajuguri/api-client'
import Chip from '@/components/ui/Chip'

function sinSalVariant(s: SinSal): 'lucky' | 'unlucky' | 'default' {
  if (s.type === 'lucky') return 'lucky'
  if (s.type === 'unlucky' || s.type === 'warning') return 'unlucky'
  return 'default'   // neutral(역마·화개·도화 등)은 중립 화이트 — design.md §4.1
}

export default function TagChips({ data }: { data: SajuCalcResponse }) {
  const shown = data.sin_sals.slice(0, 4)   // 상위 4개만 — 전체는 접이식 상세(1c)
  return (
    <div>
      <Chip variant="yellow">{data.day_pillar.ganji_name} 일주</Chip>
      <Chip>{data.gyeok_guk.name}</Chip>
      <Chip>용신 {data.yong_sin.primary}</Chip>
      <Chip>{data.day_master_strength.level_8}</Chip>
      {shown.map((s) => <Chip key={s.name} variant={sinSalVariant(s)}>{s.name}</Chip>)}
    </div>
  )
}
