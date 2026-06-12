import Image from 'next/image'
import { useTranslations } from 'next-intl'

export default function Home() {
  const t = useTranslations('home')
  return (
    <main>
      <header className="mb-4 flex items-center gap-2 text-xl font-black">
        <Image src="/mascot.svg" alt="" width={26} height={26} />
        사주<span className="rounded-md bg-yellow px-1">구리</span>
      </header>
      {/* 앰버 배너 — spec §7.5, 그라데이션 금지 */}
      <section className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-amber p-4 shadow-[4px_4px_0_#1A1A1A]">
        <Image src="/mascot.svg" alt="" width={44} height={44} />
        <div>
          <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
          <p className="text-xs font-semibold text-[#5a4a00]">{t('fortuneSub')}</p>
        </div>
      </section>
    </main>
  )
}
