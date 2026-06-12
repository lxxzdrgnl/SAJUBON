import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import { currentUser } from '@/lib/serverAuth'

const ICONS = {
  doc: 'M5 3 h11 a2 2 0 0 1 2 2 v14 a2 2 0 0 1-2 2 H5 a0 0 0 0 1 0 0 V3 Z M9 8 H15 M9 12 H15 M9 16 H13',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  bolt: 'M13 2 L5 13 H11 L9 22 L19 10 H12 Z',
  moon: 'M20 13 A8 8 0 1 1 11 4 A6.5 6.5 0 0 0 20 13 Z',
} as const

function CardIcon({ d, bg, color }: { d: string; bg: string; color: string }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink"
      style={{ background: bg, color }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  )
}

export default async function Home() {
  const t = await getTranslations('home')
  const user = await currentUser()
  // 이메일 로컬파트(@ 앞)를 표시 이름으로 — 로그인 시에만 배너 서브 문구 개인화
  const name = user?.email ? user.email.split('@')[0] : null
  const fortuneSub = name ? t('fortuneSubAuthed', { name }) : t('fortuneSub')
  return (
    <main>
      <header className="mb-4 flex items-center gap-2 text-xl font-black">
        <Image src="/mascot.svg" alt="" width={26} height={26} />
        사주<span className="rounded-md bg-yellow px-1">구리</span>
      </header>
      {/* 운세 배너 — 그라데이션 예외 (design.md §3). 스토리는 Phase 3 — 아직 미링크 */}
      <section className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-[linear-gradient(135deg,var(--yellow),var(--orange))] p-4 shadow-[4px_4px_0_#1A1A1A]">
        <Image src="/mascot.svg" alt="" width={44} height={44} />
        <div>
          <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
          <p className="text-xs font-semibold text-[#5a4a00]">{fortuneSub}</p>
        </div>
      </section>

      <h3 className="mb-3 mt-5 text-[15px] font-extrabold">{t('sectionTitle')}</h3>
      <div className="flex flex-col gap-3">
        <Link href="/manse">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.doc} bg="var(--yellow-tint)" color="var(--ink)" />
            <div>
              <p className="text-sm font-extrabold">
                {t('cards.report.title')}
                <span className="ml-1 inline-block rounded-full border-[1.5px] border-ink bg-orange px-2 text-[10px] font-extrabold text-white align-[2px]">
                  {t('cards.report.badge')}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.report.desc')}</p>
            </div>
          </BrutalCard>
        </Link>
        <Link href="/chat">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.chat} bg="var(--teal-tint)" color="var(--teal-deep)" />
            <div>
              <p className="text-sm font-extrabold">{t('cards.chat.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.chat.desc')}</p>
            </div>
          </BrutalCard>
        </Link>
        <BrutalCard intensity="soft" className="flex items-center gap-3">
          <CardIcon d={ICONS.bolt} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-[#6a6250]">{t('cards.question.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.question.desc')}</p>
          </div>
        </BrutalCard>
        <BrutalCard intensity="soft" className="flex items-center gap-3 opacity-55">
          <CardIcon d={ICONS.moon} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-[#999]">{t('cards.soon.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.soon.desc')}</p>
          </div>
        </BrutalCard>
      </div>
    </main>
  )
}
