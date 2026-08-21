import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { serverApi } from '@/lib/api'
import type { SajuCalcResponse, ProfileCreateRequest, SajuCalcRequest } from '@sajuguri/api-client'
import { currentUser } from '@/lib/serverAuth'
import SaveButton from '@/components/manse/SaveButton'
import ShareButton from '@/components/manse/ShareButton'
import ResultView from '@/components/manse/ResultView'
import RecentEnricher from '@/components/manse/RecentEnricher'
import { manseNavQuery } from '@/lib/manse/query'

export default async function ManseResult({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const t = await getTranslations('manse.result')
  const tc = await getTranslations('manse.charts.cta')
  const p = await searchParams
  let data: SajuCalcResponse | null = null
  try {
    data = await serverApi.post<SajuCalcResponse>('/api/saju/calc', {
      name: p.name,
      birth_date: p.birth_date,
      birth_time: p.birth_time ?? null,
      gender: p.gender,
      calendar: p.calendar ?? 'solar',
      is_leap_month: p.is_leap_month === 'true',
      ...(p.birth_longitude ? { birth_longitude: Number(p.birth_longitude) } : {}),
      ...(p.birth_utc_offset ? { birth_utc_offset: Number(p.birth_utc_offset) } : {}),
    })
  } catch {
    data = null
  }
  if (!data) return <main className="pt-10 text-center text-sm font-bold text-text-sub">{t('error')}</main>

  // 로그인 상태에서만 저장 버튼 노출. 저장 스키마는 longitude(진태양시)를 쓴다.
  const user = await currentUser()
  const saveInput: ProfileCreateRequest | null =
    user && p.birth_date && p.gender
      ? {
          name: p.name || '이름 없음',
          birth_date: p.birth_date,
          birth_time: p.birth_time ?? null,
          calendar: p.calendar === 'lunar' ? 'lunar' : 'solar',
          gender: p.gender === 'female' ? 'female' : 'male',
          is_leap_month: p.is_leap_month === 'true',
          ...(p.city ? { city: p.city } : {}),
          ...(p.birth_longitude ? { longitude: Number(p.birth_longitude) } : {}),
        }
      : null

  // 공유용 birth_input — 비로그인/프로필 미지정 시 calc_snapshot과 함께 전송.
  const shareBirthInput: SajuCalcRequest | undefined =
    p.birth_date && p.gender
      ? {
          ...(p.name ? { name: p.name } : {}),
          birth_date: p.birth_date,
          birth_time: p.birth_time ?? null,
          gender: p.gender === 'female' ? 'female' : 'male',
          calendar: p.calendar === 'lunar' ? 'lunar' : 'solar',
          is_leap_month: p.is_leap_month === 'true',
          ...(p.birth_longitude ? { birth_longitude: Number(p.birth_longitude) } : {}),
          ...(p.birth_utc_offset ? { birth_utc_offset: Number(p.birth_utc_offset) } : {}),
          ...(p.city ? { city: p.city } : {}),
        }
      : undefined

  // birth 쿼리를 /report/new·/fortune에 전달하기 위한 통합 직렬화 (name/pname 포함)
  const birthQuery = manseNavQuery(p)

  return (
    <main className="flex flex-col gap-3">
      {/* 게스트 최근 입력에 일간 보강 — 너구리 아바타 일간색 틴팅용 (클라 마운트 시 localStorage 갱신) */}
      <RecentEnricher
        birth_date={p.birth_date ?? ''}
        birth_time={p.birth_time ?? null}
        gender={p.gender ?? ''}
        calendar={p.calendar ?? 'solar'}
        day_stem={data.day_pillar.stem}
      />
      <ResultView data={data} />

      {/* CTA */}
      <div className="mt-1 flex gap-2">
        <Link
          href={`/report/new?${birthQuery}`}
          className="flex-1 rounded-lg border-2 border-ink bg-orange py-3 text-center text-sm font-extrabold text-white shadow-brutal"
        >
          {tc('report')}
        </Link>
        <Link
          href="/chat"
          className="flex-1 rounded-lg border-2 border-teal bg-teal-tint py-3 text-center text-sm font-extrabold text-teal-deep shadow-brutal"
        >
          {tc('chat')}
        </Link>
      </div>

      <ShareButton calcSnapshot={data} birthInput={shareBirthInput} />

      {saveInput && <SaveButton input={saveInput} />}
    </main>
  )
}
