import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { pickGreeting } from '@/lib/greetings'
import { listProfiles, type ProfileResponse } from '@sajuguri/api-client'
import FortuneBannerClient from '@/components/fortune/FortuneBannerClient'

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
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko'
  const user = await currentUser()

  // 저장 만세력 — 로그인 시 시트에 보여줄 목록 (비로그인 시 빈 배열)
  let profiles: ProfileResponse[] = []
  if (user) {
    try {
      profiles = await listProfiles(await serverAuthApi())
    } catch {
      profiles = []
    }
  }

  // 대표 만세력 이름 → 없으면 이메일 로컬파트 폴백 — 로그인 시 시간대별 랜덤 인사말 (KST 기준)
  const repProfile = profiles.find((p) => p.is_representative)
  const name = repProfile?.name ?? (user?.email ? user.email.split('@')[0] : null)

  const STEM_BG: Record<string, string> = {
    갑: '#8FD6A8', 을: '#8FD6A8', 병: '#FF9466', 정: '#FF9466',
    무: '#FFD900', 기: '#FFD900', 경: '#D7D9DD', 신: '#D7D9DD',
    임: '#B9C4CC', 계: '#B9C4CC',
  }
  const stemBg = repProfile?.day_stem ? (STEM_BG[repProfile.day_stem] ?? null) : null
  const hourKST = (new Date().getUTCHours() + 9) % 24
  const fortuneSub = name ? pickGreeting(locale, name, hourKST) : t('fortuneSub')

  return (
    <main>
      <header className="mb-4 flex items-center gap-2 text-xl font-black">
        <MascotTinted stemBg={stemBg} width={26} height={26} />
        사주<span className="rounded-md bg-yellow px-1">구리</span>
      </header>
      {/* 운세 배너 → 클릭 시 만세력 선택 시트 (design.md §5.6) */}
      <FortuneBannerClient profiles={profiles} isLoggedIn={!!user}>
        <section className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-[linear-gradient(135deg,var(--yellow),var(--orange))] p-4 shadow-[4px_4px_0_#1A1A1A]">
          {/* 만세력 목록 아바타와 동일 규격 (h-11 rounded-xl, 마스코트 40px) */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
            <MascotTinted stemBg={stemBg} width={40} height={40} />
          </span>
          <div>
            <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
            <p className="text-xs font-semibold text-ink">{fortuneSub}</p>
          </div>
        </section>
      </FortuneBannerClient>

      <h3 className="mb-3 mt-5 text-[15px] font-extrabold">{t('sectionTitle')}</h3>
      <div className="flex flex-col gap-3">
        <Link href="/manse">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.doc} bg="#FFD900" color="var(--ink)" />
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
            <CardIcon d={ICONS.chat} bg="#00C2B8" color="#FFFFFF" />
            <div>
              <p className="text-sm font-extrabold">{t('cards.chat.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.chat.desc')}</p>
            </div>
          </BrutalCard>
        </Link>
        <BrutalCard intensity="soft" className="flex items-center gap-3">
          <CardIcon d={ICONS.bolt} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-text-sub">{t('cards.question.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.question.desc')}</p>
          </div>
        </BrutalCard>
        <BrutalCard intensity="soft" className="flex items-center gap-3 opacity-55">
          <CardIcon d={ICONS.moon} bg="#F5F0E2" color="var(--text-sub)" />
          <div>
            <p className="text-sm font-extrabold text-text-sub">{t('cards.soon.title')}</p>
            <p className="mt-0.5 text-xs text-text-sub">{t('cards.soon.desc')}</p>
          </div>
        </BrutalCard>
      </div>
    </main>
  )
}
