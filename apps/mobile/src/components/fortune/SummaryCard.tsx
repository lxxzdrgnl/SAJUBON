/**
 * 운세 요약 카드 (kind=summary) — Spotify Wrapped식 "캡처하고 싶은 한 장".
 * - 브랜드 헤더 + 날짜
 * - 총점 초대형 히어로 + 이름
 * - 오늘의 키워드 초대형 타이포
 * - 카테고리 가로 점수 바 6개
 * - [이미지로 저장] — react-native-view-shot + expo-sharing
 * - [닫기]
 * 이모지 없음, 텍스트 전부 한국어.
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, Animated, ActivityIndicator } from 'react-native'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import ViewShot, { type ViewShotRef } from 'react-native-view-shot'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import { MascotTinted } from '@/components/ui/MascotTinted'
import { type CardPalette } from '@/lib/story'

const BAR_LOW_THRESHOLD = 60

const CATEGORY_LABELS: Record<string, string> = {
  exam:   '학업',
  money:  '금전',
  love:   '연애',
  career: '직업',
  health: '건강',
  social: '사교',
}

interface Props {
  story: DailyStoryResponse
  onClose: () => void
  palette: CardPalette
}

export function SummaryCard({ story, onClose, palette }: Props) {
  const { ink, inkSoft, accent, base } = palette
  const viewShotRef = useRef<ViewShotRef>(null)
  const [saving, setSaving] = useState(false)
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions()

  // 바 리빌 애니메이션
  const [revealed, setRevealed] = useState(false)
  const barAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0)),
  ).current

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRevealed(true)
      const animations = barAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 760,
          delay: i * 80 + 260,
          useNativeDriver: false, // width 애니메이션은 useNativeDriver 불가
        }),
      )
      Animated.parallel(animations).start()
    }, 50)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orderedKeys = Object.keys(CATEGORY_LABELS).filter((k) => k in story.scores)
  const summaryCard = story.cards.find((c) => c.kind === 'summary')
  const overallScore = story.cards.find((c) => c.kind === 'overall')?.score
  const avgScore = overallScore ?? (
    orderedKeys.length > 0
      ? Math.round(orderedKeys.reduce((s, k) => s + (story.scores[k] ?? 0), 0) / orderedKeys.length)
      : undefined
  )

  const summaryTitle = story.profile_name ? `${story.profile_name}의 하루 요약` : '오늘의 하루 요약'

  /** ViewShot 캡처 → 공유 */
  async function handleSaveImage() {
    setSaving(true)
    try {
      // 미디어 라이브러리 권한 (이미지 저장용)
      if (mediaPermission?.status !== 'granted') {
        const { status } = await requestMediaPermission()
        if (status !== 'granted') {
          // 권한 없어도 공유는 가능 — Sharing으로 바로 진행
        }
      }

      if (!viewShotRef.current) return
      const uri = await viewShotRef.current.capture()

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '운세 이미지 저장' })
      } else if (mediaPermission?.status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri)
      }
    } catch {
      // 실패 무시 — UX 단순화
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ViewShot 래퍼 — 이 영역만 캡처 */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={{ backgroundColor: base, borderRadius: 16, padding: 20, marginBottom: 20 }}
      >
        {/* 브랜드 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MascotTinted stem={story.day_ganji.stem} size={28} />
            <Text style={{ fontSize: 13, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', color: ink }}>
              사주구리
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: inkSoft }}>
            {story.date}
          </Text>
        </View>

        {/* 총점 히어로 */}
        {avgScore !== undefined && (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', color: inkSoft, marginBottom: 2 }}>
              {summaryTitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Text
                style={{
                  fontSize: 88,
                  fontWeight: '900',
                  letterSpacing: -3,
                  color: accent,
                  lineHeight: 80,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {avgScore}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: inkSoft, marginBottom: 8 }}>/100</Text>
            </View>
          </View>
        )}

        {/* 오늘의 키워드 */}
        {story.keyword && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', color: inkSoft, marginBottom: 3 }}>
              오늘의 키워드
            </Text>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '900',
                color: ink,
                letterSpacing: -1,
                lineHeight: 40,
              }}
            >
              "{story.keyword}"
            </Text>
          </View>
        )}

        {/* 구분선 */}
        <View style={{ height: 1.5, backgroundColor: ink, opacity: 0.15, marginBottom: 16 }} />

        {/* 점수 바 6개 */}
        <View style={{ gap: 10 }}>
          {orderedKeys.map((key, i) => {
            const score = story.scores[key] ?? 0
            const isLow = score < BAR_LOW_THRESHOLD
            const barColor = isLow ? accent : ink
            const barAnim = barAnims[i]
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text
                  style={{
                    width: 32,
                    fontSize: 11,
                    fontWeight: '900',
                    color: inkSoft,
                    letterSpacing: 0.5,
                  }}
                >
                  {CATEGORY_LABELS[key]}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: `${ink}26`, // ~15% opacity
                    overflow: 'hidden',
                  }}
                >
                  <Animated.View
                    style={{
                      height: '100%',
                      borderRadius: 5,
                      backgroundColor: barColor,
                      width: barAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${score}%`],
                      }),
                    }}
                  />
                </View>
                <Text
                  style={{
                    width: 28,
                    fontSize: 14,
                    fontWeight: '900',
                    color: isLow ? accent : ink,
                    textAlign: 'right',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {score}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 요약 헤드라인 */}
        {summaryCard && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: ink, lineHeight: 24 }}>
              {summaryCard.headline}
            </Text>
            <Text style={{ fontSize: 13, color: inkSoft, marginTop: 6, lineHeight: 20 }}>
              {summaryCard.body}
            </Text>
          </View>
        )}

        {/* 워터마크 */}
        <Text style={{ fontSize: 10, color: inkSoft, marginTop: 16, letterSpacing: 1, opacity: 0.6 }}>
          사주구리 sajuguri
        </Text>
      </ViewShot>

      {/* CTA 버튼 */}
      <View style={{ gap: 12 }}>
        {/* 이미지로 저장 */}
        <Pressable
          onPress={handleSaveImage}
          disabled={saving}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: ink,
            borderRadius: 16,
            paddingVertical: 14,
            opacity: saving ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color={base} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '900', color: base }}>
              이미지로 저장
            </Text>
          )}
        </Pressable>

        {/* 닫기 */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: ink,
            borderRadius: 16,
            paddingVertical: 14,
            opacity: pressed ? 0.7 : 1,
            backgroundColor: 'transparent',
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: ink }}>
            닫기
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
