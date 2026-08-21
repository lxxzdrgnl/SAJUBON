import { View, Text } from 'react-native'
import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg'
import { BrutalCard } from '@/components/ui/BrutalCard'
import { ohaengColor } from '@/lib/manse/ohaeng'
import { LEVELS_8, STRENGTH_DIST, levelIndex, levelPercentile, clampScore } from '@/lib/manse/strength'
import type { SajuCalcResponse } from '@sajuguri/api-client'

const ACCENT = '#FF6B00'

const LEVEL_DESCS: Record<string, string> = {
  극약: '일간의 힘이 극도로 약해요. 인성·비겁이 절실하고 설기·극제하는 기운은 크게 해로워요.',
  태약: '일간이 매우 약해요. 인성·비겁으로 강하게 부조해야 균형이 잡혀요.',
  신약: '일간이 약한 편이에요. 인성이나 비겁이 용신 후보로 쓰여요.',
  중화신약: '거의 균형에 가깝지만 약간 부족해요. 소폭의 부조가 도움이 돼요.',
  중화신강: '가장 이상적인 균형에 가까워요. 크게 치우침 없이 두루 좋은 사주예요.',
  신강: '일간이 강한 편이에요. 식상·재성·관성으로 기운을 소모·설기해야 해요.',
  태강: '일간이 매우 강해요. 설기·극제하는 오행이 용신으로 필요해요.',
  극왕: '일간이 극도로 강해요. 종강격 가능성이 있고 거스르는 기운은 크게 흉해요.',
}

function ElPill({ el, dim = false }: { el: string; dim?: boolean }) {
  const color = ohaengColor(el)
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
      paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: dim ? '#FAFAF7' : `${color}1A`,
      shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{el}</Text>
    </View>
  )
}

function StrengthDistChart({ levelIdx }: { levelIdx: number }) {
  const ML = 32, MB = 40, MT = 22
  const SVG_W = 300, SVG_H = 180
  const plotW = SVG_W - ML - 18
  const plotH = SVG_H - MB - MT
  const MAX_DIST = 30
  const yTicks = [0, 10, 20, 30]

  const pts = STRENGTH_DIST.map((d, i) => ({
    x: ML + (plotW / 7) * i,
    y: MT + plotH - (d / MAX_DIST) * plotH,
  }))
  const polylinePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const base = MT + plotH
  const areaPoints = `${pts[0].x.toFixed(1)},${base} ${polylinePoints} ${pts[pts.length - 1].x.toFixed(1)},${base}`
  const me = pts[levelIdx]
  const pctLabel = `${levelPercentile(LEVELS_8[levelIdx])}%의 사람`

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '800' }}>신강/신약지수</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>{pctLabel}이 여기에 해당해요</Text>
      </View>
      <Svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H}>
        <Rect x={me.x - (plotW / 7) / 2} y={MT} width={plotW / 7} height={plotH} fill="#EBE3D2" opacity="0.9" />
        {yTicks.map((tick) => {
          const yy = MT + plotH - (tick / MAX_DIST) * plotH
          return (
            <Line key={tick} x1={ML} y1={yy} x2={SVG_W - 10} y2={yy} stroke="#EBE3D2" strokeWidth="1" />
          )
        })}
        <Polygon points={areaPoints} fill={ACCENT} opacity="0.12" />
        <Polyline points={polylinePoints} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={ACCENT} strokeWidth="1.2" opacity="0.5" />
        ))}
        <Circle cx={me.x} cy={me.y} r="5" fill={ACCENT} stroke="white" strokeWidth="1.5" />
        <SvgText x={me.x} y={me.y - 9} textAnchor="middle" fontSize="11" fill={ACCENT} fontWeight="700">나</SvgText>
        {LEVELS_8.map((lv, i) => (
          <SvgText key={lv} x={ML + (plotW / 7) * i} y={SVG_H - 4} textAnchor="middle" fontSize="9"
            fill={i === levelIdx ? ACCENT : '#8A8270'} fontWeight={i === levelIdx ? '700' : '400'}>
            {lv}
          </SvgText>
        ))}
      </Svg>
    </View>
  )
}

export function StrengthSection({ data }: { data: SajuCalcResponse }) {
  const s = data.day_master_strength
  const y = data.yong_sin
  const score = clampScore(s.score)
  const levelDesc = LEVEL_DESCS[s.level_8] ?? ''
  const levelIdx = levelIndex(s.level_8)

  const deuk = [
    { label: '득령', on: s.deuk_ryeong },
    { label: '득지', on: s.deuk_ji },
    { label: '득시', on: s.deuk_si },
    { label: '득세', on: s.deuk_se },
  ]

  return (
    <BrutalCard>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>일간 강약 · 용신</Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1A1A1A' }}>{s.level_8}</Text>
        <Text style={{ fontSize: 14, color: '#8A8270' }}>{s.score}점</Text>
      </View>

      {levelDesc ? <Text style={{ fontSize: 12, color: '#8A8270', lineHeight: 18, marginBottom: 12 }}>{levelDesc}</Text> : null}

      {/* 8-step level bar */}
      <View style={{ flexDirection: 'row', overflow: 'hidden', borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A', marginBottom: 12 }}>
        {LEVELS_8.map((lv) => {
          const active = lv === s.level_8
          return (
            <View key={lv} style={{ flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: active ? '#FF6B00' : '#F0EDE6' }}>
              <Text style={{ fontSize: 9, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : '#8A8270' }}>{lv}</Text>
            </View>
          )
        })}
      </View>

      <StrengthDistChart levelIdx={levelIdx} />

      {/* Gauge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>약 0</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>중화 50</Text>
        <Text style={{ fontSize: 11, color: '#8A8270' }}>강 100</Text>
      </View>
      <View style={{ height: 10, backgroundColor: '#F0EDE6', borderRadius: 5, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${score}%`, backgroundColor: '#FFDE21', borderRadius: 5 }} />
        <View style={{ position: 'absolute', left: `${score}%`, top: 0, bottom: 0, width: 4, backgroundColor: '#FF6B00', borderRadius: 2, transform: [{ translateX: -2 }] }} />
      </View>

      {/* 득령/득지/득시/득세 */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {deuk.map((d) => (
          <View key={d.label} style={{
            flex: 1, borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
            paddingVertical: 4, alignItems: 'center',
            backgroundColor: d.on ? '#E0FAF8' : '#FAFAF7',
            opacity: d.on ? 1 : 0.5,
            shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: d.on ? '#00665F' : '#8A8270' }}>{d.label}</Text>
          </View>
        ))}
      </View>

      {/* 격국 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>격국</Text>
        <View style={{
          borderRadius: 8, borderWidth: 2, borderColor: '#1A1A1A',
          backgroundColor: '#FFDE21', paddingHorizontal: 10, paddingVertical: 4,
          shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A1A' }}>{data.gyeok_guk.name}</Text>
        </View>
        {data.gyeok_guk.basis ? <Text style={{ fontSize: 11, color: '#8A8270' }}>{data.gyeok_guk.basis}</Text> : null}
      </View>

      {/* 용신/희신/기신 */}
      <View style={{ gap: 8, borderTopWidth: 2, borderTopColor: '#E0D9CE', paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>용신</Text>
          <ElPill el={y.primary} />
          {y.secondary ? <ElPill el={y.secondary} dim /> : null}
          {y.yong_sin_label ? <Text style={{ fontSize: 11, color: '#8A8270' }}>{y.yong_sin_label}</Text> : null}
        </View>
        {(y.xi_sin?.length ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>희신</Text>
            {y.xi_sin.map((el) => <ElPill key={el} el={el} />)}
          </View>
        )}
        {(y.ji_sin?.length ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ width: 32, fontSize: 11, fontWeight: '700', color: '#8A8270' }}>기신</Text>
            {y.ji_sin.map((el) => <ElPill key={el} el={el} />)}
          </View>
        )}
      </View>
    </BrutalCard>
  )
}
