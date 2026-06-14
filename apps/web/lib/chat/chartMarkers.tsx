/**
 * 차트 마커 공통 헬퍼.
 *
 * AI 텍스트(채팅 본문 / 리포트 탭 content) 안에 `[[chart:get_palja]]` 형태의
 * 마커를 끼워두면, 그 위치에 해당 차트 카드(ToolCard)를 인라인으로 렌더한다.
 * 채팅과 리포트가 동일한 분리·렌더 로직을 공유하도록 여기로 추출했다.
 *
 * - 완전히 닫힌 마커만 매칭한다(스트리밍 중 부분 토큰은 그냥 텍스트로 남는다).
 * - 마커가 가리키는 tool의 payload가 없으면(아직 안 옴/계산 실패 등) 카드는
 *   건너뛴다. 마커 토큰 자체는 어느 경우든 출력에서 제거되므로 raw
 *   `[[chart:...]]` 텍스트가 화면에 노출되지 않는다.
 */
import type { ReactNode } from 'react'
import ToolCard from '@/components/chat/ToolCard'

// 본문 안의 차트 마커 토큰. `[[chart:get_palja]]` 형태.
export const CHART_MARKER_RE = /\[\[chart:([a-z_]+)\]\]/g

/** 텍스트 안에서 마커로 참조된 tool 이름 목록을 추출한다. */
export function markerToolsInText(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(CHART_MARKER_RE)) out.push(m[1])
  return out
}

export interface RenderTextWithChartsOptions {
  /**
   * 텍스트 세그먼트를 렌더하는 콜백. 채팅은 틸 말풍선 div로 감싸고,
   * 리포트는 평문 Markdown으로 렌더하는 식으로 문맥별 스타일을 주입한다.
   */
  renderText: (text: string, key: string) => ReactNode
  /** 차트 카드 wrapper className (문맥별 간격 조정용). */
  cardClassName?: string
}

/**
 * 텍스트를 `[[chart:TOOL]]` 마커 기준으로 쪼개어, 텍스트 세그먼트 사이에
 * 해당 차트 카드를 끼워 렌더한 React 노드 배열을 만든다.
 */
export function renderTextWithCharts(
  text: string,
  toolByName: Record<string, Record<string, unknown>>,
  keyPrefix: string,
  opts: RenderTextWithChartsOptions,
): ReactNode[] {
  const { renderText, cardClassName = 'flex flex-col gap-2 w-full min-w-0' } = opts
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let seg = 0
  for (const m of text.matchAll(CHART_MARKER_RE)) {
    const before = text.slice(lastIndex, m.index)
    if (before.trim()) {
      nodes.push(renderText(before, `${keyPrefix}-t${seg}`))
    }
    const tool = m[1]
    const payload = toolByName[tool]
    if (payload) {
      nodes.push(
        <div key={`${keyPrefix}-c${seg}`} className={cardClassName}>
          <ToolCard tool={tool} payload={payload} />
        </div>,
      )
    }
    lastIndex = (m.index ?? 0) + m[0].length
    seg++
  }
  const tail = text.slice(lastIndex)
  if (tail.trim()) {
    nodes.push(renderText(tail, `${keyPrefix}-t${seg}`))
  }
  return nodes
}
