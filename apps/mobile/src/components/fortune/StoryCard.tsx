/**
 * 스토리 단일 카드 — Spotify Wrapped 룩. kind별 레이아웃.
 *   intro: 마스코트 + 일진 초대형 타이포
 *   overall: 점수 초대형 카운트업 + 헤드라인 + 본문
 *   category: 랭킹 번호(01·02…) + 점수 + 헤드라인 + 본문
 *   caution / color: 헤드라인 + 본문 (color는 색 스와치 원)
 * 이모지 없음, 텍스트 전부 한국어.
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, Animated } from 'react-native'
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
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 520,
        delay: delayBase + i * 110,
        useNativeDriver: true,
      }),
    )
    Animated.parallel(animations).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return anims
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
  const mascotAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(mascotAnim, {
      toValue: 1,
      tension: 180,
      friction: 8,
      delay: 120,
      useNativeDriver: true,
    }).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <Animated.View
            style={{
              transform: [{ scale: mascotAnim }],
              opacity: mascotAnim,
            }}
          >
            <MascotTinted stem={dayGanji.stem} size={120} />
          </Animated.View>

          <Animated.View style={[{ alignItems: 'center' }, fadeUp(0)]}>
            <Text
              style={{
                fontSize: 96,
                fontWeight: '900',
                letterSpacing: -2,
                color: ink,
                lineHeight: 88,
              }}
            >
              {dayGanji.stem}{dayGanji.branch}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: inkSoft, marginTop: 8 }}>
              {profileName ? `${profileName}의 오늘` : '오늘의 운세'}
            </Text>
          </Animated.View>

          <Animated.View style={[{ width: '100%' }, fadeUp(1)]}>
            <Text
              style={{
                fontSize: 28,
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
          </Animated.View>
        </View>
      )}

      {/* ── overall ── */}
      {card.kind === 'overall' && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          {card.score !== undefined && (
            <Animated.View style={fadeUp(0)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text
                  style={{
                    fontSize: isHighScore ? 144 : 128,
                    fontWeight: '900',
                    letterSpacing: -4,
                    color: ink,
                    lineHeight: isHighScore ? 132 : 118,
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
            </Animated.View>
          )}

          <Animated.View style={fadeUp(1)}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '900',
                color: ink,
                lineHeight: 40,
                letterSpacing: -0.5,
              }}
            >
              {card.headline}
            </Text>
          </Animated.View>

          <Animated.View style={fadeUp(2)}>
            <Text style={{ fontSize: 17, color: inkSoft, lineHeight: 26 }}>
              {card.body}
            </Text>
          </Animated.View>
        </View>
      )}

      {/* ── category ── */}
      {card.kind === 'category' && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          {rank !== null && (
            <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }, fadeUp(0)]}>
              <Text
                style={{
                  fontSize: 128,
                  fontWeight: '900',
                  letterSpacing: -5,
                  color: accent,
                  lineHeight: 112,
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
            </Animated.View>
          )}

          <Animated.View style={fadeUp(1)}>
            <Text style={{ fontSize: 30, fontWeight: '900', color: ink, lineHeight: 38, letterSpacing: -0.5 }}>
              {card.headline}
            </Text>
          </Animated.View>

          <Animated.View style={fadeUp(2)}>
            <Text style={{ fontSize: 17, color: inkSoft, lineHeight: 26 }}>
              {card.body}
            </Text>
          </Animated.View>
        </View>
      )}

      {/* ── caution / color ── */}
      {(card.kind === 'caution' || card.kind === 'color') && (
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          {/* color 카드: 추천 색 스와치 */}
          {swatches.length > 0 && (
            <Animated.View style={[{ flexDirection: 'row', gap: 12 }, fadeUp(0)]}>
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
            </Animated.View>
          )}

          <Animated.View style={fadeUp(swatches.length > 0 ? 1 : 0)}>
            <Text style={{ fontSize: 30, fontWeight: '900', color: ink, lineHeight: 38, letterSpacing: -0.5 }}>
              {card.headline}
            </Text>
          </Animated.View>

          <Animated.View style={fadeUp(swatches.length > 0 ? 2 : 1)}>
            <Text style={{ fontSize: 17, color: inkSoft, lineHeight: 26 }}>
              {card.body}
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  )
}
