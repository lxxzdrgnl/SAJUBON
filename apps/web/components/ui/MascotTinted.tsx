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
  '#D7D9DD': '#8C919C',  // 경·신: steel blue-grey, clearly visible
  '#B9C4CC': '#7A8A97',  // 임·계: slate grey, clearly visible
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

  const tinted = svgContent
    .replace(/width="[^"]*"/, `width="${width}"`)
    .replace(/height="[^"]*"/, `height="${height}"`)
    .replace(/#FFD900/gi, bodyColor)

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
