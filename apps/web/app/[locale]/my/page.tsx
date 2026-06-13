import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { maskEmail } from '@/lib/mask'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import LogoutButton from '@/components/my/LogoutButton'
import MyRecordsClient from '@/components/my/MyRecordsClient'
import LanguageToggleInline from '@/components/my/LanguageToggleInline'
import { listProfiles } from '@sajuguri/api-client'
import type { ProfileResponse } from '@sajuguri/api-client'
import { fetchAllRecords } from '@/lib/records/registry'
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

  // 내 기록 — 레코드 레지스트리로 모든 종류 병렬 fetch (개별 실패는 빈 배열)
  const records = await fetchAllRecords(authApi)

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
              {/* 대표 뱃지 — 주황 */}
              <span className="shrink-0 rounded-full border-2 border-ink bg-orange px-2 py-0.5 text-[10px] font-extrabold text-white shadow-[2px_2px_0_#1A1A1A]">
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

      {/* ── 내 기록: 리포트 / 운세 탭 + 더보기 + 삭제 ─── */}
      <MyRecordsClient records={records} repProfileName={repProfile?.name ?? null} />

      {/* ── 언어 설정 (인라인) ─── */}
      <LanguageToggleInline />

      <LogoutButton />
    </main>
  )
}
