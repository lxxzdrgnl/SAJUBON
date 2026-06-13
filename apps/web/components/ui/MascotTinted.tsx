import { tintMascot } from '@/lib/manse/mascotSvg'
import { stemToMascotBody } from '@/lib/manse/ganjiNickname'

interface Props {
  /** 일간(천간) 한글 한 글자 (예: '임'). 없으면 기본 옐로. 색 매핑은 ganjiNickname.ts 단일 출처. */
  stem?: string | null
  width?: number
  height?: number
}

/**
 * 너구리 마스코트를 일간색으로 틴팅한다. SVG는 TS 문자열 상수(mascotSvg.ts)에서 받아
 * 순수 tintMascot로 칠하므로 서버·클라 컴포넌트 양쪽에서 안전하게 렌더된다.
 * 회색(임·계) 보정·일간색 매핑은 모두 ganjiNickname.ts(stemToMascotBody)에 위임.
 */
export default function MascotTinted({ stem, width = 44, height = 44 }: Props) {
  const { color, grey } = stemToMascotBody(stem)
  const tinted = tintMascot(color, { width, height, grey })
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
