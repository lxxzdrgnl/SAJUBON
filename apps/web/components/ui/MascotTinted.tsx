import { readFileSync } from 'node:fs'
import path from 'node:path'

interface Props {
  /** 일간색 hex — 없으면 기본 옐로(#FFD900) */
  stemBg?: string | null
  width?: number
  height?: number
}

// Grey/silver day-stem body colors — these become "dead" if used directly.
// Map to a deeper, more saturated variant that reads clearly.
const GREY_BODY_REMAP: Record<string, string> = {
  // 임·계(회색)만 어두운 그레이로 보정 + 이목구비 강조. 경·신(은빛)은 흰색계열이라 직접 사용.
  '#B9C4CC': '#5F7A95',  // 임·계: 푸른계열 슬레이트 그레이
}

function isGreyStem(color: string): boolean {
  return color in GREY_BODY_REMAP
}

export default function MascotTinted({ stemBg, width = 44, height = 44 }: Props) {
  const rawColor = stemBg && stemBg !== '' ? stemBg : '#FFD900'
  const bodyColor = GREY_BODY_REMAP[rawColor] ?? rawColor
  const grey = isGreyStem(rawColor)

  const svgPath = path.join(process.cwd(), 'public', 'mascot.svg')
  let svgContent: string
  try {
    svgContent = readFileSync(svgPath, 'utf8')
  } catch {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/mascot.svg" alt="" width={width} height={height} />
  }

  let tinted = svgContent
    .replace(/width="[^"]*"/, `width="${width}"`)
    .replace(/height="[^"]*"/, `height="${height}"`)
    .replace(/#FFD900/gi, bodyColor)

  // 회색 몸통이면 디테일(수염·눈·코 등 중간 회색)이 묻혀 칙칙해진다.
  // 디테일을 잉크 블랙으로 끌어올려 이목구비가 또렷하게 살게 한다.
  if (grey) {
    tinted = tinted
      .replace(/#666/gi, '#1A1A1A')
      .replace(/#3A3A3A/gi, '#1A1A1A')
      .replace(/#333/gi, '#1A1A1A')
  }

  const wrapStyle: React.CSSProperties = grey
    ? { filter: 'drop-shadow(0 0 3px rgba(160,175,200,0.65))' }
    : {}

  return (
    <span
      style={wrapStyle}
      dangerouslySetInnerHTML={{ __html: tinted }}
      aria-hidden="true"
    />
  )
}
