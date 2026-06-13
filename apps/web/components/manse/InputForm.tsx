'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { saveRecentInput } from '@sajuguri/core'
import { webStorage } from '@/lib/storage'
import BirthInputForm, { type ManseBirthInput } from './BirthInputForm'

export default function InputForm() {
  const t = useTranslations('manse.form')
  const router = useRouter()

  async function handleSubmit(input: ManseBirthInput) {
    await saveRecentInput(webStorage, input)
    const qs = new URLSearchParams(
      Object.entries(input)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    )
    router.push(`/manse/result?${qs.toString()}`)
  }

  return <BirthInputForm onSubmit={handleSubmit} submitLabel={t('submit')} />
}
