import { ImageResponse } from 'next/og'
import { serverApi } from '@/lib/api'
import { getSharedFortune } from '@sajuguri/api-client'
import type { DailyStoryResponse } from '@sajuguri/api-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = '사주구리 오늘의 운세'

// 비비드 Wrapped 톤 — SummaryCard 캡처 스킨과 동일.
const BG = '#FFD900'
const INK = '#15233A'
const PINK = '#FF2D78'

const CATEGORY_LABELS: Record<string, string> = {
  exam: '학업', money: '금전', love: '연애', career: '직업', health: '건강', social: '사교',
}

/** 총점 — overall 카드 점수 또는 카테고리 평균 (SummaryCard와 동일 규칙). */
function overallScore(story: DailyStoryResponse): number | undefined {
  const fromCard = story.cards.find((c) => c.kind === 'overall')?.score
  if (fromCard !== undefined) return fromCard
  const keys = Object.keys(story.scores)
  if (keys.length === 0) return undefined
  return Math.round(keys.reduce((s, k) => s + (story.scores[k] ?? 0), 0) / keys.length)
}

/**
 * 한글 폰트 임베드 — next/og(satori)는 시스템 폰트가 없어 한글이 □로 깨진다.
 * Google Fonts CSS API를 text 파라미터로 호출하면 필요한 글자만 담은 서브셋을 준다.
 * 단, wght@ 축을 붙이면 satori가 못 읽는 압축 kit이 오므로 축 없이(family=Noto+Sans+KR)
 * 요청해야 format('truetype') 실제 TTF(매직 0x00010000)가 온다. 실패 시 폰트 없이
 * (영문/숫자만) 렌더 — 점수·브랜드는 보장된다.
 */
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const uniq = Array.from(new Set(text.split(''))).join('')
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR&text=${encodeURIComponent(uniq)}`
    const cssRes = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      },
    })
    if (!cssRes.ok) return null
    const css = await cssRes.text()
    // 구형 UA 응답은 format() 힌트 없이 url(...)만 오기도 한다(바이트는 TTF).
    // truetype 명시본을 우선하되, 없으면 첫 url(...)을 사용한다.
    const fontUrl =
      css.match(/url\(([^)]+)\)\s*format\(['"]?truetype['"]?\)/)?.[1] ??
      css.match(/src:\s*url\(([^)]+)\)/)?.[1]
    if (!fontUrl) return null
    const fontRes = await fetch(fontUrl)
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let story: DailyStoryResponse | null = null
  try {
    story = await getSharedFortune(serverApi, token)
  } catch {
    story = null
  }

  const name = story?.profile_name || '사주구리'
  const keyword = story?.keyword || ''
  const date = story?.date || ''
  const score = story ? overallScore(story) : undefined
  const orderedKeys = story
    ? Object.keys(CATEGORY_LABELS).filter((k) => k in story!.scores)
    : []

  // 렌더에 등장하는 모든 한글을 서브셋 텍스트로 모은다.
  const fontText =
    '사주구리오늘의운세키워드점' +
    name + keyword + date +
    orderedKeys.map((k) => CATEGORY_LABELS[k]).join('')
  const fontData = await loadKoreanFont(fontText)

  // 서브셋 응답은 regular(400) 자형 — 단일 등록이라 satori가 모든 fontWeight에 사용.
  const fonts = fontData
    ? [{ name: 'Noto Sans KR', data: fontData, weight: 400 as const, style: 'normal' as const }]
    : undefined

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: BG,
          padding: '64px 72px',
          fontFamily: 'Noto Sans KR, sans-serif',
          position: 'relative',
        }}
      >
        {/* 브랜드 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: INK,
              letterSpacing: '0.04em',
            }}
          >
            사주구리
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, opacity: 0.55 }}>{date}</div>
        </div>

        {/* 히어로 — 이름 + 총점 */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: INK, opacity: 0.7 }}>{name}</div>
          {score !== undefined && (
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4 }}>
              <div style={{ fontSize: 220, fontWeight: 700, color: INK, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 56, fontWeight: 700, color: INK, opacity: 0.45, marginBottom: 36, marginLeft: 8 }}>
                /100
              </div>
            </div>
          )}

          {/* 키워드 인용 */}
          {keyword && (
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: PINK,
                marginTop: 12,
                maxWidth: 1000,
              }}
            >
              “{keyword}”
            </div>
          )}
        </div>

        {/* 하단 카테고리 점수 칩 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          {orderedKeys.map((k) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(21,35,58,0.10)',
                borderRadius: 999,
                padding: '10px 20px',
                fontSize: 28,
                fontWeight: 700,
                color: INK,
              }}
            >
              <span style={{ opacity: 0.7 }}>{CATEGORY_LABELS[k]}</span>
              <span>{story?.scores[k] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* 하단 워터마크 */}
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, opacity: 0.45, marginTop: 20 }}>
          sajuguri
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
