import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { maskEmail } from '@/lib/mask'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import LogoutButton from '@/components/my/LogoutButton'
import { listReports, listDailyRecords, listProfiles } from '@sajuguri/api-client'
import type { ReportSummary, DailyRecordSummary, ProfileResponse } from '@sajuguri/api-client'
import { STEM_BG } from '@/lib/manse/ganjiNickname'

// 브라우저가 직접 여는 풀 URL — next.config rewrites를 타지 않도록 백엔드 절대 주소 사용.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

/** 일간에 맞는 Tailwind shadow 색 클래스 (design.md §8 허용 hex 사용) */
function repCardBg(stem: string | null | undefined): string {
  if (!stem) return 'bg-yellow'
  const hex = STEM_BG[stem]
  if (!hex) return 'bg-yellow'
  // Tailwind arbitrary 값 — 모두 design.md §8 허용 hex
  return `bg-[${hex}]`
}

/** 날짜 문자열(YYYY-MM-DD) → 한국식 날짜 표기 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function MyPage() {
  const t = await getTranslations('my')
  const tr = await getTranslations('report')
  const tf = await getTranslations('fortune')
  const user = await currentUser()

  if (!user) {
    return (
      <main>
        <h1 className="mb-4 text-lg font-black">{t('title')}</h1>
        <BrutalCard className="flex flex-col items-center gap-4 py-8 text-center">
          <MascotTinted width={72} height={72} />
          <p className="text-[15px] font-extrabold">{t('loginRequired')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('loginWithGoogle')}
          </a>
        </BrutalCard>
      </main>
    )
  }

  const authApi = await serverAuthApi()

  // 저장 만세력
  let profiles: ProfileResponse[] = []
  try {
    profiles = await listProfiles(authApi)
  } catch {
    profiles = []
  }

  // 대표 만세력
  const repProfile = profiles.find((p) => p.is_representative) ?? null

  // 내 리포트 목록 (백엔드 미완성 시 빈 배열 fallback)
  let reports: ReportSummary[] = []
  try {
    reports = await listReports(authApi)
  } catch {
    reports = []
  }

  // 운세 기록 목록 (백엔드 미완성 시 빈 배열 fallback)
  let fortuneRecords: DailyRecordSummary[] = []
  try {
    fortuneRecords = await listDailyRecords(authApi)
  } catch {
    fortuneRecords = []
  }

  const menu = [
    { key: 'shares', soon: true },
    { key: 'settings', soon: true },
  ] as const

  return (
    <main>
      {/* ── 상단 히어로: 대표 만세력 카드 (이메일 포함) ─── */}
      <section className="mb-6">
        {repProfile ? (
          <div
            className={`rounded-2xl border-2 border-ink p-4 shadow-[4px_4px_0_#1A1A1A] ${repCardBg(repProfile.day_stem)}`}
          >
            <div className="flex items-center gap-3">
              {/* 마스코트 아바타 */}
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-surface">
                <MascotTinted stem={repProfile.day_stem} width={52} height={52} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-black leading-tight">
                  {repProfile.name}
                </p>
                {repProfile.day_stem && repProfile.day_branch && (
                  <p className="mt-0.5 text-[13px] font-extrabold text-ink opacity-75">
                    {repProfile.day_stem}{repProfile.day_branch}일주
                  </p>
                )}
                <p className="mt-1 text-[12px] font-semibold text-ink opacity-60">
                  {t('repCard.born')} {formatDate(repProfile.birth_date)}
                </p>
                <p className="mt-1 text-[11px] text-text-sub">
                  {maskEmail(user.email)}
                </p>
              </div>
              {/* 대표 뱃지 */}
              <span className="shrink-0 rounded-full border-2 border-ink bg-surface px-2 py-0.5 text-[10px] font-extrabold shadow-[2px_2px_0_#1A1A1A]">
                {t('repCard.badge')}
              </span>
            </div>
          </div>
        ) : (
          <BrutalCard intensity="soft" className="flex flex-col items-center gap-3 py-6 text-center">
            <MascotTinted width={56} height={56} />
            <div>
              <p className="text-[14px] font-extrabold text-ink">
                {t('repCard.noProfile')}
              </p>
              <p className="mt-1 text-[12px] text-text-sub">{t('repCard.noProfileDesc')}</p>
            </div>
            <Link
              href="/manse"
              className="rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[13px] font-extrabold shadow-[3px_3px_0_#1A1A1A]"
            >
              {t('repCard.goManse')}
            </Link>
            <p className="text-[11px] text-text-sub">
              {maskEmail(user.email)}
            </p>
          </BrutalCard>
        )}
      </section>

      {/* ── 내 리포트 목록 ─── */}
      <section className="mb-5">
        <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-text-sub">
          {t('menu.reports')}
        </h2>
        {reports.length === 0 ? (
          <BrutalCard intensity="soft" className="flex flex-col gap-2 py-4 text-center">
            <p className="text-[13px] text-text-sub">{tr('list.empty')}</p>
            <Link
              href="/manse"
              className="mx-auto text-[13px] font-extrabold text-orange underline underline-offset-2"
            >
              {tr('list.generate')}
            </Link>
          </BrutalCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map(r => (
              <li key={r.id}>
                <Link href={`/report/${r.id}`}>
                  <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
                    <p className="text-[14px] font-extrabold leading-snug text-ink">
                      {r.first_headline}
                    </p>
                    <p className="text-[12px] text-text-sub">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      {' · '}
                      <span className="font-bold text-teal">{r.profile_name}</span>
                      {r.request_topics && (
                        <span className="ml-1 text-text-sub">· {r.request_topics}</span>
                      )}
                    </p>
                  </BrutalCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 운세 기록 목록 ─── */}
      <section className="mb-5">
        <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-text-sub">
          {tf('my.title')}
        </h2>
        {fortuneRecords.length === 0 ? (
          <BrutalCard intensity="soft" className="flex flex-col gap-2 py-4 text-center">
            <p className="text-[13px] text-text-sub">{tf('my.empty')}</p>
            <Link
              href="/"
              className="mx-auto text-[13px] font-extrabold text-teal underline underline-offset-2"
            >
              {tf('my.goFortune')}
            </Link>
          </BrutalCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {fortuneRecords.map((r) => (
              <li key={r.id}>
                <Link href={`/fortune?record=${r.id}`}>
                  <BrutalCard intensity="soft" className="flex flex-col gap-1 hover:border-border-soft">
                    <p className="text-[14px] font-extrabold leading-snug text-ink">
                      {r.keyword}
                    </p>
                    <p className="text-[12px] text-text-sub">
                      {new Date(r.date).toLocaleDateString('ko-KR')}
                      {' · '}
                      <span className="font-bold text-teal">{r.profile_name}</span>
                    </p>
                  </BrutalCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 기타 메뉴 ─── */}
      <ul className="mb-5 flex flex-col gap-2">
        {menu.map(({ key, soon }) => (
          <li key={key}>
            <BrutalCard
              intensity="soft"
              className="flex items-center justify-between"
            >
              <span className="text-sm font-extrabold text-text-sub">{t(`menu.${key}`)}</span>
              {soon && (
                <span className="rounded-full border-[1.5px] border-border-soft px-2 py-0.5 text-[10px] font-extrabold text-text-sub">
                  {t('soon')}
                </span>
              )}
            </BrutalCard>
          </li>
        ))}
      </ul>

      <LogoutButton />
    </main>
  )
}
