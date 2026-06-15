export const CHART_MARKER_RE = /\[\[chart:([a-z_]+)\]\]/g

export function markerToolsInText(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(CHART_MARKER_RE)) out.push(m[1])
  return out
}

/** Split text by markers, returning segments with either text or tool name */
export type TextSegment = { kind: 'text'; text: string } | { kind: 'chart'; tool: string }

export function splitTextWithChartMarkers(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0
  for (const m of text.matchAll(CHART_MARKER_RE)) {
    const before = text.slice(lastIndex, m.index)
    if (before) segments.push({ kind: 'text', text: before })
    segments.push({ kind: 'chart', tool: m[1] })
    lastIndex = (m.index ?? 0) + m[0].length
  }
  const tail = text.slice(lastIndex)
  if (tail) segments.push({ kind: 'text', text: tail })
  return segments
}
