'use client'

/**
 * 스토리 단일 카드 렌더 — kind별 레이아웃 분기.
 * design.md §5.6:
 *   - intro: 마스코트 + 일진
 *   - overall/category: 점수 54px 오렌지 + 헤드라인 26px/900 + 본문
 *   - caution/color: 헤드라인 + 본문
 *   - summary: SummaryCard에서 처리
 * 이모지 없음, 힌트 문구 없음 (G2).
 */
import type { StoryCard as StoryCardType } from '@sajuguri/api-client'

const SCORE_COLOR = '#FF8A2E'  // design.md §2.4

interface Props {
  card: StoryCardType
  dayGanji: { stem: string; branch: string }
  profileName: string
}

export default function StoryCard({ card, dayGanji, profileName }: Props) {
  return (
    <div className="flex flex-1 flex-col px-6 py-4 select-none">
      {/* 질문 라벨 (14px) */}
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-white/60 uppercase">
        {card.title}
      </p>

      {/* intro: 마스코트 + 일진 */}
      {card.kind === 'intro' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" width={100} height={100} />
          <div className="text-center">
            <p className="text-[48px] font-black text-white leading-none" style={{ fontFamily: 'var(--font-serif-kr, serif)' }}>
              {dayGanji.stem}{dayGanji.branch}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-white/70">{profileName}의 오늘</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center">
            <p className="text-[20px] font-extrabold text-white leading-snug">{card.headline}</p>
            <p className="mt-2 text-[14px] text-white/75 leading-relaxed">{card.body}</p>
          </div>
        </div>
      )}

      {/* overall / category: 점수 + 헤드라인 + 본문 */}
      {(card.kind === 'overall' || card.kind === 'category') && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          {card.score !== undefined && (
            <p
              className="text-[54px] font-black leading-none"
              style={{ color: SCORE_COLOR }}
            >
              {card.score}
            </p>
          )}
          <p className="text-[26px] font-black text-white leading-tight">
            {card.headline}
          </p>
          <p className="text-[15px] text-white/80 leading-relaxed">
            {card.body}
          </p>
        </div>
      )}

      {/* caution / color: 헤드라인 + 본문 */}
      {(card.kind === 'caution' || card.kind === 'color') && (
        <div className="flex flex-1 flex-col justify-center gap-6">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <p className="text-[22px] font-extrabold text-white leading-snug">
              {card.headline}
            </p>
            <p className="mt-3 text-[15px] text-white/80 leading-relaxed">
              {card.body}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
