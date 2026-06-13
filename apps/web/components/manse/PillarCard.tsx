import type { Pillar } from '@sajuguri/api-client'
import { ohaengColor, ohaengTintColor } from '@/lib/ohaeng'

/** 기둥 카드 1장 — kind: 'stem'(천간) | 'branch'(지지). 일주 기둥은 오렌지 보더 (design.md §5.3) */
export default function PillarCard({
  pillar, kind, label, isDay = false,
}: {
  pillar: Pillar
  kind: 'stem' | 'branch'
  label?: string
  isDay?: boolean
}) {
  const hanja = kind === 'stem' ? pillar.stem_hanja : pillar.branch_hanja
  const kor = kind === 'stem' ? pillar.stem : pillar.branch
  const element = kind === 'stem' ? pillar.stem_element : pillar.branch_element
  const tenGod = kind === 'stem' ? pillar.stem_ten_god : pillar.branch_ten_god
  const color = ohaengColor(element)
  const border = isDay ? 'border-orange shadow-[2.5px_2.5px_0_#FF6B00]' : 'border-ink shadow-[2.5px_2.5px_0_#1A1A1A]'
  return (
    <div className={`flex-1 rounded-xl border-2 ${border} px-1 py-2 text-center`}
      style={{ background: ohaengTintColor(element) }}>
      {label && (
        <p className={`text-[10px] font-bold ${isDay ? 'text-orange' : 'text-text-sub'}`}>
          {label}{isDay ? ' ★' : ''}
        </p>
      )}
      <p className="font-serif text-[26px] font-black leading-tight" style={{ color }}>{hanja}</p>
      <p className="text-[11px] font-extrabold" style={{ color }}>{kor} · {element}</p>
      <p className="mt-0.5 text-[10px] text-text-sub">{tenGod}</p>
    </div>
  )
}
