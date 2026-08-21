/**
 * /compatibility/[id] — 궁합 리포트 상세 화면.
 * 점수 헤더 + 시너지 요약 + 탭 아코디언(TabbedReport 재사용).
 */

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
  getCompatibilityReport,
  shareCompatibilityReport,
  type CompatibilityReportDetail,
  type CompatibilityTab,
  type ReportTab,
} from '@sajuguri/api-client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { TabbedReport } from '@/components/report/TabbedReport'
import { CompatScoreHeader } from '@/components/compat/CompatScoreHeader'
import { ElementFlowDiagram } from '@/components/compat/ElementFlowDiagram'

// CompatibilityTab과 ReportTab은 구조 동일 — 캐스팅 헬퍼
function toReportTab(tab: CompatibilityTab): ReportTab {
  return tab as unknown as ReportTab
}

// ── 메인 스크린 ──────────────────────────────────────────────────────────────

export default function CompatibilityDetailScreen() {
  const router = useRouter()
  const { id: rawId } = useLocalSearchParams<{ id: string }>()
  const id = Number(rawId)
  const { api, status, login } = useAuth()
  const [sharing, setSharing] = useState(false)

  const { data: report, isLoading, error } = useQuery<CompatibilityReportDetail, Error>({
    queryKey: ['compatibility', id],
    queryFn: () => getCompatibilityReport(api, id),
    enabled: status === 'authed' && !!id,
    staleTime: 5 * 60 * 1000,
  })

  // ── 로딩 중 ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </Screen>
    )
  }

  // ── 비로그인 게이트 ────────────────────────────────────────────────────────
  if (status !== 'authed') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' }}>
            로그인이 필요해요
          </Text>
          <Text style={{ fontSize: 14, color: '#8A8270', textAlign: 'center', lineHeight: 20 }}>
            궁합 리포트는 저장·공유를 위해 로그인 후 이용할 수 있어요.
          </Text>
          <Button label="구글로 로그인" onPress={() => login()} variant="primary" />
        </View>
      </Screen>
    )
  }

  // ── 데이터 로딩 ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ fontSize: 14, color: '#8A8270', fontWeight: '600' }}>
            궁합 리포트를 불러오는 중...
          </Text>
        </View>
      </Screen>
    )
  }

  // ── 오류 ─────────────────────────────────────────────────────────────────
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

  // ── 공유 ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    setSharing(true)
    try {
      const res = await shareCompatibilityReport(api, id, { mask_birth: false })
      const url = res.share_url
      await Share.share({ url, message: `궁합 리포트를 공유해요: ${url}` })
    } catch {
      Alert.alert('공유 실패', '공유 링크 생성에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSharing(false)
    }
  }

  // ── 데이터 준비 ───────────────────────────────────────────────────────────
  const nameA = report.person_a.name ?? 'A'
  const nameB = report.person_b.name ?? 'B'

  // 종합 케미 탭 헤드라인을 히어로 한 줄 요약으로 사용
  const summaryLine =
    report.tabs.find((tab) => tab.category === '종합 케미')?.headline ??
    report.tabs[0]?.headline ??
    ''

  const reportTabs: ReportTab[] = report.tabs.map(toReportTab)

  return (
    <Screen>
      {/* 뒤로가기 */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <Text style={{ fontSize: 22, color: '#1A1A1A', marginRight: 4 }}>←</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>궁합 리포트</Text>
      </Pressable>

      {/* 두 사람 요약 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#1A1A1A',
          borderRadius: 16,
          backgroundColor: '#FAFAF7',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
            {nameA}
          </Text>
          {report.person_a.birth_date ? (
            <Text style={{ fontSize: 12, color: '#8A8270' }}>{report.person_a.birth_date}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF6B00', marginHorizontal: 8 }}>♥</Text>
        <View style={{ flex: 1, alignItems: 'flex-end', minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A1A' }} numberOfLines={1}>
            {nameB}
          </Text>
          {report.person_b.birth_date ? (
            <Text style={{ fontSize: 12, color: '#8A8270' }}>{report.person_b.birth_date}</Text>
          ) : null}
        </View>
      </View>

      {/* 리포트 본문 */}
      <TabbedReport
        tabs={reportTabs}
        overview={
          <View style={{ gap: 24, marginBottom: 24 }}>
            <CompatScoreHeader
              nameA={nameA}
              nameB={nameB}
              score={report.score}
              synastry={report.synastry}
              summaryLine={summaryLine}
            />
            <ElementFlowDiagram
              synastry={report.synastry}
              nameA={nameA}
              nameB={nameB}
            />
          </View>
        }
      />

      {/* 안내 텍스트 */}
      <Text style={{ fontSize: 13, color: '#8A8270', textAlign: 'center', paddingBottom: 8, marginTop: 8 }}>
        각 제목을 클릭하면 해설이 펼쳐져요.
      </Text>

      {/* 액션 버튼 */}
      <View style={{ marginTop: 24, gap: 10 }}>
        <Button
          label={sharing ? '공유 링크 생성 중...' : '궁합 리포트 공유하기'}
          onPress={handleShare}
          variant="secondary"
          disabled={sharing}
        />
      </View>
    </Screen>
  )
}
