import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { ReportTab } from '@sajuguri/api-client'
import { Markdown } from '@/components/markdown/Markdown'
import { BrutalCard } from '@/components/ui/BrutalCard'

// ── 탭 아코디언 (탭 하나) ─────────────────────────────────────────────────────

function TabAccordion({ tab }: { tab: ReportTab }) {
  const [open, setOpen] = useState(false)
  const paragraphs = tab.content.split('\n\n').filter(Boolean)
  const lastIdx = paragraphs.length - 1

  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: open ? '#FF6B00' : '#1A1A1A',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FAFAF7',
      }}
    >
      {/* 헤더 */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 16 }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          {/* 카테고리 + 요청 배지 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                backgroundColor: '#FF6B00',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                {tab.category}
              </Text>
            </View>
            {tab.requested && (
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: '#FF6B00',
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6B00' }}>요청</Text>
              </View>
            )}
          </View>
          {/* 헤드라인 */}
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', lineHeight: 21 }}>
            {tab.headline}
          </Text>
        </View>

        {/* 펼침 화살표 */}
        <Text
          style={{
            fontSize: 16,
            color: '#8A8270',
            marginTop: 2,
            transform: [{ rotate: open ? '180deg' : '0deg' }],
          }}
        >
          ▼
        </Text>
      </Pressable>

      {/* 본문 */}
      {open && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#E0D9CE',
            borderStyle: 'dashed',
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 12,
            gap: 8,
          }}
        >
          {paragraphs.map((para, i) =>
            i === lastIdx ? (
              // 마지막 문단 — 조언 박스
              <View
                key={i}
                style={{
                  backgroundColor: '#FFF4E3',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6B00', marginBottom: 4 }}>
                  현실 조언
                </Text>
                <Markdown>{para}</Markdown>
              </View>
            ) : (
              <Markdown key={i}>{para}</Markdown>
            ),
          )}
        </View>
      )}
    </View>
  )
}

// ── TabbedReport ──────────────────────────────────────────────────────────────

export interface TabbedReportProps {
  tabs: ReportTab[]
  header?: React.ReactNode
}

export function TabbedReport({ tabs, header }: TabbedReportProps) {
  return (
    <View style={{ gap: 12 }}>
      {/* 헤더 슬롯 (year_flow, dae_un 등) */}
      {header}

      {/* 탭 아코디언 목록 */}
      {tabs.map((tab, i) => (
        <TabAccordion key={i} tab={tab} />
      ))}
    </View>
  )
}
