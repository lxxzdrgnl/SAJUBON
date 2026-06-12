'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loadRecentInputs, type RecentBirthInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import BrutalCard from '@/components/ui/BrutalCard'

function toQuery(i: RecentBirthInput): string {
  return new URLSearchParams(
    Object.entries(i).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)]),
  ).toString()
}

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
        <Link key={toQuery(i)} href={`/manse/result?${toQuery(i)}`}>
          <BrutalCard className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 rounded-xl border-2 border-ink bg-yellow" />
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
