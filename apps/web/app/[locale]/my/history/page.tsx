import { getTranslations } from 'next-intl/server'
import { currentUser, serverAuthApi } from '@/lib/serverAuth'
import { listReports, listDailyRecords, listProfiles, listConsultations } from '@sajuguri/api-client'
import type { ReportSummary, DailyRecordSummary, ConsultationHistoryItem } from '@sajuguri/api-client'
import BrutalCard from '@/components/ui/BrutalCard'
import MascotTinted from '@/components/ui/MascotTinted'
import MyRecordsClient from '@/components/my/MyRecordsClient'
import BackButton from '@/components/my/BackButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_LOGIN_URL = `${API_URL}/api/auth/google?client=web`

export default async function HistoryPage() {
  const t = await getTranslations('my')
  const user = await currentUser()

  if (!user) {
    return (
      <main>
        <div className="mb-4 flex items-center gap-2">
          <BackButton fallback="/my" label={t('history.back')} />
          <h1 className="text-lg font-black">{t('history.title')}</h1>
        </div>
        <BrutalCard className="flex flex-col items-center gap-4 py-8 text-center">
          <MascotTinted width={72} height={72} />
          <p className="text-[15px] font-extrabold">{t('history.loginRequired')}</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="w-full rounded-xl border-2 border-ink bg-yellow py-3 text-sm font-extrabold shadow-[4px_4px_0_#1A1A1A]"
          >
            {t('history.loginWithGoogle')}
          </a>
        </BrutalCard>
      </main>
    )
  }

  const authApi = await serverAuthApi()

  let profiles = await listProfiles(authApi).catch(() => [])
  const repProfile = profiles.find((p) => p.is_representative) ?? null

  let reports: ReportSummary[] = []
  try {
    reports = await listReports(authApi)
  } catch {
    reports = []
  }

  let fortuneRecords: DailyRecordSummary[] = []
  try {
    fortuneRecords = await listDailyRecords(authApi)
  } catch {
    fortuneRecords = []
  }

  let consultations: ConsultationHistoryItem[] = []
  try {
    consultations = await listConsultations(authApi)
  } catch {
    consultations = []
  }

  return (
    <main>
      <div className="mb-4 flex items-center gap-2">
        <BackButton fallback="/my" label={t('history.back')} />
        <h1 className="text-lg font-black">{t('history.title')}</h1>
      </div>

      <MyRecordsClient
        reports={reports}
        fortuneRecords={fortuneRecords}
        consultations={consultations}
        repProfileName={repProfile?.name ?? null}
        limit={undefined}
      />
    </main>
  )
}
