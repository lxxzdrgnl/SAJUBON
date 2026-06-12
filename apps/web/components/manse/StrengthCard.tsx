import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'
import { LEVELS_8, STRENGTH_DIST, levelIndex, levelPercentile, clampScore } from '@/lib/manse/strength'

const ACCENT = '#FF6B00'

/** 일간 강약·용신 카드 — 8단계 레벨 바 + 분포 그래프 + 강약 게이지 + 득령/득지/득시/득세 + 용신/희신/기신 */
export default async function StrengthCard({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.strength')
  const s = data.day_master_strength
  const y = data.yong_sin
  const score = clampScore(s.score)
  const levelDesc = t.has(`levelDesc.${s.level_8}`) ? t(`levelDesc.${s.level_8}`) : ''

  const deuk: { label: string; on: boolean }[] = [
    { label: t('deukRyeong'), on: s.deuk_ryeong },
    { label: t('deukJi'), on: s.deuk_ji },
    { label: t('deukSi'), on: s.deuk_si },
    { label: t('deukSe'), on: s.deuk_se },
  ]

  function ElPill({ el, dim = false }: { el: string; dim?: boolean }) {
    const color = ohaengColor(el)
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-extrabold shadow-[2px_2px_0_#1A1A1A] ${dim ? 'bg-surface' : ''}`}
        style={dim ? undefined : { background: `${color}1A` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{el}</span>
      </span>
    )
  }

  return (
    <section className="rounded-2xl border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#1A1A1A]">
      <h3 className="mb-3 text-[15px] font-extrabold">{t('title')}</h3>

      {/* 레벨 + 점수 */}
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-lg font-black">{s.level_8}</span>
        <span className="text-sm text-text-sub">{s.score}{t('score')}</span>
      </div>

      {/* 레벨 설명 */}
      {levelDesc && <p className="mb-3 text-[12px] leading-relaxed text-text-sub">{levelDesc}</p>}

      {/* 8단계 레벨 바 — 현재 레벨 강조 (StrengthBar.vue 이식) */}
      <div className="mb-3 flex overflow-hidden rounded-lg border-2 border-ink">
        {LEVELS_8.map((lv) => {
          const active = lv === s.level_8
          return (
            <span
              key={lv}
              className={`flex-1 py-1.5 text-center text-[10px] font-bold ${active ? 'bg-orange font-extrabold text-white' : 'bg-[#F3EDDD] text-text-sub'}`}
            >
              {lv}
            </span>
          )
        })}
      </div>

      {/* 신강/신약지수 분포 그래프 — 실제 사주 분포 곡선 + 내 위치 (StrengthChart.vue 이식) */}
      <StrengthDistChart
        levelIdx={levelIndex(s.level_8)}
        title={t('distTitle')}
        meLabel={t('distMe')}
        unitLabel={t('distUnit')}
        percentile={t('distPercentile', { pct: levelPercentile(s.level_8) })}
      />

      {/* 강약 게이지 */}
      <div className="mb-1 flex justify-between text-[11px] text-text-sub">
        <span>{t('weak')} 0</span>
        <span>{t('mid')} 50</span>
        <span>{t('strong')} 100</span>
      </div>
      <div className="relative mb-3 h-2.5 overflow-hidden rounded-full bg-[#F3EDDD]">
        <i className="block h-full rounded-full" style={{ width: `${score}%`, background: '#FFB200' }} />
        <i className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-orange" style={{ left: `${score}%` }} />
      </div>

      {/* 득령·득지·득시·득세 칩 */}
      <div className="mb-3 flex gap-1.5">
        {deuk.map((d) => (
          <span
            key={d.label}
            className={`flex-1 rounded-lg border-2 border-ink py-1 text-center text-xs font-extrabold shadow-[2px_2px_0_#1A1A1A] ${d.on ? 'bg-teal-tint text-[#00665F]' : 'bg-surface text-text-sub opacity-50'}`}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* 격국 */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-text-sub">{t('gyeokGuk')}</span>
        <span className="rounded-lg border-2 border-ink bg-yellow px-2.5 py-1 text-xs font-extrabold shadow-[2px_2px_0_#1A1A1A]">{data.gyeok_guk.name}</span>
        {data.gyeok_guk.basis && <span className="text-[11px] text-text-sub">{data.gyeok_guk.basis}</span>}
      </div>

      {/* 용신 / 희신 / 기신 */}
      <div className="flex flex-col gap-2 border-t-[1.5px] border-dashed border-border-soft pt-3">
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[11px] font-bold text-text-sub">{t('yongSin')}</span>
          <ElPill el={y.primary} />
          {y.secondary && <ElPill el={y.secondary} dim />}
          {y.yong_sin_label && <span className="text-[11px] text-text-sub">{y.yong_sin_label}</span>}
        </div>
        {y.xi_sin?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] font-bold text-text-sub">{t('xiSin')}</span>
            <span className="flex flex-wrap gap-1.5">{y.xi_sin.map((el) => <ElPill key={el} el={el} />)}</span>
          </div>
        )}
        {y.ji_sin?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] font-bold text-text-sub">{t('jiSin')}</span>
            <span className="flex flex-wrap gap-1.5">{y.ji_sin.map((el) => <ElPill key={el} el={el} />)}</span>
          </div>
        )}
      </div>
    </section>
  )
}

/** 신강/신약지수 분포 그래프 — 면적 곡선 + 내 위치 강조 (StrengthChart.vue SVG 이식) */
function StrengthDistChart({
  levelIdx, title, meLabel, unitLabel, percentile,
}: {
  levelIdx: number
  title: string
  meLabel: string
  unitLabel: string
  percentile: string
}) {
  const ML = 32, MB = 40, MT = 22
  const SVG_W = 320, SVG_H = 188
  const plotW = SVG_W - ML - 18
  const plotH = SVG_H - MB - MT
  const MAX_DIST = 30
  const yTicks = [0, 10, 20, 30]

  const pts = STRENGTH_DIST.map((d, i) => ({
    x: ML + (plotW / 7) * i,
    y: MT + plotH - (d / MAX_DIST) * plotH,
  }))
  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const base = MT + plotH
  const areaPolygon = `${pts[0].x.toFixed(1)},${base} ${polyline} ${pts[pts.length - 1].x.toFixed(1)},${base}`
  const me = pts[levelIdx]

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-extrabold">{title}</span>
        <span className="text-[11px] text-text-sub">{percentile}</span>
      </div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
        {/* 내 위치 강조 컬럼 */}
        <rect x={me.x - (plotW / 7) / 2} y={MT} width={plotW / 7} height={plotH} fill="#F3EDDD" opacity={0.9} />
        {/* Y 그리드 */}
        {yTicks.map((tick) => {
          const yy = MT + plotH - (tick / MAX_DIST) * plotH
          return (
            <g key={tick}>
              <line x1={ML} y1={yy} x2={SVG_W - 10} y2={yy} stroke="#EBE3D2" strokeWidth={1} />
              <text x={ML - 4} y={yy + 4} textAnchor="end" fontSize={9} fill="#8A8270">{tick}</text>
            </g>
          )
        })}
        <text x={ML - 4} y={SVG_H - 2} textAnchor="end" fontSize={8} fill="#8A8270">{unitLabel}</text>
        {/* 면적 + 라인 */}
        <polygon points={areaPolygon} fill={ACCENT} opacity={0.12} />
        <polyline points={polyline} fill="none" stroke={ACCENT} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {/* 일반 점 */}
        {pts.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="white" stroke={ACCENT} strokeWidth={1.2} opacity={0.5} />
        ))}
        {/* 내 위치 점 + 라벨 */}
        <circle cx={me.x} cy={me.y} r={5} fill={ACCENT} stroke="white" strokeWidth={1.5} />
        <text x={me.x} y={me.y - 9} textAnchor="middle" fontSize={11} fill={ACCENT} fontWeight={700}>{meLabel}</text>
        {/* X축 라벨 */}
        {LEVELS_8.map((lv, i) => (
          <text
            key={lv}
            x={ML + (plotW / 7) * i}
            y={SVG_H - 4}
            textAnchor="middle"
            fontSize={9}
            fill={i === levelIdx ? ACCENT : '#8A8270'}
            fontWeight={i === levelIdx ? 700 : 400}
          >
            {lv}
          </text>
        ))}
      </svg>
    </div>
  )
}
