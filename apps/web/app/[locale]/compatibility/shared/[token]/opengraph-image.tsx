import { ImageResponse } from 'next/og'
import { serverApi } from '@/lib/api'
import { getSharedCompatibilityReport } from '@sajuguri/api-client'
import type { CompatibilityReportDetail } from '@sajuguri/api-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = '사주구리 궁합 리포트'

// 비비드 Wrapped 톤 — 운세 OG와 동일 스킨.
const BG = '#FFD900'
const INK = '#15233A'
const PINK = '#FF2D78'

/**
 * 한글 폰트 임베드 — next/og(satori)는 시스템 폰트가 없어 한글이 □로 깨진다.
 * Google Fonts CSS API를 text 파라미터로 호출하면 필요한 글자만 담은 서브셋을 준다.
 * wght@ 축을 붙이면 satori가 못 읽는 압축 kit이 오므로 축 없이(family=Noto+Sans+KR)
 * 요청해 format('truetype') 실제 TTF를 받는다. 실패 시 폰트 없이 (영문/숫자만) 렌더.
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

  let detail: CompatibilityReportDetail | null = null
  try {
    detail = await getSharedCompatibilityReport(serverApi, token)
  } catch {
    detail = null
  }

  const nameA = detail?.person_a.name || 'A'
  const nameB = detail?.person_b.name || 'B'
  const total = detail?.score.total
  // 첫 탭(앵커=종합 케미) 헤드라인을 인용으로 사용.
  const headline = detail?.tabs?.[0]?.headline || ''

  // 렌더에 등장하는 모든 한글을 서브셋 텍스트로 모은다.
  const fontText = '사주구리궁합리포트' + nameA + nameB + headline
  const fontData = await loadKoreanFont(fontText)

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
          <div style={{ fontSize: 40, fontWeight: 700, color: INK, letterSpacing: '0.04em' }}>
            사주구리
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, opacity: 0.55 }}>궁합 리포트</div>
        </div>

        {/* 히어로 — 이름 ♥ 이름 + 총점 */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 56, fontWeight: 700, color: INK }}>
            <span>{nameA}</span>
            <span style={{ color: PINK, margin: '0 20px' }}>♥</span>
            <span>{nameB}</span>
          </div>

          {total !== undefined && (
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 8 }}>
              <div style={{ fontSize: 220, fontWeight: 700, color: INK, lineHeight: 1 }}>{total}</div>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: INK,
                  opacity: 0.45,
                  marginBottom: 36,
                  marginLeft: 8,
                }}
              >
                /100
              </div>
            </div>
          )}

          {/* 헤드라인 인용 */}
          {headline && (
            <div style={{ fontSize: 48, fontWeight: 700, color: PINK, marginTop: 12, maxWidth: 1000 }}>
              “{headline}”
            </div>
          )}
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
