'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loadRecentInputs, type RecentBirthInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import { toResultQuery } from '@/lib/manse/query'

export default function RecentList() {
  const t = useTranslations('manse.index')
  const tf = useTranslations('manse.form')
  const [items, setItems] = useState<RecentBirthInput[] | null>(null)
  useEffect(() => { loadRecentInputs(webStorage).then(setItems) }, [])
  if (items === null) return null
  if (items.length === 0)
    return <p className="py-6 text-center text-sm text-text-sub">{t('empty')}</p>
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <Link key={toResultQuery(i)} href={`/manse/result?${toResultQuery(i)}`}>
          <BrutalCard className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface overflow-hidden">
              <MascotTinted stem={i.day_stem} width={40} height={40} />
            </span>
            <span>
              <span className="block text-[15px] font-extrabold">{i.name}</span>
              <span className="block text-xs text-text-sub">
                {i.birth_date} · {i.birth_time ?? tf('timeUnknown')} · {i.gender === 'male' ? tf('male') : tf('female')}
              </span>
            </span>
          </BrutalCard>
        </Link>
      ))}
    </div>
  )
}
