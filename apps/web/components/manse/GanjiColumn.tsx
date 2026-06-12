import { ohaengColor } from '@/lib/ohaeng'

/** 운(대운/연운/월운) 한 칸 — 상단 라벨·천간 타일·지지 타일·하단 십성·강조 배지 (DaeUnSlider·YeonUnSlider 공통 구조) */
export default function GanjiColumn({
  topLabel,
  stem,
  stemElement,
  branch,
  branchElement,
  stemTenGod,
  branchTenGod,
  twelveWun,
  highlight = false,
  badge,
  dim = false,
}: {
  topLabel: string
  stem: string
  stemElement: string
  branch: string
  branchElement: string
  stemTenGod?: string
  branchTenGod?: string
  twelveWun?: string
  highlight?: boolean
  badge?: string
  dim?: boolean
}) {
  const Tile = ({ ch, element }: { ch: string; element: string }) => (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 ${
        highlight ? 'border-orange shadow-[2px_2px_0_#FF6B00]' : 'border-ink'
      }`}
      style={{ background: highlight ? '#FFFFFF' : ohaengColor(element) }}
    >
      <span className="font-serif text-xl font-black leading-none" style={{ color: highlight ? ohaengColor(element) : 'rgba(255,255,255,0.96)' }}>
        {ch}
      </span>
    </div>
  )

  return (
    <div className={`flex shrink-0 flex-col items-center gap-1 ${dim ? 'opacity-50' : ''}`}>
      <span className="text-[11px] font-bold text-text-sub">{topLabel}</span>
      {stemTenGod && <span className="text-[10px] text-text-sub">{stemTenGod}</span>}
      <Tile ch={stem} element={stemElement} />
      <Tile ch={branch} element={branchElement} />
      {branchTenGod && <span className="text-[10px] text-text-sub">{branchTenGod}</span>}
      {twelveWun && <span className="text-[10px] font-semibold" style={{ color: '#D9A400' }}>{twelveWun}</span>}
      {badge && <span className="mt-0.5 rounded-md bg-orange px-1.5 py-0.5 text-[10px] font-extrabold text-white">{badge}</span>}
    </div>
  )
}
