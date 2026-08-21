import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  deleteReport,
  deleteConsultation,
  deleteCompatibilityReport,
  deleteDailyRecord,
} from '@sajuguri/api-client'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { MascotTinted } from '@/components/ui/MascotTinted'
import {
  SajuRecordCard,
  ConsultationRecordCard,
  CompatibilityRecordCard,
  DailyRecordCard,
} from '@/components/records/RecordFeedCard'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useProfiles,
  useReports,
  useConsultations,
  useCompatibilityReports,
  useDailyRecords,
} from '@/lib/queries'
import { STEM_BG } from '@/lib/ganji'
import { radii } from '@/theme'
import type {
  ReportSummary,
  ConsultationHistoryItem,
  CompatibilityReportSummary,
  DailyRecordSummary,
} from '@sajuguri/api-client'

// 이메일 마스킹 — 첫 글자 + ***@도메인
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain || !local) return email
  return `${local[0] ?? ''}***@${domain}`
}

// 일간 줄기 배경색 — ganji.ts STEM_BG 기반 (없으면 yellow)
function stemCardBg(stem: string | null | undefined): string {
  return (stem && STEM_BG[stem]) || '#FFD900'
}

// ── 대표 프로필 히어로 카드 ───────────────────────────────────────────────────

function RepHeroCard({ email }: { email: string }) {
  const { data: profiles = [], isLoading } = useProfiles()
  const router = useRouter()
  const rep = profiles.find((p) => p.is_representative) ?? profiles[0] ?? null

  if (isLoading) {
    return (
      <BrutalCard intensity="soft">
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      </BrutalCard>
    )
  }

  if (!rep) {
    return (
      <BrutalCard intensity="soft">
        <View className="items-center gap-3 py-4">
          <MascotTinted size={56} />
          <View className="items-center">
            <Text className="text-[14px] font-extrabold text-ink">대표 만세력이 없습니다</Text>
            <Text className="mt-1 text-[12px] text-text-sub">만세력 탭에서 대표로 지정할 수 있어요</Text>
          </View>
          <Pressable onPress={() => router.push('/manse')} className="rounded-xl border-2 border-ink bg-yellow px-4 py-2">
            <Text className="text-[13px] font-extrabold text-ink">만세력 목록 보기</Text>
          </Pressable>
          <Text className="text-[11px] text-text-sub">{maskEmail(email)}</Text>
        </View>
      </BrutalCard>
    )
  }

  const bg = stemCardBg(rep.day_stem)
  const iljuStr = rep.day_stem && rep.day_branch ? `${rep.day_stem}${rep.day_branch}일주` : null

  return (
    <BrutalShadow radius={radii.card}>
      <View
        className="rounded-2xl border-2 border-ink p-4"
        style={{ backgroundColor: bg }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-surface">
            <MascotTinted stem={rep.day_stem} size={72} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[18px] font-black leading-tight text-ink">{rep.name || '이름 없음'}</Text>
            {iljuStr && (
              <Text className="mt-0.5 font-serif text-[13px] font-extrabold text-ink" style={{ opacity: 0.75 }}>
                {iljuStr}
              </Text>
            )}
            <Text className="mt-1 text-[12px] font-semibold text-ink" style={{ opacity: 0.6 }}>
              생년월일 {rep.birth_date}
            </Text>
            <Text className="mt-1 text-[11px] text-text-sub">{maskEmail(email)}</Text>
          </View>
          <View className="shrink-0 self-start rounded-full border-2 border-ink bg-orange px-3 py-1">
            <Text className="text-[12px] font-extrabold text-white">대표</Text>
          </View>
        </View>
      </View>
    </BrutalShadow>
  )
}

// ── 기록 피드 아이템 타입 ────────────────────────────────────────────────────

type FeedEntry =
  | { type: 'report'; createdAt: string; item: ReportSummary }
  | { type: 'consultation'; createdAt: string; item: ConsultationHistoryItem }
  | { type: 'compatibility'; createdAt: string; item: CompatibilityReportSummary }
  | { type: 'daily'; createdAt: string; item: DailyRecordSummary }

// ── 병합 기록 섹션 ────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 4

function RecordsSectionAuthed() {
  const { api } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: reports = [] } = useReports()
  const { data: consultations = [] } = useConsultations()
  const { data: compatibilityReports = [] } = useCompatibilityReports()
  const { data: dailyRecords = [] } = useDailyRecords()

  const feed = useMemo<FeedEntry[]>(() => {
    const entries: FeedEntry[] = [
      ...reports.map((r) => ({ type: 'report' as const, createdAt: r.created_at, item: r })),
      ...consultations.map((c) => ({ type: 'consultation' as const, createdAt: c.created_at, item: c })),
      ...compatibilityReports.map((r) => ({ type: 'compatibility' as const, createdAt: r.created_at, item: r })),
      ...dailyRecords.map((d) => ({ type: 'daily' as const, createdAt: d.date, item: d })),
    ]
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return entries
  }, [reports, consultations, compatibilityReports, dailyRecords])

  const preview = feed.slice(0, PREVIEW_COUNT)
  const hasMore = feed.length > PREVIEW_COUNT

  function renderEntry(entry: FeedEntry) {
    if (entry.type === 'report') {
      return (
        <SajuRecordCard
          key={`report-${entry.item.id}`}
          report={entry.item}
          onDelete={async () => {
            await deleteReport(api, entry.item.id)
            await queryClient.invalidateQueries({ queryKey: ['reports'] })
          }}
        />
      )
    }
    if (entry.type === 'consultation') {
      return (
        <ConsultationRecordCard
          key={`consultation-${entry.item.id}`}
          consultation={entry.item}
          onDelete={async () => {
            await deleteConsultation(api, entry.item.id)
            await queryClient.invalidateQueries({ queryKey: ['consultations'] })
          }}
        />
      )
    }
    if (entry.type === 'compatibility') {
      return (
        <CompatibilityRecordCard
          key={`compatibility-${entry.item.id}`}
          report={entry.item}
          onDelete={async () => {
            await deleteCompatibilityReport(api, entry.item.id)
            await queryClient.invalidateQueries({ queryKey: ['compatibility'] })
          }}
        />
      )
    }
    if (entry.type === 'daily') {
      return (
        <DailyRecordCard
          key={`daily-${entry.item.id}`}
          record={entry.item}
          onDelete={async () => {
            await deleteDailyRecord(api, entry.item.id)
            await queryClient.invalidateQueries({ queryKey: ['daily'] })
          }}
        />
      )
    }
    return null
  }

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-extrabold uppercase tracking-wide text-ink">내 기록</Text>

      {feed.length === 0 ? (
        <BrutalCard intensity="soft">
          <Text className="text-sm text-text-sub">아직 기록이 없어요</Text>
        </BrutalCard>
      ) : (
        <View className="gap-2">
          {preview.map((entry) => renderEntry(entry))}

          {hasMore && (
            <Pressable
              onPress={() => router.push('/my/history')}
              className="mt-1 items-center rounded-xl border-2 border-teal bg-surface py-3"
            >
              <Text className="text-[13px] font-extrabold text-teal-deep">전체 기록 보기 →</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function MyScreen() {
  const { status, user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      <Text className="mb-4 mt-2 text-[22px] font-black text-ink">마이</Text>

      {status === 'loading' ? (
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      ) : status === 'authed' && user ? (
        <View className="gap-6">
          <RepHeroCard email={user.email} />
          <RecordsSectionAuthed />
          <Button label="로그아웃" variant="ghost" onPress={logout} />
        </View>
      ) : (
        <BrutalCard>
          <View className="items-center gap-4 py-6">
            <MascotTinted size={72} />
            <Text className="text-[15px] font-extrabold text-ink">로그인이 필요해요</Text>
            <Button
              label="구글로 로그인"
              variant="primary"
              onPress={() => router.push('/auth/login')}
            />
          </View>
        </BrutalCard>
      )}
    </Screen>
  )
}
