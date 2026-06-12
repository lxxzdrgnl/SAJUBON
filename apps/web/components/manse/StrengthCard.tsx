import { getTranslations } from 'next-intl/server'
import type { SajuCalcResponse } from '@sajuguri/api-client'
import { ohaengColor } from '@/lib/ohaeng'

/** 일간 강약·용신 카드 — 강약 게이지 + 득령/득지/득시/득세 칩 + 용신/희신/기신 (StrengthBar·YongSinBadge 이식) */
export default async function StrengthCard({ data }: { data: SajuCalcResponse }) {
  const t = await getTranslations('manse.charts.strength')
  const s = data.day_master_strength
  const y = data.yong_sin
  const score = Math.max(0, Math.min(100, s.score))

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
