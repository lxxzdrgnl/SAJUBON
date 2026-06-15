import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import {
  deleteReport,
  deleteConsultation,
  deleteCompatibilityReport,
  deleteDailyRecord,
} from '@sajuguri/api-client'
import type {
  ReportSummary,
  ConsultationHistoryItem,
  CompatibilityReportSummary,
  DailyRecordSummary,
} from '@sajuguri/api-client'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { Button } from '@/components/ui/Button'
import { MascotTinted } from '@/components/ui/MascotTinted'
import {
  SajuRecordCard,
  ConsultationRecordCard,
  CompatibilityRecordCard,
  DailyRecordCard,
} from '@/components/records/RecordFeedCard'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReports,
  useConsultations,
  useCompatibilityReports,
  useDailyRecords,
} from '@/lib/queries'
import { colors } from '@/theme'
import Svg, { Path } from 'react-native-svg'

// 필터 타입
type FilterKey = 'all' | 'report' | 'consultation' | 'compatibility' | 'daily'

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'report', label: '리포트' },
  { key: 'consultation', label: '한줄상담' },
  { key: 'daily', label: '일진 기록' },
  { key: 'compatibility', label: '궁합' },
]

type FeedEntry =
  | { type: 'report'; createdAt: string; item: ReportSummary }
  | { type: 'consultation'; createdAt: string; item: ConsultationHistoryItem }
  | { type: 'compatibility'; createdAt: string; item: CompatibilityReportSummary }
  | { type: 'daily'; createdAt: string; item: DailyRecordSummary }

function FilterChip({
  active,
  onPress,
  label,
}: {
  active: boolean
  onPress: () => void
  label: string
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`shrink-0 rounded-xl border-2 border-ink px-3 py-1.5 ${active ? 'bg-yellow' : 'bg-surface'}`}
    >
      <Text className={`text-[13px] font-extrabold ${active ? 'text-ink' : 'text-text-sub'}`}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function HistoryScreen() {
  const { status, api } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')

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

  const visible = useMemo<FeedEntry[]>(() => {
    if (filter === 'all') return feed
    return feed.filter((e) => e.type === filter)
  }, [feed, filter])

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

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 16, backgroundColor: '#FFFBF2' }}>
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      </View>
    )
  }

  if (status !== 'authed') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 16, backgroundColor: '#FFFBF2' }}>
        <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text className="text-sm font-extrabold text-ink">마이로</Text>
        </Pressable>
        <BrutalCard>
          <View className="items-center gap-4 py-6">
            <MascotTinted size={72} />
            <Text className="text-[15px] font-extrabold text-ink">로그인이 필요해요</Text>
            <Button label="구글로 로그인" onPress={() => router.push('/auth/login')} />
          </View>
        </BrutalCard>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFBF2' }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View className="mb-4 flex-row items-center gap-2">
        <Pressable onPress={() => router.back()}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text className="text-lg font-black text-ink">내 기록</Text>
      </View>

      {/* 가로 스크롤 필터 칩 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 pb-1">
          {FILTER_LABELS.map(({ key, label }) => (
            <FilterChip
              key={key}
              active={filter === key}
              onPress={() => setFilter(key)}
              label={label}
            />
          ))}
        </View>
      </ScrollView>

      {/* 피드 */}
      {visible.length === 0 ? (
        <BrutalCard intensity="soft">
          <Text className="py-8 text-center text-sm text-text-sub">아직 기록이 없어요</Text>
        </BrutalCard>
      ) : (
        <View className="gap-2">
          {visible.map((entry) => renderEntry(entry))}
        </View>
      )}
    </ScrollView>
  )
}
