import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle, Defs, Marker, Path, Polygon, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import {
  arrowPath, balanceLabel, balanceScore, balanceSummary, judge, linePath,
  nodeRadius, pctLabelPos, pentagramVertices, SANG_GEUK_PAIRS, SANG_SAENG_PAIRS,
  selectWuxingPercent, WUXING_ORDER, type Verdict,
} from '@/lib/manse/wuxing'
import type { SajuCalcResponse } from '@sajuguri/api-client'

function verdictStyle(v: Verdict): { bg: string; text: string } {
  if (v === '과다') return { bg: '#FFEDE0', text: '#B34800' }
  if (v === '부족') return { bg: '#E0FAF8', text: '#00665F' }
  return { bg: '#F0EDE6', text: '#8A8270' }
}

function TabBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: active ? '#FFDE21' : '#FAFAF7',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#1A1A1A' : '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

function CheckRow({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{
        width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#1A1A1A',
        backgroundColor: checked ? '#FFDE21' : '#FAFAF7',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Text style={{ fontSize: 10, fontWeight: '900', color: '#1A1A1A' }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>{label}</Text>
    </Pressable>
  )
}

function Pentagram({ pct, dayElement }: { pct: Record<string, number>; dayElement: string }) {
  const v = pentagramVertices()
  const polygonPoints = v.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg viewBox="0 0 300 300" width="100%" style={{ aspectRatio: 1 }}>
        <Defs>
          <Marker id="wx-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <Path d="M0,0 L0,6 L8,3 z" fill="#00C2B8" opacity="0.7" />
          </Marker>
        </Defs>
        <Polygon points={polygonPoints} fill="none" stroke="#EBE3D2" strokeWidth="1.5" strokeDasharray="4,3" />
        {SANG_GEUK_PAIRS.map(([fi, ti], idx) => (
          <Path key={`geuk-${idx}`} d={linePath(v, fi, ti)} stroke="#FF6B00" strokeWidth="1" strokeDasharray="4,3" opacity="0.25" fill="none" />
        ))}
        {SANG_SAENG_PAIRS.map(([fi, ti], idx) => (
          <Path key={`saeng-${idx}`} d={arrowPath(v, pct, fi, ti)} stroke="#00C2B8" strokeWidth="1.5" opacity="0.5" fill="none" markerEnd="url(#wx-arrow)" />
        ))}
        <Circle cx="150" cy="150" r="24" fill="#FFFBF2" stroke="#1A1A1A" strokeWidth="1.5" />
        <SvgText x="150" y="145" textAnchor="middle" fontSize="9" fill="#8A8270">일간</SvgText>
        <SvgText x="150" y="162" textAnchor="middle" fontSize="15" fontWeight="bold" fill={ohaengColor(dayElement)}>{dayElement}</SvgText>
        {WUXING_ORDER.map((el, i) => {
          const color = ohaengColor(el)
          const lp = pctLabelPos(v, pct, i)
          return (
            <React.Fragment key={el}>
              <Circle cx={v[i].x} cy={v[i].y} r={nodeRadius(pct[el] ?? 0)} fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2" />
              <SvgText x={v[i].x} y={v[i].y + 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>{el}</SvgText>
              <SvgText x={lp.x} y={lp.y} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{pct[el] ?? 0}%</SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 20, height: 2, backgroundColor: '#00C2B8' }} />
          <Text style={{ fontSize: 11, color: '#8A8270' }}>상생</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 20, height: 2, borderStyle: 'dashed', borderTopWidth: 1.5, borderColor: '#FF6B00' }} />
          <Text style={{ fontSize: 11, color: '#8A8270' }}>상극</Text>
        </View>
      </View>
    </View>
  )
}

export function WuxingBar({ data }: { data: SajuCalcResponse }) {
  const [tab, setTab] = useState<'bar' | 'penta'>('bar')
  const [applyHap, setApplyHap] = useState(true)
  const [applyJohu, setApplyJohu] = useState(false)
  const pct = selectWuxingPercent(data, applyHap, applyJohu)
  const score = balanceScore(pct)
  const lbl = balanceLabel(score)
  const { over, lack } = balanceSummary(pct)

  const summaryText = over.length || lack.length
    ? [over.length ? `${over.join('·')} 과다` : '', lack.length ? `${lack.join('·')} 결핍` : ''].filter(Boolean).join(' + ')
    : '균형 잡힌 오행 구성이에요'

  const labelStyle = lbl.tone === 'good'
    ? { bg: '#E0FAF8', text: '#00665F' }
    : lbl.tone === 'mid'
      ? { bg: '#FFF9E0', text: '#6b5500' }
      : { bg: '#FFEDE0', text: '#B34800' }

  return (
    <BrutalCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>오행 밸런스</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TabBtn active={tab === 'bar'} label="막대" onPress={() => setTab('bar')} />
          <TabBtn active={tab === 'penta'} label="오각형" onPress={() => setTab('penta')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFDE21' }}>{score}/100</Text>
        </View>
        <View style={{ backgroundColor: labelStyle.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: labelStyle.text }}>{lbl.text}</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#8A8270', flex: 1 }}>{summaryText}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <CheckRow checked={applyHap} label="합에 따른 오행 변화 적용" onToggle={() => setApplyHap(!applyHap)} />
        <CheckRow checked={applyJohu} label="조후와 궁성 보정값 적용" onToggle={() => setApplyJohu(!applyJohu)} />
      </View>

      {tab === 'bar' ? (
        <View style={{ gap: 8 }}>
          {WUXING_ORDER.map((el) => {
            const v = judge(pct[el] ?? 0)
            const color = ohaengColor(el)
            const vs = verdictStyle(v)
            const vLabel = v === '과다' ? '과다' : v === '부족' ? '부족' : '적정'
            return (
              <View key={el} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ width: 20, fontSize: 12, fontWeight: '900', color }}>{el}</Text>
                <View style={{ flex: 1, height: 10, backgroundColor: '#F0EDE6', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(pct[el] ?? 0, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
                </View>
                <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270', textAlign: 'right' }}>{pct[el] ?? 0}%</Text>
                <View style={{ width: 36, backgroundColor: vs.bg, borderRadius: 4, paddingVertical: 2, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: vs.text }}>{vLabel}</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <Pentagram pct={pct} dayElement={data.day_pillar.stem_element} />
      )}
    </BrutalCard>
  )
}
