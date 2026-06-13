import { getTranslations } from 'next-intl/server'
import type { ProfileResponse } from '@sajuguri/api-client'
import { Link } from '@/i18n/navigation'
import BrutalCard from '@/components/ui/BrutalCard'
import { toResultQuery, profileToQueryInput } from '@/lib/manse/query'
import MascotTinted from '@/components/ui/MascotTinted'

/** 로그인 유저의 서버 저장 만세력 목록 (대표 뱃지·탭=분석). */
export default async function SavedList({ profiles }: { profiles: ProfileResponse[] }) {
  const t = await getTranslations('manse.saved')
  const tf = await getTranslations('manse.form')

  if (profiles.length === 0)
    return <p className="py-6 text-center text-sm text-text-sub">{t('empty')}</p>

  return (
    <div className="flex flex-col gap-3">
      {profiles.map((p) => (
        <Link key={p.id} href={`/manse/result?${toResultQuery(profileToQueryInput(p))}`}>
          <BrutalCard className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
              <MascotTinted stem={p.day_stem} width={40} height={40} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-extrabold">{p.name}</span>
                {p.is_representative && (
                  <span className="shrink-0 rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 text-[10px] font-extrabold">
                    {t('representative')}
                  </span>
                )}
              </span>
              <span className="block text-xs text-text-sub">
                {p.birth_date} · {p.birth_time ?? tf('timeUnknown')} ·{' '}
                {p.gender === 'male' ? tf('male') : tf('female')}
              </span>
            </span>
          </BrutalCard>
        </Link>
      ))}
    </div>
  )
}
