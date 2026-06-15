import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import Svg, { Path, Polyline } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
import type { ReportSummary } from '@sajuguri/api-client'
import type { ConsultationHistoryItem } from '@sajuguri/api-client'
import type { CompatibilityReportSummary } from '@sajuguri/api-client'
import type { DailyRecordSummary } from '@sajuguri/api-client'
import { colors, radii } from '@/theme'
import { BrutalShadow } from '@/components/ui/BrutalShadow'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── 인앱 삭제 확인 모달 (웹 DeleteModal 대응) ─────────────────────────────────

function DeleteModal({
  label,
  onConfirm,
  onClose,
}: {
  label: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{ width: '100%', maxWidth: 480 }}
        >
          <View className="rounded-t-3xl border-2 border-ink bg-surface p-6">
            {/* 헤더 */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[15px] font-extrabold text-ink">이 기록을 삭제할까요?</Text>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full border border-ink"
              >
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M4 4l8 8M12 4l-8 8" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            {/* 삭제 대상 레이블 */}
            <View className="mb-6 rounded-xl border border-ink bg-surface px-4 py-3">
              <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>{label}</Text>
            </View>

            {/* 버튼 행 */}
            <View className="flex-row gap-3">
              <BrutalShadow radius={radii.button} style={{ flex: 1 }}>
                <Pressable
                  onPress={onClose}
                  className="flex-1 items-center rounded-xl border-2 border-ink bg-surface py-3"
                >
                  <Text className="text-sm font-extrabold text-ink">취소</Text>
                </Pressable>
              </BrutalShadow>
              <BrutalShadow radius={radii.button} style={{ flex: 1 }}>
                <Pressable
                  onPress={() => { onConfirm(); onClose() }}
                  className="flex-1 items-center rounded-xl border-2 border-ink bg-ink py-3"
                >
                  <Text className="text-sm font-extrabold text-surface">삭제</Text>
                </Pressable>
              </BrutalShadow>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── 휴지통 아이콘 삭제 버튼 (웹 DeleteIconButton 대응) ────────────────────────

function TrashButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="ml-2 items-center justify-center rounded-xl border-2 border-ink bg-surface p-2"
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="3 6 5 6 21 6" />
        <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <Path d="M10 11v6" />
        <Path d="M14 11v6" />
        <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </Svg>
    </Pressable>
  )
}

// ── 타입 배지 (ko.json my.records.tab* 키 하드코드) ──────────────────────────

function TypeBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <View className={`self-start rounded-full border border-ink px-2 py-0.5 ${tone}`}>
      <Text className="text-[10px] font-extrabold">{label}</Text>
    </View>
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
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.doc} bg="#FFF0C2" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="리포트" tone="bg-orange text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {report.profile_name || '이름 없음'} · {formatDate(report.created_at)}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={2}>
              {report.first_headline}
            </Text>
            {report.request_topics && (
              <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>
                {report.request_topics}
              </Text>
            )}
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={report.first_headline}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
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
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.chat} bg="#D6F4F0" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="한줄상담" tone="bg-teal text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {consultation.profile_name || '이름 없음'} · {formatDate(consultation.created_at)}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>
              {consultation.headline}
            </Text>
            <Text className="mt-0.5 text-xs text-text-sub" numberOfLines={1}>
              {consultation.question}
            </Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={consultation.headline}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
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
  // ko.json compatibility.unknownName = "이름 없음"
  const nameA = report.person_a_name || '이름 없음'
  const nameB = report.person_b_name || '이름 없음'
  const names = `${nameA} · ${nameB}`
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.heart} bg="#FFE8E2" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="궁합" tone="bg-sky text-white" />
            <Text className="mt-1 text-xs font-bold text-text-sub">{formatDate(report.created_at)}</Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>{names}</Text>
            <Text className="mt-0.5 text-xs font-bold text-teal-deep">총점 {report.total_score}점</Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={names}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
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
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <BrutalCard intensity="soft">
        <View className="flex-row items-start">
          <CardIcon d={ICON_PATHS.bolt} bg="#FFFDE8" color="#1A1A1A" />
          <View className="ml-3 flex-1">
            <TypeBadge label="일진 기록" tone="bg-yellow text-ink" />
            <Text className="mt-1 text-xs font-bold text-text-sub">
              {record.profile_name || '이름 없음'} · {record.date}
            </Text>
            <Text className="mt-0.5 text-sm font-extrabold text-ink" numberOfLines={1}>
              {record.keyword}
            </Text>
          </View>
          <TrashButton onPress={() => setShowModal(true)} />
        </View>
      </BrutalCard>
      {showModal && (
        <DeleteModal
          label={record.keyword}
          onConfirm={onDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
