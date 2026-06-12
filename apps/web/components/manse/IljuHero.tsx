import { getLocale, getTranslations } from 'next-intl/server'
import type { Pillar } from '@sajuguri/api-client'
import { ganjiNickname } from '@/lib/manse/ganjiNickname'

/** 일주 히어로 — 일간(천간) 오행색 배경 + 띠 닉네임 문구(예: "회색 쥐") */
export default async function IljuHero({ dayPillar, label }: { dayPillar: Pillar; label: string }) {
  const locale = await getLocale()
  const t = await getTranslations('manse.result')
  const nick = ganjiNickname(dayPillar.stem, dayPillar.branch)
  const nickname = locale === 'en' ? nick.en : nick.ko

  return (
    <section
      className="rounded-2xl border-2 border-ink p-4 text-center shadow-[4px_4px_0_#1A1A1A]"
      style={{ background: nick.bg }}
    >
      <p className="text-[11px] font-extrabold text-ink/60">{label}</p>
      <p className="font-serif text-[42px] font-black leading-tight">
        {dayPillar.stem_hanja}{dayPillar.branch_hanja}
      </p>
      <p className="text-[15px] font-black">{t('iljuName', { name: dayPillar.ganji_name })}</p>
      {nickname && (
        <p className="mt-0.5 inline-block rounded-full border-[1.5px] border-ink bg-surface/70 px-2.5 py-0.5 text-[12px] font-extrabold">
          {nickname}
        </p>
      )}
    </section>
  )
}
