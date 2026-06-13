import { readFileSync } from 'node:fs'
import path from 'node:path'

interface Props {
  /** 일간색 hex — 없으면 기본 옐로(#FFD900) */
  stemBg?: string | null
  width?: number
  height?: number
}

export default function MascotTinted({ stemBg, width = 44, height = 44 }: Props) {
  const color = stemBg && stemBg !== '' ? stemBg : '#FFD900'

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
    .replace(/#FFD900/gi, color)

  return <span dangerouslySetInnerHTML={{ __html: tinted }} aria-hidden="true" />
}
