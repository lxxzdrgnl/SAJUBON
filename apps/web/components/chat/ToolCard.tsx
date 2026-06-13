'use client'

/**
 * 채팅 tool 결과 인라인 카드 (B4).
 * tool 이름 → 컴팩트 차트 컴포넌트 매핑.
 * 미매핑 tool은 렌더 생략 (텍스트만 표시).
 * 모든 데이터는 SSE payload에서 넘어온다.
 */

interface Props {
  tool: string
  payload: Record<string, unknown>
}

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
  const entries = (payload.entries ?? payload.wol_un_list ?? payload.yeon_un_list ?? []) as UnEntry[]

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

/** 일진 요약 */
function IlJinSummary({ payload }: { payload: Record<string, unknown> }) {
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

/** 궁합 점수 카드 */
function CompatibilityCard({ payload }: { payload: Record<string, unknown> }) {
  const score = (payload.score ?? payload.compatibility_score) as number | undefined
  const summary = (payload.summary ?? payload.description) as string | undefined

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

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  get_dae_un: '대운',
  get_wol_un: '월운',
  get_yeon_un: '연운',
  get_daily_fortune: '오늘의 운세',
  get_il_jin: '일진',
  get_compatibility_detail: '궁합',
}

/** 미매핑 tool → null 반환하면 렌더 생략 */
function renderContent(tool: string, payload: Record<string, unknown>) {
  switch (tool) {
    case 'get_dae_un':
      return <DaeUnMini payload={payload} />
    case 'get_wol_un':
      return <UnMini payload={payload} label="월운" />
    case 'get_yeon_un':
      return <UnMini payload={payload} label="연운" />
    case 'get_daily_fortune':
      return <FortuneScoreCard payload={payload} />
    case 'get_il_jin':
      return <IlJinSummary payload={payload} />
    case 'get_compatibility_detail':
      return <CompatibilityCard payload={payload} />
    default:
      return null
  }
}

export default function ToolCard({ tool, payload }: Props) {
  const content = renderContent(tool, payload)
  if (!content) return null

  const label = TOOL_LABELS[tool] ?? tool

  return (
    <div className="w-full rounded-2xl border-[1.5px] border-teal bg-teal-tint px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-teal-deep">
        {label}
      </p>
      {content}
    </div>
  )
}
