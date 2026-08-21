import { getLocale, getTranslations } from 'next-intl/server'
import type { Pillar } from '@sajuguri/api-client'
import { ganjiNickname } from '@/lib/manse/ganjiNickname'
import MascotTinted from '@/components/ui/MascotTinted'

/** 일주 히어로 — 일간(천간) 오행색 배경 + 띠 닉네임 문구(예: "회색 쥐") + 틴팅 너구리 */
export default async function IljuHero({ dayPillar, label }: { dayPillar: Pillar; label: string }) {
  const locale = await getLocale()
  const t = await getTranslations('manse.result')
  const nick = ganjiNickname(dayPillar.stem, dayPillar.branch)
  const nickname = locale === 'en' ? nick.en : nick.ko

  return (
    <section
      className="rounded-lg border-2 border-ink p-4 shadow-brutal"
      style={{ background: nick.bg }}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start gap-0.5">
          <p className="text-[11px] font-extrabold text-ink/60">{label}</p>
          <p className="font-serif text-[42px] font-black leading-tight">
            {dayPillar.stem_hanja}{dayPillar.branch_hanja}
          </p>
          <p className="text-[15px] font-black">{t('iljuName', { name: dayPillar.ganji_name })}</p>
          {nickname && (
            <span className="mt-0.5 inline-block rounded-full border-[1.5px] border-ink bg-surface/70 px-2.5 py-0.5 text-[12px] font-extrabold">
              {nickname}
            </span>
          )}
        </div>
        <div className="ml-3 flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-surface/70 shadow-brutal-lg">
          <MascotTinted stem={dayPillar.stem} width={64} height={64} />
        </div>
      </div>
    </section>
  )
}
