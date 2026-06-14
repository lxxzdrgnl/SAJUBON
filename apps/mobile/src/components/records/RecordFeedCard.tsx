import { Alert, Pressable, Text, View } from 'react-native'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import type { ReportSummary } from '@sajuguri/api-client'
import type { ConsultationHistoryItem } from '@sajuguri/api-client'
import type { CompatibilityReportSummary } from '@sajuguri/api-client'
import type { DailyRecordSummary } from '@sajuguri/api-client'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── 삭제 버튼 ─────────────────────────────────────────────────────────────────

function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="ml-2 items-center justify-center rounded-lg border-2 border-ink bg-orange-tint px-2 py-1"
    >
      <Text className="text-xs font-extrabold text-orange">삭제</Text>
    </Pressable>
  )
}

// ── 사주 리포트 카드 ──────────────────────────────────────────────────────────

export function SajuRecordCard({
  report,
  onDelete,
}: {
  report: ReportSummary
  onDelete: () => void
}) {
  function handleDelete() {
    Alert.alert(
      '리포트 삭제',
      `"${report.first_headline}" 리포트를 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <BrutalCard intensity="soft">
      <View className="flex-row items-start">
        <CardIcon d={ICON_PATHS.doc} bg="#FFF0C2" color="#1A1A1A" />
        <View className="ml-3 flex-1">
          <Text className="text-xs font-bold text-text-sub">{report.profile_name} · {formatDate(report.created_at)}</Text>
          <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={2}>{report.first_headline}</Text>
          {report.request_topics && (
            <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>{report.request_topics}</Text>
          )}
        </View>
        <DeleteButton onPress={handleDelete} />
      </View>
    </BrutalCard>
  )
}

// ── 한줄 상담 카드 ────────────────────────────────────────────────────────────

export function ConsultationRecordCard({
  consultation,
  onDelete,
}: {
  consultation: ConsultationHistoryItem
  onDelete: () => void
}) {
  function handleDelete() {
    Alert.alert(
      '상담 삭제',
      `"${consultation.headline}" 상담을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <BrutalCard intensity="soft">
      <View className="flex-row items-start">
        <CardIcon d={ICON_PATHS.chat} bg="#D6F4F0" color="#1A1A1A" />
        <View className="ml-3 flex-1">
          <Text className="text-xs font-bold text-text-sub">{consultation.profile_name} · {formatDate(consultation.created_at)}</Text>
          <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>{consultation.headline}</Text>
          <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>{consultation.question}</Text>
        </View>
        <DeleteButton onPress={handleDelete} />
      </View>
    </BrutalCard>
  )
}

// ── 궁합 리포트 카드 ──────────────────────────────────────────────────────────

export function CompatibilityRecordCard({
  report,
  onDelete,
}: {
  report: CompatibilityReportSummary
  onDelete: () => void
}) {
  const names = [report.person_a_name, report.person_b_name].filter(Boolean).join(' ❤ ') || '두 사람'

  function handleDelete() {
    Alert.alert(
      '궁합 삭제',
      `"${names}" 궁합을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <BrutalCard intensity="soft">
      <View className="flex-row items-start">
        <CardIcon d={ICON_PATHS.heart} bg="#FFE8E2" color="#1A1A1A" />
        <View className="ml-3 flex-1">
          <Text className="text-xs font-bold text-text-sub">{formatDate(report.created_at)}</Text>
          <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>{names}</Text>
          <Text className="mt-0.5 text-xs font-bold text-teal-deep">총점 {report.total_score}점</Text>
        </View>
        <DeleteButton onPress={handleDelete} />
      </View>
    </BrutalCard>
  )
}

// ── 일진 기록 카드 ────────────────────────────────────────────────────────────

export function DailyRecordCard({
  record,
  onDelete,
}: {
  record: DailyRecordSummary
  onDelete: () => void
}) {
  function handleDelete() {
    Alert.alert(
      '일진 기록 삭제',
      `${record.date} 일진 기록을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <BrutalCard intensity="soft">
      <View className="flex-row items-start">
        <CardIcon d={ICON_PATHS.bolt} bg="#FFFDE8" color="#1A1A1A" />
        <View className="ml-3 flex-1">
          <Text className="text-xs font-bold text-text-sub">{record.profile_name} · {record.date}</Text>
          <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>{record.keyword}</Text>
        </View>
        <DeleteButton onPress={handleDelete} />
      </View>
    </BrutalCard>
  )
}
