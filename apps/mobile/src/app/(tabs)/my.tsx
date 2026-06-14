import { Text, View } from 'react-native'
import { Pressable } from 'react-native'
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
import { Chip } from '@/components/ui/Chip'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { CardIcon, ICON_PATHS } from '@/components/ui/CardIcon'
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

// 내 만세력 섹션 — 대표 프로필 카드 + 프로필 관리 진입
function ManseSectionAuthed() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()
  const representative = profiles.find((p) => p.is_representative) ?? profiles[0]

  if (isLoading) {
    return (
      <View className="gap-2">
        <Text className="text-sm font-extrabold text-ink">내 만세력</Text>
        <Text className="text-xs text-text-sub">불러오는 중…</Text>
      </View>
    )
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-ink">내 만세력</Text>
        <Pressable onPress={() => router.push('/my/profiles')}>
          <Text className="text-xs font-bold text-teal-deep">전체 보기 →</Text>
        </Pressable>
      </View>

      {representative ? (
        <Pressable onPress={() => router.push('/my/profiles')}>
          <BrutalCard>
            <View className="flex-row items-center gap-3">
              <MascotTinted stem={representative.day_stem} size={52} />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-extrabold text-ink">{representative.name || '이름 없음'}</Text>
                  {representative.is_representative && (
                    <Chip label="대표" variant="yellow" />
                  )}
                </View>
                <Text className="mt-0.5 text-xs text-text-sub">
                  {representative.birth_date}
                  {representative.birth_time ? ` ${representative.birth_time}` : ' (시간 모름)'}
                  {' · '}
                  {representative.gender === 'male' ? '남성' : '여성'}
                </Text>
                {representative.day_stem && (
                  <Text className="mt-0.5 font-serif text-xs text-text-sub">
                    일간 {representative.day_stem}
                    {representative.day_branch ? representative.day_branch : ''}
                  </Text>
                )}
              </View>
              <CardIcon d={ICON_PATHS.chevron} bg="#F5F0E8" color="#8A8270" />
            </View>
          </BrutalCard>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/my/profiles')}>
          <BrutalCard>
            <Text className="text-sm text-text-sub">저장된 만세력이 없어요.</Text>
            <Text className="mt-1 text-xs font-bold text-teal-deep">+ 만세력 추가하기</Text>
          </BrutalCard>
        </Pressable>
      )}

      {profiles.length > 1 && (
        <Text className="text-xs text-text-sub">외 {profiles.length - 1}개 만세력</Text>
      )}
    </View>
  )
}

// 내 기록 섹션 — 최근 기록 피드 (삭제 포함)
function RecordsSectionAuthed() {
  const { api } = useAuth()
  const queryClient = useQueryClient()

  const { data: reports = [] } = useReports()
  const { data: consultations = [] } = useConsultations()
  const { data: compatibilityReports = [] } = useCompatibilityReports()
  const { data: dailyRecords = [] } = useDailyRecords()

  const totalCount =
    reports.length + consultations.length + compatibilityReports.length + dailyRecords.length

  // 최근 기록을 타입별 최신 3개씩 제한하여 피드로 합침
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const recentConsultations = [...consultations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const recentCompatibility = [...compatibilityReports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const recentDaily = [...dailyRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  return (
    <View className="gap-2">
      <Text className="text-sm font-extrabold text-ink">내 기록 {totalCount > 0 ? `(${totalCount})` : ''}</Text>

      {totalCount === 0 ? (
        <BrutalCard>
          <Text className="text-sm text-text-sub">아직 저장된 기록이 없어요.</Text>
          <Text className="mt-1 text-xs text-text-sub">사주 리포트, 한줄 상담, 궁합 등을 생성하면 여기에 쌓여요.</Text>
        </BrutalCard>
      ) : (
        <View className="gap-2">
          {/* 사주 리포트 */}
          {recentReports.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-bold text-text-sub">사주 리포트</Text>
              {recentReports.map((r) => (
                <SajuRecordCard
                  key={`report-${r.id}`}
                  report={r}
                  onDelete={async () => {
                    await deleteReport(api, r.id)
                    await queryClient.invalidateQueries({ queryKey: ['reports'] })
                  }}
                />
              ))}
            </View>
          )}

          {/* 한줄 상담 */}
          {recentConsultations.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-bold text-text-sub">한줄 상담</Text>
              {recentConsultations.map((c) => (
                <ConsultationRecordCard
                  key={`consultation-${c.id}`}
                  consultation={c}
                  onDelete={async () => {
                    await deleteConsultation(api, c.id)
                    await queryClient.invalidateQueries({ queryKey: ['consultations'] })
                  }}
                />
              ))}
            </View>
          )}

          {/* 궁합 리포트 */}
          {recentCompatibility.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-bold text-text-sub">궁합</Text>
              {recentCompatibility.map((r) => (
                <CompatibilityRecordCard
                  key={`compatibility-${r.id}`}
                  report={r}
                  onDelete={async () => {
                    await deleteCompatibilityReport(api, r.id)
                    await queryClient.invalidateQueries({ queryKey: ['compatibility'] })
                  }}
                />
              ))}
            </View>
          )}

          {/* 일진 기록 */}
          {recentDaily.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-bold text-text-sub">일진 기록</Text>
              {recentDaily.map((d) => (
                <DailyRecordCard
                  key={`daily-${d.id}`}
                  record={d}
                  onDelete={async () => {
                    await deleteDailyRecord(api, d.id)
                    await queryClient.invalidateQueries({ queryKey: ['daily'] })
                  }}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default function MyScreen() {
  const { status, user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      <Text className="mb-4 mt-2 text-2xl font-black text-ink">내 정보</Text>

      {status === 'loading' ? (
        <Text className="text-sm text-text-sub">불러오는 중…</Text>
      ) : status === 'authed' && user ? (
        <View className="gap-6">
          {/* 계정 정보 */}
          <BrutalCard>
            <Text className="text-xs font-semibold text-text-sub">로그인 계정</Text>
            <Text className="mt-1 text-base font-extrabold text-ink">{user.email}</Text>
          </BrutalCard>

          {/* 내 만세력 섹션 */}
          <ManseSectionAuthed />

          {/* 내 기록 섹션 */}
          <RecordsSectionAuthed />

          <Button label="로그아웃" variant="ghost" onPress={logout} />
        </View>
      ) : (
        <View className="gap-4">
          <BrutalCard>
            <Text className="text-sm text-text-sub">
              로그인하면 만세력을 저장하고 리포트·궁합을 만들 수 있어요.
            </Text>
          </BrutalCard>
          <Button label="Google로 로그인" onPress={() => router.push('/auth/login')} />
        </View>
      )}
    </Screen>
  )
}
