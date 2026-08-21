import { POOL, paletteFromBase } from '@/lib/fortune/story'

/**
 * 운세 스토리 배경 팔레트 검토 페이지 (/palette).
 * 풀의 모든 비비드 색을 배경 + 샘플 헤드라인/본문으로 렌더해 가독성·분위기를 확인한다.
 */
export default function PaletteReviewPage() {
  return (
    <main className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-[22px] font-black leading-tight text-ink">운세 배경 팔레트 검토</h1>
        <span className="mt-2 block h-1.5 w-12 rounded-full bg-orange" />
        <p className="mt-2 text-[13px] text-text-sub">
          총 {POOL.length}색. 운세마다(날짜+간지+이름) 셔플되어 한 운세 안에서는 색이 겹치지 않습니다.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {POOL.map((hex, i) => {
          const p = paletteFromBase(hex)
          return (
            <div
              key={hex}
              className="overflow-hidden rounded-2xl border-2 border-ink p-6 shadow-brutal"
              style={{ background: p.bg }}
            >
              <div
                className="mb-2 text-[13px] font-black tabular-nums"
                style={{ color: p.accent }}
              >
                {String(i + 1).padStart(2, '0')} · {hex}
              </div>
              <h2
                className="text-[24px] font-black leading-tight"
                style={{ color: p.ink, wordBreak: 'keep-all' }}
              >
                오늘은 흐름이 잘 받쳐주는 날
              </h2>
              <p
                className="mt-2 text-[15px] leading-relaxed"
                style={{ color: p.inkSoft, wordBreak: 'keep-all' }}
              >
                이 배경 위에서 헤드라인과 본문 글씨가 또렷하게 읽히는지, 분위기가 좋은지 확인해 주세요.
                포인트 색(번호)도 함께 봅니다.
              </p>
            </div>
          )
        })}
      </div>
    </main>
  )
}
