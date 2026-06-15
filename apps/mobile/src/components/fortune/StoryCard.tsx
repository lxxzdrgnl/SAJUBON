/**
 * 스토리 단일 카드 — Spotify Wrapped 룩. kind별 레이아웃.
 *   intro: 마스코트 + 일진 초대형 타이포
 *   overall: 점수 초대형 카운트업 + 헤드라인 + 본문
 *   category: 랭킹 번호(01·02…) + 점수 + 헤드라인 + 본문
 *   caution / color: 헤드라인 + 본문 (color는 색 스와치 원)
 * 이모지 없음, 텍스트 전부 한국어.
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, Animated as RNAnimated, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming as rWithTiming,
} from 'react-native-reanimated'
import type { StoryCard as StoryCardType } from '@sajuguri/api-client'
import { MascotTinted } from '@/components/ui/MascotTinted'
import {
  countUpValue,
  extractColorSwatches,
  type CardPalette,
} from '@/lib/story'

// ── 카운트업 훅 ───────────────────────────────────────────────────────────────

function useCountUp(target: number | undefined, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (target === undefined) return
    setValue(0)
    const start = Date.now()
    animRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / durationMs, 1)
      setValue(countUpValue(target, progress))
      if (progress >= 1) {
        if (animRef.current) clearInterval(animRef.current)
      }
    }, 16)
    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [target, durationMs])

  return value
}

// ── 스태거 fade-up 훅 ─────────────────────────────────────────────────────────

function useStaggerAnims(count: number, delayBase = 140) {
  const anims = useRef(Array.from({ length: count }, () => new RNAnimated.Value(0))).current

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      RNAnimated.timing(anim, {
        toValue: 1,
        duration: 520,
        delay: delayBase + i * 110,
        useNativeDriver: true,
      }),
    )
    RNAnimated.parallel(animations).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return anims
}

// ── 반응형 폰트 ───────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width

/** clamp(min, vw*factor, max) 근사 — web clamp() 대응. */
function scaledFont(min: number, factor: number, max: number): number {
  return Math.min(Math.max(Math.round(SCREEN_W * factor), min), max)
}

// ── Reanimated 훅 ─────────────────────────────────────────────────────────────

function useGlowPulse(active: boolean) {
  const glow = useSharedValue(0)
  useEffect(() => {
    if (!active) {
      glow.value = 0
      return
    }
    glow.value = withRepeat(
      withSequence(
        rWithTiming(1, { duration: 1000 }),
        rWithTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    )
    return () => {
      glow.value = 0
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return useAnimatedStyle(() => ({
    opacity: 0.7 + glow.value * 0.3,
  }))
}

function useCautionPulse(active: boolean) {
  const pulse = useSharedValue(0)
  useEffect(() => {
    if (!active) {
      pulse.value = 0
      return
    }
    pulse.value = withRepeat(
      withSequence(
        rWithTiming(0.8, { duration: 1500 }),
        rWithTiming(0.5, { duration: 1500 }),
      ),
      -1,
      false,
    )
    return () => {
      pulse.value = 0
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return useAnimatedStyle(() => ({
    opacity: pulse.value,
  }))
}

// ── 컨페티 ────────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#FFD900', '#FF2D78', '#00C2B8',
  '#7B3FE4', '#C6F432', '#FF6B00',
  '#FFFFFF', '#3DA5FF', '#FF5A4D',
]

function Confetti({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      anim: new RNAnimated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: (Math.random() - 0.5) * 200,
      dy: -(80 + Math.random() * 140),
      size: 4 + Math.round(Math.random() * 6),
      tall: Math.random() > 0.5,
    }))
  ).current
  const fired = useRef(false)

  useEffect(() => {
    if (!active || fired.current) return
    fired.current = true
    const anims = particles.map((p, i) =>
      RNAnimated.timing(p.anim, {
        toValue: 1,
        duration: 900 + Math.random() * 600,
        delay: i * 20,
        useNativeDriver: true,
      })
    )
    RNAnimated.parallel(anims).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (!active) return null

  return (
    <View style={{ position: 'absolute', top: '30%', left: '30%' }} pointerEvents="none">
      {particles.map((p, i) => (
        <RNAnimated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.tall ? p.size * 2.5 : p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            transform: [
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.8, 0.4] }) },
            ],
            opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
          }}
        />
      ))}
    </View>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  card: StoryCardType
  dayGanji: { stem: string; branch: string }
  profileName: string
  palette: CardPalette
  rank: number | null
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function StoryCard({ card, dayGanji, profileName, palette, rank }: Props) {
  const scoreValue = useCountUp(card.score)
  const swatches = card.kind === 'color' ? extractColorSwatches(`${card.headline} ${card.body}`) : []

  const isHighScore = (card.kind === 'overall' || card.kind === 'category') && (card.score ?? 0) >= 90
  const isLowScore = (card.kind === 'overall' || card.kind === 'category') && (card.score ?? 100) <= 35

  const { ink, inkSoft, accent } = palette

  // stagger anims — 최대 4개 요소
  const stagger = useStaggerAnims(4)
  const fadeUp = (i: number): object => ({
    opacity: stagger[i],
    transform: [{ translateY: stagger[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  })

  // mascot pop anim
  const mascotAnim = useRef(new RNAnimated.Value(0)).current
  useEffect(() => {
    RNAnimated.spring(mascotAnim, {
      toValue: 1,
      tension: 180,
      friction: 8,
      delay: 120,
      useNativeDriver: true,
    }).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reanimated 훅 (unconditionally called)
  const glowStyle = useGlowPulse(isHighScore)
  const cautionStyle = useCautionPulse(isLowScore)

  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>

      {/* 카드 종류 라벨 */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: inkSoft,
          marginBottom: 12,
        }}
      >
        {card.title}
      </Text>

      {/* ── intro ── */}
      {card.kind === 'intro' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <RNAnimated.View
            style={{
              transform: [{ scale: mascotAnim }],
              opacity: mascotAnim,
            }}
          >
            <MascotTinted stem={dayGanji.stem} size={120} />
          </RNAnimated.View>

          <RNAnimated.View style={[{ alignItems: 'center' }, fadeUp(0)]}>
            <Text
              style={{
                fontSize: scaledFont(72, 0.22, 104),
                fontWeight: '900',
                letterSpacing: -2,
                color: ink,
                lineHeight: scaledFont(64, 0.20, 96),
              }}
            >
              {dayGanji.stem}{dayGanji.branch}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: inkSoft, marginTop: 8 }}>
              {profileName ? `${profileName}의 ` : ''}오늘
            </Text>
          </RNAnimated.View>

          <RNAnimated.View style={[{ width: '100%' }, fadeUp(1)]}>
            <Text
              style={{
                fontSize: scaledFont(26, 0.075, 34),
                fontWeight: '900',
                color: ink,
                lineHeight: 36,
                letterSpacing: -0.5,
              }}
            >
              {card.headline}
            </Text>
            <Text style={{ fontSize: 16, color: inkSoft, marginTop: 12, lineHeight: 24 }}>
              {card.body}
            </Text>
          </RNAnimated.View>
        </View>
      )}

      {/* ── overall ── */}
      {card.kind === 'overall' && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 20, paddingBottom: 24 }}>
          {/* 주의 오버레이 */}
          {isLowScore && (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: `${ink}1A`,
                  borderRadius: 8,
                },
                cautionStyle,
              ]}
            />
          )}
          {card.score !== undefined && (
            <RNAnimated.View style={fadeUp(0)}>
              {/* 컨페티 버스트 */}
              <Confetti active={isHighScore} />
              <Animated.View style={isHighScore ? glowStyle : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: scaledFont(108, isHighScore ? 0.38 : 0.34, isHighScore ? 168 : 150),
                      fontWeight: '900',
                      letterSpacing: -4,
                      color: ink,
                      lineHeight: scaledFont(100, isHighScore ? 0.34 : 0.30, isHighScore ? 152 : 136),
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {scoreValue}
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: '900',
                      color: inkSoft,
                      marginBottom: 12,
                    }}
                  >
                    /100
                  </Text>
                </View>
              </Animated.View>
              {isHighScore && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: accent,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: palette.inkLight ? '#15233A' : '#FFFFFF', letterSpacing: 1 }}>
                    오늘의 하이라이트
                  </Text>
                </View>
              )}
              {isLowScore && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: ink,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: palette.base, letterSpacing: 1 }}>
                    주의
                  </Text>
                </View>
              )}
            </RNAnimated.View>
          )}

          <RNAnimated.View style={fadeUp(1)}>
            <Text
              style={{
                fontSize: scaledFont(30, 0.085, 44),
                fontWeight: '900',
                color: ink,
                lineHeight: 40,
                letterSpacing: -0.5,
              }}
            >
              {card.headline}
            </Text>
          </RNAnimated.View>

          <RNAnimated.View style={fadeUp(2)}>
            <Text style={{ fontSize: 15, color: inkSoft, lineHeight: 22 }}>
              {card.body}
            </Text>
          </RNAnimated.View>
        </View>
      )}

      {/* ── category ── */}
      {card.kind === 'category' && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          {rank !== null && (
            <RNAnimated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }, fadeUp(0)]}>
              <Text
                style={{
                  fontSize: scaledFont(96, 0.30, 140),
                  fontWeight: '900',
                  letterSpacing: -5,
                  color: accent,
                  lineHeight: scaledFont(84, 0.26, 124),
                  fontVariant: ['tabular-nums'],
                }}
              >
                {String(rank).padStart(2, '0')}
              </Text>
              {card.score !== undefined && (
                <View style={{ marginBottom: 10, gap: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', color: inkSoft }}>
                    SCORE
                  </Text>
                  <Text
                    style={{
                      fontSize: 50,
                      fontWeight: '900',
                      color: ink,
                      lineHeight: 52,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {scoreValue}
                  </Text>
                </View>
              )}
              {isHighScore && (
                <View
                  style={{
                    backgroundColor: accent,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    marginBottom: 14,
                    alignSelf: 'flex-end',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', color: palette.inkLight ? '#15233A' : '#FFFFFF', letterSpacing: 1 }}>
                    오늘의 하이라이트
                  </Text>
                </View>
              )}
              {isLowScore && (
                <View
                  style={{
                    backgroundColor: ink,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    marginBottom: 14,
                    alignSelf: 'flex-end',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', color: palette.base, letterSpacing: 1 }}>
                    주의
                  </Text>
                </View>
              )}
            </RNAnimated.View>
          )}

          <RNAnimated.View style={fadeUp(1)}>
            <Text style={{ fontSize: scaledFont(28, 0.075, 40), fontWeight: '900', color: ink, lineHeight: 38, letterSpacing: -0.5 }}>
              {card.headline}
            </Text>
          </RNAnimated.View>

          <RNAnimated.View style={fadeUp(2)}>
            <Text style={{ fontSize: 15, color: inkSoft, lineHeight: 22 }}>
              {card.body}
            </Text>
          </RNAnimated.View>
        </View>
      )}

      {/* ── caution / color ── */}
      {(card.kind === 'caution' || card.kind === 'color') && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          {/* color 카드: 추천 색 스와치 */}
          {swatches.length > 0 && (
            <RNAnimated.View style={[{ flexDirection: 'row', gap: 12 }, fadeUp(0)]}>
              {swatches.map((hex) => (
                <View
                  key={hex}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: hex,
                    borderWidth: 3,
                    borderColor: ink,
                  }}
                />
              ))}
            </RNAnimated.View>
          )}

          <RNAnimated.View style={fadeUp(swatches.length > 0 ? 1 : 0)}>
            <Text style={{ fontSize: scaledFont(28, 0.08, 40), fontWeight: '900', color: ink, lineHeight: 38, letterSpacing: -0.5 }}>
              {card.headline}
            </Text>
          </RNAnimated.View>

          <RNAnimated.View style={fadeUp(swatches.length > 0 ? 2 : 1)}>
            <Text style={{ fontSize: 15, color: inkSoft, lineHeight: 22 }}>
              {card.body}
            </Text>
          </RNAnimated.View>
        </View>
      )}
    </View>
  )
}
