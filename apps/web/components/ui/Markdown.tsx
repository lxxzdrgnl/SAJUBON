'use client'

/**
 * Markdown — AI 프로즈 텍스트를 안전하게 렌더하는 무의존성 컴포넌트.
 *
 * 배경: 채팅·리포트·한줄상담의 AI 텍스트는 `**굵게**`·목록·`#제목` 같은 가벼운
 * 마크다운을 쓴다. 평문으로 렌더하면 기호가 raw로 보이므로 흔한 subset만
 * React 엘리먼트로 안전하게 변환한다.
 *
 * 안전성:
 *   - dangerouslySetInnerHTML·raw HTML 주입 없음. 모든 출력은 React 노드.
 *   - 인라인 토큰(굵게/기울임/인라인코드/링크)만 파싱하고 나머지는 텍스트로 escape.
 *   - 링크는 http/https/mailto만 허용(javascript: 등 스킴 차단).
 *
 * 스타일: design.md §2 토큰 클래스만 사용(text-ink·text-text-sub·border-border-soft 등).
 *   하드코딩 hex·arbitrary hex 없음 → check-colors --strict 통과.
 *   말풍선/카드 안에 들어가므로 컴팩트한 간격을 쓴다.
 *
 * 지원: 제목(#~######)·순서/비순서 목록·인용·문단·줄바꿈·수평선,
 *       인라인 굵게(**·__)·기울임(*·_)·인라인코드(`)·링크([text](url)).
 */
import { Fragment, type ReactNode } from 'react'

// ── 인라인 파서 ──────────────────────────────────────────────────────────────

const SAFE_URL = /^(https?:|mailto:)/i

/** 인라인 마크다운(굵게/기울임/코드/링크)을 React 노드 배열로 변환한다. */
function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let i = 0

  // 우선순위: 코드 → 링크 → 굵게 → 기울임. 매칭되는 가장 이른 토큰을 소비한다.
  while (rest.length > 0) {
    const code = rest.match(/`([^`]+)`/)
    const link = rest.match(/\[([^\]]+)\]\(([^)\s]+)\)/)
    const bold = rest.match(/(\*\*|__)(.+?)\1/)
    const italic = rest.match(/(\*|_)(?!\s)(.+?)(?<!\s)\1/)

    const candidates = [
      code && { type: 'code', m: code },
      link && { type: 'link', m: link },
      bold && { type: 'bold', m: bold },
      italic && { type: 'italic', m: italic },
    ].filter((c): c is { type: string; m: RegExpMatchArray } => Boolean(c && c.m.index !== undefined))

    if (candidates.length === 0) {
      nodes.push(rest)
      break
    }

    // 가장 앞에서 시작하는 토큰 선택
    candidates.sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0))
    const { type, m } = candidates[0]
    const idx = m.index ?? 0

    if (idx > 0) nodes.push(rest.slice(0, idx))
    const key = `${keyPrefix}-${i++}`

    if (type === 'code') {
      nodes.push(
        <code
          key={key}
          className="rounded bg-border-soft/40 px-1 py-0.5 font-mono text-[0.9em] text-ink"
        >
          {m[1]}
        </code>,
      )
    } else if (type === 'link') {
      const href = m[2]
      if (SAFE_URL.test(href)) {
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal-deep underline underline-offset-2"
          >
            {parseInline(m[1], key)}
          </a>,
        )
      } else {
        // 안전하지 않은 스킴은 링크 텍스트만 평문으로
        nodes.push(m[1])
      }
    } else if (type === 'bold') {
      nodes.push(
        <strong key={key} className="font-bold text-ink">
          {parseInline(m[2], key)}
        </strong>,
      )
    } else if (type === 'italic') {
      nodes.push(
        <em key={key} className="italic">
          {parseInline(m[2], key)}
        </em>,
      )
    }

    rest = rest.slice(idx + m[0].length)
  }

  return nodes
}

/** 한 텍스트 라인 안의 명시적 줄바꿈(\n 또는 두 칸 들여쓰기 줄바꿈)을 <br>로. */
function renderLine(line: string, key: string): ReactNode {
  return <Fragment key={key}>{parseInline(line, key)}</Fragment>
}

// ── 블록 파서 ────────────────────────────────────────────────────────────────

interface Block {
  type: 'heading' | 'ul' | 'ol' | 'quote' | 'hr' | 'p'
  level?: number
  items?: string[]
  lines?: string[]
}

/** 원문을 블록(제목·목록·인용·문단·수평선)으로 분리한다. */
function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: 'p', lines: para })
      para = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flushPara()
      continue
    }

    // 수평선
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara()
      blocks.push({ type: 'hr' })
      continue
    }

    // 제목
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      flushPara()
      blocks.push({ type: 'heading', level: h[1].length, lines: [h[2]] })
      continue
    }

    // 인용
    if (/^>\s?/.test(trimmed)) {
      flushPara()
      const items: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      i--
      blocks.push({ type: 'quote', lines: items })
      continue
    }

    // 비순서 목록
    if (/^\s*[-*+]\s+/.test(line)) {
      flushPara()
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      i--
      blocks.push({ type: 'ul', items })
      continue
    }

    // 순서 목록
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara()
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      i--
      blocks.push({ type: 'ol', items })
      continue
    }

    para.push(line)
  }
  flushPara()
  return blocks
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-2 mb-1 text-[1.15em] font-extrabold text-ink',
  2: 'mt-2 mb-1 text-[1.1em] font-extrabold text-ink',
  3: 'mt-2 mb-1 text-[1.05em] font-bold text-ink',
  4: 'mt-1.5 mb-1 font-bold text-ink',
  5: 'mt-1.5 mb-1 font-bold text-text-sub',
  6: 'mt-1.5 mb-1 font-bold text-text-sub',
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface Props {
  children: string
  /** 외곽 wrapper className (간격·문맥별 텍스트색 조정용) */
  className?: string
}

/** AI 마크다운 텍스트를 안전하게 React 엘리먼트로 렌더한다. */
export default function Markdown({ children, className = '' }: Props) {
  const blocks = parseBlocks(children ?? '')

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {blocks.map((b, bi) => {
        const key = `b${bi}`
        if (b.type === 'hr') {
          return <hr key={key} className="my-1 border-t border-border-soft" />
        }
        if (b.type === 'heading') {
          const Tag = `h${b.level}` as 'h1'
          return (
            <Tag key={key} className={HEADING_CLASS[b.level ?? 3]}>
              {renderLine(b.lines?.[0] ?? '', key)}
            </Tag>
          )
        }
        if (b.type === 'quote') {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-border-soft pl-3 text-text-sub italic"
            >
              {(b.lines ?? []).map((l, li) => (
                <span key={`${key}-${li}`} className="block">
                  {renderLine(l, `${key}-${li}`)}
                </span>
              ))}
            </blockquote>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={key} className="flex list-disc flex-col gap-1 pl-5 marker:text-text-sub">
              {(b.items ?? []).map((it, ii) => (
                <li key={`${key}-${ii}`}>{renderLine(it, `${key}-${ii}`)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={key} className="flex list-decimal flex-col gap-1 pl-5 marker:text-text-sub">
              {(b.items ?? []).map((it, ii) => (
                <li key={`${key}-${ii}`}>{renderLine(it, `${key}-${ii}`)}</li>
              ))}
            </ol>
          )
        }
        // 문단 — 내부 줄바꿈은 <br>로 보존
        return (
          <p key={key} className="leading-relaxed">
            {(b.lines ?? []).map((l, li) => (
              <Fragment key={`${key}-${li}`}>
                {li > 0 && <br />}
                {renderLine(l, `${key}-${li}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
