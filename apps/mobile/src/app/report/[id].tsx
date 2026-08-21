import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  getReport,
  shareReport,
  type ReportDetail,
  type YearFlowMonth,
} from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { TabbedReport } from '@/components/report/TabbedReport'
import { Markdown } from '@/components/markdown/Markdown'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { ChartPlaceholder } from '@/components/report/ChartPlaceholder'

// ── 올해의 흐름 섹션 ──────────────────────────────────────────────────────────

function YearFlowSection({ yearFlow }: { yearFlow: ReportDetail['year_flow'] }) {
  const [expanded, setExpanded] = useState(false)
  const months: YearFlowMonth[] = yearFlow.months ?? []
  const visible = expanded ? months : months.slice(0, 4)

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '900', color: '#1A1A1A' }}>
        <Text style={{ color: '#00A878' }}>올해의 흐름 </Text>
        {yearFlow.year}년
      </Text>

      {/* 상/하반기 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <BrutalCard intensity="full" style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#00A878', marginBottom: 4 }}>
            상반기
          </Text>
          <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 18 }}>
            {yearFlow.first_half}
          </Text>
        </BrutalCard>
        <BrutalCard intensity="full" style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#00A878', marginBottom: 4 }}>
            하반기
          </Text>
          <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 18 }}>
            {yearFlow.second_half}
          </Text>
        </BrutalCard>
      </View>

      {/* 월별 */}
      <BrutalCard intensity="full" style={{ padding: 0, overflow: 'hidden' }}>
        {/* 헤더 행 */}
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 2,
            borderBottomColor: '#1A1A1A',
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>월</Text>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>키워드</Text>
          <Text style={{ flex: 2, fontSize: 11, fontWeight: '800', color: '#1A1A1A' }}>한 줄 메모</Text>
        </View>

        {visible.map((m, idx) => (
          <View
            key={m.month}
            style={{
              flexDirection: 'row',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: idx > 0 ? 1 : 0,
              borderTopColor: '#E0D9CE',
            }}
          >
            <Text style={{ flex: 0.5, fontSize: 13, fontWeight: '800', color: '#FF6B00' }}>
              {m.month}월
            </Text>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
              {m.keyword}
            </Text>
            <Text style={{ flex: 2, fontSize: 12, color: '#1A1A1A', lineHeight: 17 }}>
              {m.memo}
            </Text>
          </View>
        ))}

        {!expanded && months.length > 4 && (
          <Pressable
            onPress={() => setExpanded(true)}
            style={{
              borderTopWidth: 1,
              borderTopColor: '#E0D9CE',
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
              나머지 보기 ({months.length - 4})
            </Text>
          </Pressable>
        )}
      </BrutalCard>
    </View>
  )
}

// ── 대운 섹션 ─────────────────────────────────────────────────────────────────

function DaeUnSection({ daeUn }: { daeUn: ReportDetail['dae_un_analysis'] }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '900', color: '#FF6B00' }}>대운 비교</Text>

      <ChartPlaceholder tool="get_dae_un" />

      {/* 현재 대운 */}
      <BrutalCard
        intensity="full"
        style={{ borderColor: '#FF6B00' }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6B00', marginBottom: 4 }}>
          현재 대운
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 2 }}>
          {daeUn.current.ganji}
        </Text>
        <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '600', marginBottom: 8 }}>
          {daeUn.current.period}
        </Text>
        <Text style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 20 }}>
          {daeUn.current.text}
        </Text>
      </BrutalCard>

      {/* 다음 대운 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8270', marginBottom: 4 }}>
          다음 대운
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 2 }}>
          {daeUn.next.ganji}
        </Text>
        <Text style={{ fontSize: 11, color: '#8A8270', fontWeight: '600', marginBottom: 8 }}>
          {daeUn.next.period}
        </Text>
        <Text style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 20 }}>
          {daeUn.next.text}
        </Text>
      </BrutalCard>

      {/* 주의사항 */}
      <BrutalCard intensity="soft">
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6B00', marginBottom: 4 }}>
          주의점
        </Text>
        <Text style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 20 }}>
          {daeUn.caution}
        </Text>
      </BrutalCard>
    </View>
  )
}

// ── 메인 스크린 ────────────────────────────────────────────────────────────────

export default function ReportDetailScreen() {
  const router = useRouter()
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number(rawId)
  const { api, status, login } = useAuth()
  const [sharing, setSharing] = useState(false)

  const { data: report, isLoading, error } = useQuery<ReportDetail, Error>({
    queryKey: ['report', id],
    queryFn: () => getReport(api, id),
    enabled: status === 'authed' && !!id,
    staleTime: 5 * 60 * 1000,
  })

  // ── 비로그인 게이트 ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </Screen>
    )
  }

  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            리포트는 로그인한 사용자만 생성하고 저장할 수 있어요.
          </Text>
          <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>
            리포트를 불러오는 중...
          </Text>
        </View>
      </Screen>
    )
  }

  // ── 오류 ────────────────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            리포트를 불러올 수 없어요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center' }}>
            {error?.message ?? '알 수 없는 오류가 발생했어요.'}
          </Text>
          <Button label="돌아가기" onPress={() => router.back()} variant="ghost" />
        </View>
      </Screen>
    )
  }

  // ── 공유 ────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setSharing(true)
    try {
      const res = await shareReport(api, id, false)
      const url = res.share_url
      await Share.share({ url, message: `사주 리포트를 공유해요: ${url}` })
    } catch {
      Alert.alert('공유 실패', '공유 링크 생성에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSharing(false)
    }
  }

  const bi = report.birth_input

  return (
    <Screen>
      {/* 뒤로가기 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>내 리포트</Text>
      </Pressable>

      {/* 원국 한 줄 요약 — 마스코트 아바타 포함 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 16,
          backgroundColor: '#FAFAF7',
          padding: 12,
          marginBottom: 16,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            borderRadius: 12,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAF7',
          }}
        >
          <MascotTinted size={40} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>
          {[report.profile_name || bi.name, bi.birth_date, bi.gender === 'male' ? '남성' : '여성']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: '#FF6B00', fontWeight: '700', lineHeight: 19, marginBottom: 4 }}>
        {report.first_headline}
      </Text>
      <Text style={{ fontSize: 11, color: '#C0B8A8', marginBottom: 24 }}>
        {new Date(report.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </Text>

      {/* 리포트 본문 */}
      <TabbedReport
        tabs={report.tabs}
        overview={
          <View style={{ gap: 24, marginBottom: 24 }}>
            <YearFlowSection yearFlow={report.year_flow} />
            <DaeUnSection daeUn={report.dae_un_analysis} />
          </View>
        }
      />

      {/* 다시 생성 CTA */}
      <Pressable
        onPress={() => router.push('/report/new' as never)}
        style={{
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: '#FAFAF7',
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          marginTop: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }}>다시 생성</Text>
      </Pressable>

      {/* 안내 텍스트 */}
      <Text style={{ fontSize: 13, color: '#8A8270', textAlign: 'center', paddingBottom: 8, marginTop: 8 }}>
        각 제목을 클릭하면 해설이 펼쳐져요
      </Text>

      {/* 액션 버튼 */}
      <View style={{ marginTop: 24, gap: 10 }}>
        <Button
          label={sharing ? '공유 링크 생성 중...' : '리포트 공유하기'}
          onPress={handleShare}
          variant="secondary"
          disabled={sharing}
        />
      </View>
    </Screen>
  )
}
