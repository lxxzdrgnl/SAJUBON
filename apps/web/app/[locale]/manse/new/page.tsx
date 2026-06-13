import { useTranslations } from 'next-intl'
import InputForm from '@/components/manse/InputForm'

export default function NewManse() {
  const t = useTranslations('manse.form')
  return (
    <main>
      <p className="mb-4 text-center text-sm font-semibold text-text-sub">{t('title')}</p>
      <InputForm />
    </main>
  )
}
