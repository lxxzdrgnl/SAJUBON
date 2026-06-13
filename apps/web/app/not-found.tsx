import './globals.css'

/** 루트 폴백 404 — 로케일 밖 경로용. 루트 레이아웃이 없어 html/body를 자체 제공. */
export default function RootNotFound() {
  return (
    <html lang="ko">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-ink bg-yellow shadow-[4px_4px_0_#1A1A1A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.svg" alt="" width={64} height={64} />
          </div>
          <p className="text-[64px] font-black leading-none text-ink">404</p>
          <div>
            <p className="text-lg font-extrabold">페이지를 찾을 수 없어요</p>
            <p className="mt-1 text-sm text-text-sub">주소가 잘못됐거나 사라진 페이지예요.</p>
          </div>
          <a
            href="/"
            className="rounded-xl border-2 border-ink bg-yellow px-6 py-3 text-sm font-black shadow-[4px_4px_0_#1A1A1A]"
          >
            홈으로 가기
          </a>
        </main>
      </body>
    </html>
  )
}
