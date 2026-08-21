import { useMemo } from 'react'
import { View } from 'react-native'
import RNMarkdown from 'react-native-markdown-display'
import type { StyleSheet } from 'react-native'
import { ChartPlaceholder } from '@/components/report/ChartPlaceholder'

const CHART_MARKER_RE = /\[\[chart:([a-z_]+)\]\]/g

/**
 * Markdown コンポーネント
 *
 * Default: splits on [[chart:TOOL]] markers, renders ChartPlaceholder between text segments.
 * stripCharts=true: removes markers and renders clean markdown only.
 */
export function Markdown({
  children,
  stripCharts = false,
}: {
  children: string
  stripCharts?: boolean
}) {
  const strippedContent = useMemo(
    () => children.replace(CHART_MARKER_RE, '').trim(),
    [children],
  )

  const nodes = useMemo(() => {
    if (stripCharts) return null
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    const re = new RegExp(CHART_MARKER_RE.source, 'g')
    while ((match = re.exec(children)) !== null) {
      const before = children.slice(lastIndex, match.index).trim()
      if (before) {
        parts.push(<RNMarkdown key={`text-${lastIndex}`} style={markdownStyles}>{before}</RNMarkdown>)
      }
      parts.push(<ChartPlaceholder key={`chart-${match.index}`} tool={match[1]} />)
      lastIndex = match.index + match[0].length
    }
    const after = children.slice(lastIndex).trim()
    if (after) {
      parts.push(<RNMarkdown key={`text-${lastIndex}`} style={markdownStyles}>{after}</RNMarkdown>)
    }
    if (parts.length === 0) {
      parts.push(<RNMarkdown key="all" style={markdownStyles}>{children}</RNMarkdown>)
    }
    return parts
  }, [children, stripCharts])

  if (stripCharts) {
    return <RNMarkdown style={markdownStyles}>{strippedContent}</RNMarkdown>
  }

  return <View>{nodes}</View>
}

const markdownStyles: StyleSheet.NamedStyles<Record<string, object>> = {
  body: { color: '#1A1A1A', fontSize: 14, lineHeight: 22 },
  heading1: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginTop: 12, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginTop: 10, marginBottom: 4 },
  strong: { fontWeight: '800', color: '#1A1A1A' },
  em: { fontStyle: 'italic', color: '#1A1A1A' },
  paragraph: { marginTop: 0, marginBottom: 10, color: '#1A1A1A', fontSize: 14, lineHeight: 22 },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 4, flexDirection: 'row' },
  bullet_list_icon: { color: '#FF6B00', marginRight: 6, fontWeight: '800' },
  code_inline: { backgroundColor: '#F5F2EC', borderRadius: 4, paddingHorizontal: 4, fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A' },
  fence: { backgroundColor: '#F5F2EC', borderRadius: 8, padding: 12, marginBottom: 10 },
  blockquote: { backgroundColor: '#FFF4E3', borderLeftWidth: 3, borderLeftColor: '#FF6B00', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 4 },
  hr: { backgroundColor: '#E0D9CE', height: 1, marginVertical: 12 },
}
