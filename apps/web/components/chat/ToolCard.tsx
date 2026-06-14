'use client'

/**
 * 채팅 tool 결과 인라인 카드 (B4).
 * tool 이름 → 컴팩트 차트 컴포넌트 매핑.
 * 미매핑 tool은 렌더 생략 (텍스트만 표시).
 * 모든 데이터는 SSE payload에서 넘어온다 (payload 키 = 백엔드 _envelope data).
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Pillar, SinSal, DayMasterStrength, YongSin } from '@sajuguri/api-client'
import { ohaengColor, ohaengTintColor } from '@/lib/ohaeng'
import { toPercent, judge, balanceScore, balanceLabel, WUXING_ORDER } from '@/lib/manse/wuxing'
import { groupSummary, dominantGroups } from '@/lib/manse/tenGods'

// ── 컴팩트 서브 컴포넌트 ─────────────────────────────────────────────────────

/** 대운 미니 타임라인 */
function DaeUnMini({ payload }: { payload: Record<string, unknown> }) {
  const entries = (payload.dae_un_list ?? payload.entries ?? []) as Array<{
    start_age: number
    ganji_name?: string
    stem?: string
    branch?: string
    stem_element?: string
    branch_element?: string
  }>
  const currentDaeUn = payload.current_dae_un as { start_age?: number } | undefined
  const currentAge = (payload.current_start_age ?? currentDaeUn?.start_age) as number | undefined

  if (entries.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 pb-1">
        {entries.slice(0, 6).map((e) => {
          const isCurrent = currentAge !== undefined && e.start_age === currentAge
          return (
            <div
              key={e.start_age}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 px-2.5 py-1.5 text-center ${
                isCurrent
                  ? 'border-orange bg-orange-tint font-extrabold'
                  : 'border-border-soft bg-surface'
              }`}
            >
              <span className="text-[10px] text-text-sub">{e.start_age}세</span>
              <span className="font-serif text-[15px] font-bold leading-none">
                {e.stem ?? ''}{e.branch ?? ''}
              </span>
              <span className="text-[10px] text-text-sub">{e.ganji_name ?? ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 월운/연운 미니 바 */
function UnMini({ payload, label }: { payload: Record<string, unknown>; label: string }) {
  type UnEntry = { month?: number; year?: number; ganji_name?: string; stem?: string; branch?: string }
  // 백엔드 payload 키: 월운 → months, 연운 → years, 구버전 대비 fallback 유지
  const entries = (payload.months ?? payload.years ?? payload.entries ?? payload.wol_un_list ?? payload.yeon_un_list ?? []) as UnEntry[]

  if (entries.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-text-sub">{label}</p>
      <div className="flex gap-1.5 pb-1">
        {entries.slice(0, 12).map((e, i) => (
          <div
            key={i}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border border-border-soft bg-surface px-1.5 py-1"
          >
            {(e.month ?? e.year) !== undefined && (
              <span className="text-[9px] text-text-sub">{e.month ?? e.year}</span>
            )}
            <span className="font-serif text-[13px] font-bold leading-none">
              {e.stem ?? ''}{e.branch ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 오늘의 운세 점수 카드 */
function FortuneScoreCard({ payload }: { payload: Record<string, unknown> }) {
  const overall = (payload.overall ?? payload.summary) as string | undefined
  const score = payload.overall_score as number | undefined

  return (
    <div className="flex items-center gap-3">
      {score !== undefined && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-yellow text-[20px] font-extrabold">
          {score}
        </span>
      )}
      {overall && (
        <p className="text-sm leading-snug text-ink">{overall}</p>
      )}
    </div>
  )
}

/** 일진 달력 요약 — 오늘 날짜 항목(또는 첫 항목)을 강조 표시 */
function IlJinSummary({ payload }: { payload: Record<string, unknown> }) {
  type IlJinEntry = { date: string; stem: string; branch: string; ganji_name?: string; solar_term?: string | null }
  // payload 구조: {year, month, days: IlJinEntry[]}
  const days = (payload.days ?? []) as IlJinEntry[]

  // 오늘 날짜 항목을 강조, 없으면 첫 항목
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayEntry = days.find((d) => d.date === todayStr) ?? days[0]

  if (!todayEntry && !payload.stem) {
    // 구버전 flat payload fallback
    const date = payload.date as string | undefined
    const ganji = payload.ganji_name as string | undefined
    const stem = payload.stem as string | undefined
    const branch = payload.branch as string | undefined
    return (
      <div className="flex items-center gap-3">
        {date && <span className="text-xs text-text-sub">{date}</span>}
        <span className="font-serif text-xl font-extrabold">{stem}{branch}</span>
        {ganji && <span className="text-sm text-text-sub">{ganji}</span>}
      </div>
    )
  }

  const year = payload.year as number | undefined
  const month = payload.month as number | undefined

  return (
    <div className="flex flex-col gap-2">
      {/* 오늘 일진 강조 */}
      {todayEntry && (
        <div className="flex items-center gap-3">
          <span className="rounded-lg border-2 border-ink bg-yellow px-2 py-1 text-xs font-extrabold">{todayEntry.date}</span>
          <span className="font-serif text-xl font-extrabold">{todayEntry.stem}{todayEntry.branch}</span>
          {todayEntry.ganji_name && <span className="text-sm text-text-sub">{todayEntry.ganji_name}</span>}
          {todayEntry.solar_term && <span className="rounded-md bg-teal-tint px-1.5 py-0.5 text-[10px] font-extrabold text-teal-deep">{todayEntry.solar_term}</span>}
        </div>
      )}
      {/* 이달 일진 미니 그리드 (첫 14일) */}
      {days.length > 1 && (
        <div className="w-full min-w-0 overflow-x-auto">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-text-sub">
            {year}년 {month}월
          </p>
          <div className="flex gap-1 pb-1" style={{ width: 'max-content' }}>
            {days.slice(0, 14).map((d) => {
              const isToday = d.date === todayStr
              return (
                <div
                  key={d.date}
                  className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 text-center ${
                    isToday ? 'border-orange bg-orange-tint font-extrabold' : 'border-border-soft bg-surface'
                  }`}
                >
                  <span className="text-[9px] text-text-sub">{d.date.slice(8)}</span>
                  <span className="font-serif text-[12px] font-bold leading-none">{d.stem}{d.branch}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** 궁합 점수 카드 */
function CompatibilityCard({ payload }: { payload: Record<string, unknown> }) {
  const score = (payload.score ?? payload.compatibility_score ?? payload.total_score) as number | undefined
  const summary = (payload.summary ?? payload.description ?? payload.score_label) as string | undefined

  return (
    <div className="flex items-center gap-3">
      {score !== undefined && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-teal-tint text-[20px] font-extrabold text-teal-deep">
          {score}
        </span>
      )}
      {summary && <p className="text-sm leading-snug text-ink">{summary}</p>}
    </div>
  )
}

/** 오행 균형 — 5색 가로 바 (컴팩트). 합화 적용 토글 포함(만세력 차트와 동일). */
function WuxingMini({ payload }: { payload: Record<string, unknown> }) {
  const tw = useTranslations('manse.charts.wuxing')
  const hap = payload.wuxing_count_hap as Record<string, number> | undefined
  const raw = payload.wuxing_count as Record<string, number> | undefined
  const hasBoth = !!hap && !!raw
  const [applyHap, setApplyHap] = useState(true)
  const source = (applyHap ? hap : raw) ?? hap ?? raw
  if (!source) return null
  const pct = toPercent(source)
  const score = balanceScore(pct)
  const label = balanceLabel(score)

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-lg bg-ink px-2 py-0.5 text-[11px] font-black text-yellow">{score}/100</span>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
            label.tone === 'good'
              ? 'bg-teal-tint text-[#00665F]'
              : label.tone === 'mid'
                ? 'bg-yellow-tint text-[#6B5500]'
                : 'bg-orange-tint text-[#B34800]'
          }`}
        >
          {label.text}
        </span>
      </div>
      {/* 합에 따른 오행 변화 적용 토글 — 만세력 차트와 동일 */}
      {hasBoth && (
        <label className="mb-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-text-sub">
          <input
            type="checkbox"
            checked={applyHap}
            onChange={(e) => setApplyHap(e.target.checked)}
            className="h-3.5 w-3.5 accent-ink"
          />
          {tw('applyHap')}
        </label>
      )}
      {WUXING_ORDER.map((el) => {
        const color = ohaengColor(el)
        const v = judge(pct[el])
        return (
          <div key={el} className="mt-1 flex items-center gap-2 text-xs">
            <span className="w-4 font-black" style={{ color }}>{el}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-soft">
              <i className="block h-full rounded-full" style={{ width: `${Math.min(pct[el], 100)}%`, background: color }} />
            </div>
            <span className="w-8 text-right font-bold text-text-sub">{pct[el]}%</span>
            <span
              className={`w-8 rounded text-center text-[9px] font-extrabold ${
                v === '과다' ? 'text-[#B34800]' : v === '부족' ? 'text-[#00665F]' : 'text-text-sub'
              }`}
            >
              {v}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 십성 분포 — 그룹 요약 바 (컴팩트). TenGodsCard 요약 변형 */
function TenGodsMini({ payload }: { payload: Record<string, unknown> }) {
  const dist = (payload.ten_gods_distribution ?? {}) as Record<string, number>
  const summary = groupSummary(dist)
  const dominant = dominantGroups(dist)
  if (summary.length === 0) return null

  return (
    <div>
      {summary.map((g) => {
        const hot = dominant.includes(g.group)
        return (
          <div key={g.group} className="mt-1 flex items-center gap-2 text-xs">
            <span className={`w-10 shrink-0 font-black ${hot ? 'text-orange' : 'text-ink'}`}>{g.group}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-soft">
              <i className="block h-full rounded-full" style={{ width: `${Math.min(g.pct, 100)}%`, background: hot ? 'var(--orange)' : '#A09880' }} />
            </div>
            <span className="w-8 text-right font-bold text-text-sub">{g.pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

/** 신살 칩 목록 — 길신 틸 / 흉살 오렌지 */
function SinSalChips({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const sals = (payload.sin_sals ?? []) as SinSal[]
  if (sals.length === 0) return <p className="text-xs text-text-sub">{t('fields.none')}</p>

  return (
    <div className="flex flex-wrap gap-1.5">
      {sals.map((s) => {
        const good = s.type === 'lucky'
        const bad = s.type === 'unlucky' || s.type === 'warning'
        const tone = good
          ? 'bg-teal-tint text-[#00665F]'
          : bad
            ? 'bg-orange-tint text-[#B34800]'
            : 'bg-border-soft text-text-sub'
        return (
          <span key={s.name} className={`rounded-lg border-[1.5px] border-ink px-2 py-0.5 text-[11px] font-extrabold ${tone}`}>
            {s.name}
          </span>
        )
      })}
    </div>
  )
}

/** 사주팔자 원국 — 기둥 미니 카드 (천간/지지). PillarCard 변형 */
function PillarMini({ pillar, isDay }: { pillar?: Pillar | null; isDay?: boolean }) {
  if (!pillar) return null
  return (
    <div className="flex flex-1 flex-col gap-1">
      {(['stem', 'branch'] as const).map((kind) => {
        const kor = kind === 'stem' ? pillar.stem : pillar.branch
        const element = kind === 'stem' ? pillar.stem_element : pillar.branch_element
        const color = ohaengColor(element)
        const border = isDay && kind === 'stem' ? 'border-orange' : 'border-border-soft'
        return (
          <div
            key={kind}
            className={`rounded-lg border-2 ${border} px-1 py-1 text-center`}
            style={{ background: ohaengTintColor(element) }}
          >
            <span className="font-serif text-[16px] font-black leading-none" style={{ color }}>{kor}</span>
            <span className="ml-0.5 text-[9px] font-bold" style={{ color }}>{element}</span>
          </div>
        )
      })}
    </div>
  )
}

function PaljaMini({ payload }: { payload: Record<string, unknown> }) {
  const order: Array<[keyof typeof payload, boolean]> = [
    ['year_pillar', false],
    ['month_pillar', false],
    ['day_pillar', true],
    ['hour_pillar', false],
  ]
  const has = order.some(([k]) => payload[k])
  if (!has) return null

  return (
    <div className="flex gap-1.5">
      {order.map(([key, isDay]) => (
        <PillarMini key={String(key)} pillar={payload[key] as Pillar | null} isDay={isDay} />
      ))}
    </div>
  )
}

/** 강약 + 용신 — 게이지 + 칩. StrengthCard 변형 */
function StrengthMini({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const s = payload.day_master_strength as DayMasterStrength | undefined
  const y = payload.yong_sin as YongSin | undefined
  if (!s && !y) return null

  const score = s ? Math.max(0, Math.min(100, s.score)) : undefined

  function ElPill({ el }: { el: string }) {
    const color = ohaengColor(el)
    return (
      <span className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-ink px-1.5 py-0.5 text-[11px] font-extrabold" style={{ background: `${color}1A` }}>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{el}</span>
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {s && (
        <div>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-black">{s.level_8 || s.level}</span>
            {score !== undefined && <span className="text-[11px] text-text-sub">{score}</span>}
          </div>
          {score !== undefined && (
            <div className="relative h-2 overflow-hidden rounded-full bg-border-soft">
              <i className="block h-full rounded-full" style={{ width: `${score}%`, background: 'var(--yellow)' }} />
              <i className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-orange" style={{ left: `${score}%` }} />
            </div>
          )}
        </div>
      )}
      {y && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-text-sub">{t('fields.yongSin')}</span>
          {y.primary && <ElPill el={y.primary} />}
          {y.secondary && <ElPill el={y.secondary} />}
          {y.ji_sin?.length > 0 && (
            <>
              <span className="ml-1 text-[10px] font-bold text-text-sub">{t('fields.jiSin')}</span>
              {y.ji_sin.map((el) => <ElPill key={el} el={el} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** 12운성 — 4기둥 × 운성 라벨 스트립 */
function TwelveUnSeongMini({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const pillarsWun = (payload.pillars_wun ?? {}) as Record<string, { stem: string; branch: string; twelve_wun: string } | undefined>
  const order: Array<[string, string]> = [
    ['year_pillar', '연'],
    ['month_pillar', '월'],
    ['day_pillar', '일'],
    ['hour_pillar', '시'],
  ]
  const active = order.filter(([k]) => pillarsWun[k])
  if (active.length === 0) return null

  return (
    <div>
      <div className="flex gap-1.5">
        {active.map(([key, label]) => {
          const p = pillarsWun[key]!
          return (
            <div key={key} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] border-border-soft bg-surface px-1.5 py-2 text-center">
              <span className="text-[9px] font-bold text-text-sub">{label}주</span>
              <span className="font-serif text-base font-black leading-none text-ink">{p.stem}{p.branch}</span>
              <span className="mt-0.5 rounded-md bg-yellow-tint px-1.5 py-0.5 text-[10px] font-extrabold text-ink">{p.twelve_wun}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-text-sub">{t('hints.twelveUnSeong')}</p>
    </div>
  )
}

/** 합충 관계 — 활성 관계 타입별 컴팩트 표시 */
function HapChungMini({ payload, t }: { payload: Record<string, unknown>; t: ReturnType<typeof useTranslations> }) {
  const br = (payload.branch_relations ?? {}) as Record<string, unknown>
  const gm = (payload.gong_mang ?? { vacant_branches: [], affected_pillars: [] }) as {
    vacant_branches: string[]
    affected_pillars: string[]
  }

  type RelEntry = { label: string; items: string[] }
  const relations: RelEntry[] = []

  // 충
  const chung = br.chung as Array<{ pair?: string[]; pillars?: string[] }> | undefined
  if (chung?.length) {
    relations.push({ label: '충', items: chung.map((v) => (v.pair ?? []).join('↔')) })
  }
  // 육합
  const yukHap = br.yuk_hap as Array<{ pair?: string[]; element?: string; is_effective?: boolean }> | undefined
  if (yukHap?.length) {
    relations.push({
      label: '육합',
      items: yukHap.map((v) => {
        const pair = (v.pair ?? []).join('')
        const broken = v.is_effective === false ? '(파괴)' : ''
        return `${pair}합${broken}`
      }),
    })
  }
  // 삼합
  const samHap = br.sam_hap as Array<{ name?: string; branches?: string[] }> | undefined
  if (samHap?.length) {
    relations.push({ label: '삼합', items: samHap.map((v) => v.name ?? (v.branches ?? []).join('')) })
  }
  // 공망
  if (gm.affected_pillars.length) {
    const PLABEL: Record<string, string> = { year: '연', month: '월', day: '일', hour: '시' }
    relations.push({ label: '공망', items: gm.affected_pillars.map((p) => PLABEL[p] ?? p) })
  }

  const HAP_COLOR = '#00A86B'
  const CHUNG_COLOR = '#FF6B00'

  return (
    <div>
      {relations.length === 0 ? (
        <p className="text-xs text-text-sub">{t('fields.none')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {relations.map((rel) => (
            <div key={rel.label} className="flex flex-wrap items-center gap-1">
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
                style={{ color: rel.label === '충' || rel.label === '공망' ? CHUNG_COLOR : HAP_COLOR, background: `${rel.label === '충' || rel.label === '공망' ? CHUNG_COLOR : HAP_COLOR}1A` }}
              >
                {rel.label}
              </span>
              {rel.items.map((item, i) => (
                <span key={i} className="text-xs font-bold text-ink">{item}</span>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-text-sub">{t('hints.hapChung')}</p>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

/** 미매핑 tool → null 반환하면 렌더 생략 */
function renderContent(tool: string, payload: Record<string, unknown>, t: ReturnType<typeof useTranslations>) {
  switch (tool) {
    case 'get_dae_un':
      return <DaeUnMini payload={payload} />
    case 'get_wol_un':
      return <UnMini payload={payload} label={t('labels.get_wol_un')} />
    case 'get_yeon_un':
      return <UnMini payload={payload} label={t('labels.get_yeon_un')} />
    case 'get_daily_fortune':
      return <FortuneScoreCard payload={payload} />
    case 'get_il_jin':
      return <IlJinSummary payload={payload} />
    case 'get_compatibility_detail':
      return <CompatibilityCard payload={payload} />
    case 'get_wuxing_balance':
      return <WuxingMini payload={payload} />
    case 'get_ten_gods':
      return <TenGodsMini payload={payload} />
    case 'get_sin_sal':
      return <SinSalChips payload={payload} t={t} />
    case 'get_palja':
      return <PaljaMini payload={payload} />
    case 'get_strength':
      return <StrengthMini payload={payload} t={t} />
    case 'get_twelve_un_seong':
      return <TwelveUnSeongMini payload={payload} t={t} />
    case 'get_hap_chung':
      return <HapChungMini payload={payload} t={t} />
    default:
      return null
  }
}

interface Props {
  tool: string
  payload: Record<string, unknown>
}

export default function ToolCard({ tool, payload }: Props) {
  const t = useTranslations('chat.toolCard')
  const content = renderContent(tool, payload, t)
  if (!content) return null

  const label = t.has(`labels.${tool}`) ? t(`labels.${tool}`) : tool

  return (
    <div className="w-full min-w-0 rounded-2xl border-[1.5px] border-teal bg-teal-tint px-3 py-2.5 overflow-hidden">
      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-teal-deep">
        {label}
      </p>
      {content}
    </div>
  )
}
