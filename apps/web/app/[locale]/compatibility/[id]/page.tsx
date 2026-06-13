import { getTranslations } from 'next-intl/server'
import { serverAuthApi } from '@/lib/serverAuth'
import { getCompatibilityReport } from '@sajuguri/api-client'
import CompatibilityView from '@/components/compatibility/CompatibilityView'

export default async function CompatibilityDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const t = await getTranslations('compatibility')

  let detail = null
  try {
    const api = await serverAuthApi()
    detail = await getCompatibilityReport(api, Number(id))
  } catch {
    detail = null
  }

  if (!detail) {
    return (
      <main className="pt-16 text-center">
        <p className="text-[15px] font-extrabold text-text-sub">{t('view.errorFallback')}</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <p className="text-[13px] text-text-sub">{t('view.guideText')}</p>
      <CompatibilityView detail={detail} />
    </main>
  )
}
