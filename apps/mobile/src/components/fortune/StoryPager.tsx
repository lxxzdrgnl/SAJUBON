/**
 * 스토리 페이저 — 탭 네비(좌 1/3=뒤로, 우 2/3=다음) + 세그먼트 프로그레스 바.
 * Reanimated 4 슬라이드+스케일 전환(translateX+scale) + 닫기(X) 버튼.
 * 배경색 ~480ms 크로스페이드, 하단 스쿼글 웨이브 SVG.
 * 텍스트 전부 한국어. 이모지 없음.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Pressable, Text } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Path } from 'react-native-svg'
import type { DailyStoryResponse } from '@sajuguri/api-client'
import {
  calcSegmentFills,
  slideDirection,
  cardPalette,
  paletteFromBase,
  hashSeed,
  SCATTER_DOTS,
  type CardPalette,
} from '@/lib/story'
import { StoryCard } from './StoryCard'
import { SummaryCard } from './SummaryCard'

interface Props {
  story: DailyStoryResponse
  onClose: () => void
}

const FALLBACK_PALETTE = paletteFromBase('#FFFBF2')

export function StoryPager({ story, onClose }: Props) {
  const [cardIndex, setCardIndex] = useState(0)
  const prevIndexRef = useRef(0)

  // 색 시드 — 날짜 + 이름 + scores 조합
  const colorSeed = hashSeed(`${story.date}|${story.profile_name ?? ''}|${JSON.stringify(story.scores)}`)

  const currentCard = story.cards[cardIndex]
  const isSummary = currentCard?.kind === 'summary'

  const palette: CardPalette = currentCard
    ? cardPalette(currentCard.kind, currentCard.category_key, colorSeed)
    : FALLBACK_PALETTE

  // 세그먼트
  const segments = calcSegmentFills(story.cards.length, cardIndex)

  // 카테고리 랭킹 번호
  const categoryRank = (() => {
    if (!currentCard || currentCard.kind !== 'category') return null
    const cats = story.cards.filter((c) => c.kind === 'category')
    const idx = cats.findIndex((c) => c === currentCard)
    return idx >= 0 ? idx + 1 : null
  })()

  // Reanimated 슬라이드+스케일 애니메이션
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
    flex: 1,
  }))

  const animateTransition = useCallback((dir: 'next' | 'prev' | 'none') => {
    if (dir === 'none') {
      opacity.value = 0
      opacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.ease) })
      return
    }
    const fromX = dir === 'next' ? 40 : -40
    translateX.value = fromX
    opacity.value = 0
    scale.value = 0.985
    translateX.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) })
    scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
  }, [translateX, opacity, scale])

  const goNext = useCallback(() => {
    const next = Math.min(cardIndex + 1, story.cards.length - 1)
    if (next === cardIndex) return
    const dir = slideDirection(cardIndex, next)
    prevIndexRef.current = cardIndex
    setCardIndex(next)
    animateTransition(dir)
  }, [cardIndex, story.cards.length, animateTransition])

  const goPrev = useCallback(() => {
    const next = Math.max(cardIndex - 1, 0)
    if (next === cardIndex) return
    const dir = slideDirection(cardIndex, next)
    prevIndexRef.current = cardIndex
    setCardIndex(next)
    animateTransition(dir)
  }, [cardIndex, animateTransition])

  const handleTap = useCallback((locationX: number, width: number) => {
    if (locationX < width / 3) goPrev()
    else goNext()
  }, [goPrev, goNext])

  // 배경색 — ~480ms 크로스페이드 (두 레이어 방식)
  const bg = palette.base
  const bgOpacity = useSharedValue(1)
  const prevBgRef = useRef(bg)
  const [prevBg, setPrevBg] = useState(bg)

  useEffect(() => {
    if (prevBgRef.current === bg) return
    const old = prevBgRef.current
    prevBgRef.current = bg
    setPrevBg(old)
    bgOpacity.value = 0
    bgOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.ease) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg])

  const bgOverlayStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))

  return (
    <View style={{ flex: 1 }}>
      {/* Layer 1: 이전 배경 (아래) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: prevBg }} />
      {/* Layer 2: 새 배경 (위, 페이드인) */}
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg }, bgOverlayStyle]} />

      {/* 그래픽 악센트 — 흩뿌린 점 + 하단 스쿼글 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {SCATTER_DOTS.map((d, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r,
              backgroundColor: palette.inkLight ? 'rgba(255,255,255,0.13)' : 'rgba(21,35,58,0.10)',
            }}
          />
        ))}

        {/* 하단 물결 */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none">
          <Svg
            width="100%"
            height={90}
            viewBox="0 0 640 120"
            preserveAspectRatio="none"
          >
            <Path
              d="M0 70 Q 80 30 160 70 T 320 70 T 480 70 T 640 70 V120 H0 Z"
              fill={palette.inkLight ? 'rgba(255,255,255,0.06)' : 'rgba(21,35,58,0.06)'}
            />
          </Svg>
        </View>
      </View>

      {/* 세그먼트 프로그레스 바 + 닫기 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          gap: 12,
        }}
      >
        {/* 세그먼트 */}
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {segments.length === 0 ? (
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: `${palette.ink}3D` }} />
          ) : (
            segments.map((fill, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: `${palette.ink}3D`,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    width: `${fill * 100}%`,
                    backgroundColor: palette.ink,
                  }}
                />
              </View>
            ))
          )}
        </View>

        {/* X 닫기 버튼 */}
        <Pressable
          onPress={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: `${palette.ink}28`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="닫기"
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: palette.ink, lineHeight: 18 }}>✕</Text>
        </Pressable>
      </View>

      {/* 카드 영역 — 탭 네비 */}
      <Pressable
        style={{ flex: 1 }}
        onPress={(e) => {
          // @ts-ignore — nativeEvent.locationX is available
          const lx = e.nativeEvent.locationX as number
          // @ts-ignore — nativeEvent.target width fallback
          const w = (e.nativeEvent as unknown as { layout?: { width: number } }).layout?.width ?? 390
          handleTap(lx, w)
        }}
      >
        <Animated.View style={animatedStyle} key={cardIndex}>
          {!isSummary && currentCard && (
            <StoryCard
              card={currentCard}
              dayGanji={story.day_ganji}
              profileName={story.profile_name}
              palette={palette}
              rank={categoryRank}
            />
          )}
          {isSummary && (
            <SummaryCard
              story={story}
              onClose={onClose}
              palette={palette}
            />
          )}
        </Animated.View>
      </Pressable>

      {/* 하단 점 인디케이터 */}
      {!isSummary && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
          }}
        >
          {story.cards.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === cardIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === cardIndex ? palette.ink : `${palette.ink}50`,
              }}
            />
          ))}
        </View>
      )}
    </View>
  )
}
