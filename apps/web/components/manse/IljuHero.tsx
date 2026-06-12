import type { Pillar } from '@sajuguri/api-client'

/** 일주 히어로 — 캐릭터 카피는 데이터 작업(ilju.json 필드) 완료 후 추가 */
export default function IljuHero({ dayPillar, label }: { dayPillar: Pillar; label: string }) {
  return (
    <section className="rounded-2xl border-2 border-ink bg-yellow p-4 text-center shadow-[4px_4px_0_#1A1A1A]">
      <p className="text-[11px] font-extrabold text-[#6b5500]">{label}</p>
      <p className="font-serif text-[42px] font-black leading-tight">
        {dayPillar.stem_hanja}{dayPillar.branch_hanja}
      </p>
      <p className="text-[15px] font-black">{dayPillar.ganji_name}일주</p>
    </section>
  )
}
