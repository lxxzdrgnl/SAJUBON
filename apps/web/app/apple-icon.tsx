import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// iOS "홈 화면에 추가" 아이콘 — Next가 <link rel="apple-touch-icon">를 자동 주입한다.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const runtime = 'nodejs'

export default function AppleIcon() {
  const svg = readFileSync(join(process.cwd(), 'public', 'mascot.svg'), 'utf-8')
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFD900',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={168} height={168} alt="" />
      </div>
    ),
    size,
  )
}
