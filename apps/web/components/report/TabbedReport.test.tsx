/**
 * TabbedReport — 정적 타입 계약 검증.
 * 런타임 DOM 렌더 없이 props 타입과 export가 올바른지만 확인한다
 * (vitest glob이 lib/** 이므로 직접 실행되지 않지만 tsc --noEmit로 검증됨).
 */
import type { TabbedReportProps } from './TabbedReport'
import type { ReportTab } from '@sajuguri/api-client'

// ReportTab 타입이 TabbedReportProps.tabs에 할당 가능한지 검증
const tab: ReportTab = {
  category: '갈등',
  headline: '속도가 다른 두 사람',
  content: '첫 문단\n\n두 번째 문단',
  requested: false,
}

// overview 슬롯(ReactNode)이 optional인지 검증
const propsWithOverview: TabbedReportProps = {
  tabs: [tab],
  overview: null,
  onShare: () => {},
  shareLabel: '공유',
  shareMode: false,
}

// overview 없이도 유효한지 검증
const propsWithoutOverview: TabbedReportProps = {
  tabs: [tab],
}

// shareMode=true 일 때 onShare 없이도 유효한지 검증
const propsShareMode: TabbedReportProps = {
  tabs: [],
  shareMode: true,
}

// 타입 단언 — 컴파일만 통과하면 됨
void propsWithOverview
void propsWithoutOverview
void propsShareMode
