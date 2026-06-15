import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { pickGreeting } from '@/lib/greetings'
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

// 일간(오행) 색에 맞춘 운세 배너 그라데이션 — 마스코트 색과 어우러지게.
const DEFAULT_BANNER = 'linear-gradient(135deg,var(--yellow),var(--orange))'
const STEM_BANNER: Record<string, string> = {
  갑: 'linear-gradient(135deg,#9FD8D0,#5BB3A8)', 을: 'linear-gradient(135deg,#9FD8D0,#5BB3A8)', // 목
  병: 'linear-gradient(135deg,#F4845F,#D9512E)', 정: 'linear-gradient(135deg,#F4845F,#D9512E)', // 화
  무: 'linear-gradient(135deg,var(--yellow),var(--orange))', 기: 'linear-gradient(135deg,var(--yellow),var(--orange))', // 토
  경: 'linear-gradient(135deg,#F2F4F6,#C7CDD4)', 신: 'linear-gradient(135deg,#F2F4F6,#C7CDD4)', // 금
  임: 'linear-gradient(135deg,#AEB6C4,#5E6B80)', 계: 'linear-gradient(135deg,#AEB6C4,#5E6B80)', // 수 — 슬레이트 블루그레이(무채색 탈피)
}
function bannerGradient(stem?: string | null): string {
  return (stem && STEM_BANNER[stem]) || DEFAULT_BANNER
}

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

  // 대표 만세력 이름 → 없으면 구글 닉네임 → 마지막으로 이메일 로컬파트 폴백 (KST 기준 인사말)
  const repProfile = profiles.find((p) => p.is_representative)
  const name = repProfile?.name ?? user?.name ?? (user?.email ? user.email.split('@')[0] : null)

  const repStem = repProfile?.day_stem ?? null
  const hourKST = (new Date().getUTCHours() + 9) % 24
  const fortuneSub = name ? pickGreeting(locale, name, hourKST) : t('fortuneSub')

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
          className="flex items-center gap-3 rounded-[18px] border-2 border-ink p-4 shadow-[4px_4px_0_#1A1A1A]"
          style={{ background: bannerGradient(repStem) }}
        >
          {/* 만세력 목록 아바타와 동일 규격 (h-11 rounded-xl, 마스코트 40px) */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
            <MascotTinted stem={repStem} width={40} height={40} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">{t('fortuneBanner')}</h2>
            <p className="text-xs font-semibold text-ink">{fortuneSub}</p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-ink opacity-60"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
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

        {/* 정밀 분석 소제목 */}
        <h4 className="mt-2 text-[13px] font-extrabold text-text-sub">{t('reportSectionTitle')}</h4>

        {/* 내 사주 리포트 · 궁합 리포트 — 2열 그리드 (세로형 카드) */}
        <div className="grid grid-cols-2 gap-3">
          {/* 사주 풀리포트 — 프로필 선택 시트 → /report/new */}
          <ReportEntryButton profiles={profiles} isLoggedIn={!!user}>
            <BrutalCard className="flex h-full flex-col gap-2">
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
            <BrutalCard className="flex h-full flex-col gap-2">
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
