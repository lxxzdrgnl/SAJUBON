import { useMemo } from 'react'
import RNMarkdown from 'react-native-markdown-display'
import type { StyleSheet } from 'react-native'

// [[chart:tool_name]] 마커 제거 정규식
const CHART_MARKER_RE = /\[\[chart:[a-z_]+\]\]/g

/**
 * 마크다운 렌더러.
 * - react-native-markdown-display 래핑
 * - [[chart:...]] 마커 자동 제거
 * - 브랜드 잉크 타이포그래피 스타일 적용
 */
export function Markdown({ children }: { children: string }) {
  const cleaned = useMemo(() => children.replace(CHART_MARKER_RE, '').trim(), [children])

  return (
    <RNMarkdown style={markdownStyles}>
      {cleaned}
    </RNMarkdown>
  )
}

const markdownStyles: StyleSheet.NamedStyles<Record<string, object>> = {
  body: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: undefined,
  },
  heading1: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 10,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '800',
    color: '#1A1A1A',
  },
  em: {
    fontStyle: 'italic',
    color: '#1A1A1A',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 22,
  },
  bullet_list: {
    marginBottom: 10,
  },
  ordered_list: {
    marginBottom: 10,
  },
  list_item: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    color: '#FF6B00',
    marginRight: 6,
    fontWeight: '800',
  },
  code_inline: {
    backgroundColor: '#F5F2EC',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#1A1A1A',
  },
  fence: {
    backgroundColor: '#F5F2EC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  blockquote: {
    backgroundColor: '#FFF4E3',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  hr: {
    backgroundColor: '#E0D9CE',
    height: 1,
    marginVertical: 12,
  },
}
