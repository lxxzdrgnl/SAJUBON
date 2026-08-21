import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { pickGreeting, pickGuestGreeting } from '@/lib/greetings'
import { listProfiles, type ProfileResponse } from '@sajuguri/api-client'
import FortuneBannerClient from '@/components/fortune/FortuneBannerClient'
import ReportEntryButton from '@/components/report/ReportEntryButton'
import ManseEntryButton from '@/components/manse/ManseEntryButton'
import LanguageToggleCompact from '@/components/LanguageToggleCompact'

const ICONS = {
  doc: 'M5 3 h11 a2 2 0 0 1 2 2 v14 a2 2 0 0 1-2 2 H5 a0 0 0 0 1 0 0 V3 Z M9 8 H15 M9 12 H15 M9 16 H13',
  chat: 'M4 6 a3 3 0 0 1 3-3 h10 a3 3 0 0 1 3 3 v7 a3 3 0 0 1-3 3 H10 l-4.5 4 v-4 H7 a3 3 0 0 1-3-3 Z',
  bolt: 'M13 2 L5 13 H11 L9 22 L19 10 H12 Z',
  moon: 'M20 13 A8 8 0 1 1 11 4 A6.5 6.5 0 0 0 20 13 Z',
  heart: 'M12 20 C12 20 4 13.5 4 8.5 A4 4 0 0 1 12 6 A4 4 0 0 1 20 8.5 C20 13.5 12 20 12 20 Z',
  manse: 'M4 5 h16 M4 9 h16 M4 13 h10 M4 17 h10',
} as const

// 일간(오행) 색에 맞춘 운세 배너 그라데이션 — Y2K 크롬(금속 다단).
// 이전엔 2-stop 무광이라 화면에서 가장 큰 요소가 가장 칙칙했다. 특히 수(水)는
// 슬레이트 그레이라 죽어 보였는데, Y2K에서 수는 리퀴드 크롬/아쿠아가 제자리다.
// 다단 stop이 밝음-어두움을 번갈아 만들어 금속 반사처럼 읽힌다.
const DEFAULT_BANNER = 'var(--chrome-default)'
const STEM_BANNER: Record<string, string> = {
  갑: 'var(--chrome-mok)',  을: 'var(--chrome-mok)',
  병: 'var(--chrome-hwa)',  정: 'var(--chrome-hwa)',
  무: 'var(--chrome-to)',   기: 'var(--chrome-to)',
  경: 'var(--chrome-geum)', 신: 'var(--chrome-geum)',
  임: 'var(--chrome-su)',   계: 'var(--chrome-su)',
}
function bannerGradient(stem?: string | null): string {
  return (stem && STEM_BANNER[stem]) || DEFAULT_BANNER
}

function CardIcon({ d, bg, color }: { d: string; bg: string; color: string }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-ink shadow-gloss"
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

  // 대표 만세력 이름 → 없으면 구글 닉네임 → 마지막으로 이메일 로컬파트 폴백 (KST 기준 인사말)
  const repProfile = profiles.find((p) => p.is_representative)
  const name = repProfile?.name ?? user?.name ?? (user?.email ? user.email.split('@')[0] : null)

  const repStem = repProfile?.day_stem ?? null
  const hourKST = (new Date().getUTCHours() + 9) % 24
  const fortuneSub = name ? pickGreeting(locale, name, hourKST) : pickGuestGreeting(locale, hourKST)

  return (
    <main>
      <header className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xl font-black">
          <MascotTinted stem={repStem} width={26} height={26} />
          {locale === 'en' ? (
            <>Saju<span className="rounded-md bg-yellow px-1">Guri</span></>
          ) : (
            <>사주<span className="rounded-md bg-yellow px-1">구리</span></>
          )}
        </span>
        <LanguageToggleCompact />
      </header>
      {/* 운세 배너 → 클릭 시 만세력 선택 시트 (design.md §5.6) */}
      <FortuneBannerClient profiles={profiles} isLoggedIn={!!user}>
        <section
          className="relative flex min-h-[132px] items-center gap-3 overflow-hidden rounded-lg border-2 border-ink p-5 shadow-brutal"
          style={{ background: bannerGradient(repStem) }}
        >
          {/* 스펙큘러 밴드 — 금속 반사. 이게 없으면 그냥 색 그라데이션으로 읽힌다. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
            style={{ background: 'var(--specular)' }}
          />
          {/* 스캔 그리드 — Y2K 디지털 질감 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] opacity-15"
            style={{
              background:
                'repeating-linear-gradient(0deg,var(--ink) 0 1px,transparent 1px 4px)',
            }}
          />
          <div className="relative z-10 min-w-0 flex-1 pr-28">
            <h2
              className="text-xl font-black leading-tight"
              style={{ textShadow: '0 1px 0 rgba(255,255,255,.65)' }}
            >
              {t('fortuneBannerCta')}
            </h2>
            <p className="mt-1.5 text-xs font-semibold text-ink">{fortuneSub}</p>
          </div>
          {/* 구슬 마스코트 — 우측 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/fortune.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1 right-0 z-0 h-32 w-32 object-contain"
          />
        </section>
      </FortuneBannerClient>

      <h3 className="mb-3 mt-5 text-[15px] font-extrabold">{t('sectionTitle')}</h3>
      <div className="flex flex-col gap-3">
        {/* 만세력 보기 — 전체폭. 만세력 선택 시트 → /manse/result */}
        <ManseEntryButton profiles={profiles} isLoggedIn={!!user}>
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.manse} bg="#7BD3C8" color="var(--ink)" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{t('cards.manse.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.manse.desc')}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink opacity-60" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </BrutalCard>
        </ManseEntryButton>

        {/* 내 사주 리포트 · 궁합 리포트 — 2열 그리드. 아이콘 자리에 마스코트. */}
        <div className="grid grid-cols-2 gap-3">
          {/* 사주 풀리포트 — 프로필 선택 시트 → /report/new */}
          <ReportEntryButton profiles={profiles} isLoggedIn={!!user}>
            <BrutalCard className="flex h-full min-h-[120px] flex-col gap-2">
              <CardIcon d={ICONS.doc} bg="#FFD900" color="var(--ink)" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">
                  {t('cards.report.title')}
                  <span className="ml-1 inline-block rounded-full border-[1.5px] border-ink bg-orange px-2 text-[10px] font-extrabold text-white align-[2px]">
                    {t('cards.report.badge')}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-text-sub">{t('cards.report.desc')}</p>
              </div>
            </BrutalCard>
          </ReportEntryButton>

          {/* 궁합 리포트 — /compatibility/new */}
          <Link href="/compatibility/new" className="h-full">
            <BrutalCard className="flex h-full min-h-[120px] flex-col gap-2">
              <CardIcon d={ICONS.heart} bg="#4DA8E8" color="#FFFFFF" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{t('cards.compatibility.title')}</p>
                <p className="mt-0.5 text-xs text-text-sub">{t('cards.compatibility.desc')}</p>
              </div>
            </BrutalCard>
          </Link>
        </div>

        {/* AI 사주 상담 — 전체폭 */}
        <Link href="/chat">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.chat} bg="#00C2B8" color="#FFFFFF" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{t('cards.chat.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.chat.desc')}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink opacity-60" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </BrutalCard>
        </Link>

        {/* 한 번 물어보기 — 전체폭 → /question */}
        <Link href="/question">
          <BrutalCard className="flex items-center gap-3">
            <CardIcon d={ICONS.bolt} bg="#FFB200" color="#FFFFFF" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{t('cards.question.title')}</p>
              <p className="mt-0.5 text-xs text-text-sub">{t('cards.question.desc')}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink opacity-60" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </BrutalCard>
        </Link>
      </div>
    </main>
  )
}
