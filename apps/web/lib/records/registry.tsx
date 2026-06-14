import type { ReactNode } from 'react'
import {
  type ApiClient,
  type ReportSummary,
  type DailyRecordSummary,
  type ConsultationHistoryItem,
  type CompatibilityReportSummary,
  listReports,
  listDailyRecords,
  listConsultations,
  listCompatibilityReports,
  deleteReport,
  deleteDailyRecord,
  deleteConsultation,
  deleteCompatibilityReport,
} from '@sajuguri/api-client'

/**
 * 번역 함수 — next-intl `useTranslations`/`getTranslations`의 호출 시그니처 부분집합.
 * 레지스트리는 컴포넌트 밖(lib)에 있으므로 next-intl 타입을 직접 의존하지 않고
 * 최소 형태만 요구한다.
 */
export type Translate = (key: string, values?: Record<string, unknown>) => string

/**
 * 모든 레코드가 공유하는 최소 형태.
 * - id: 타입 내 고유 식별자
 * - createdAt: 시간순 정렬·표시용 ISO 문자열
 * - payload: 타입별 원본 요약 객체(renderCard·href에서 사용)
 */
export interface RecordItem<P = unknown> {
  id: number
  createdAt: string
  payload: P
}

/**
 * 콘텐츠 종류 1개를 기술하는 레지스트리 항목.
 * 새 콘텐츠 추가 = 이 배열에 항목 1개 등록(+ 목록 fetch). 허브·히스토리 코드는 불변.
 */
export interface RecordType<P = unknown> {
  /** 'saju' | 'fortune' | 'consultation' | 'compatibility' | ... */
  key: string
  /** i18n 라벨 (섹션 제목·필터 칩) */
  label: (t: Translate) => string
  /** 목록 조회 — 서버/클라이언트 어느 쪽 ApiClient든 동작 */
  fetch: (api: ApiClient) => Promise<RecordItem<P>[]>
  /** 상세 경로 */
  href: (item: RecordItem<P>) => string
  /** 카드 표현 */
  renderCard: (item: RecordItem<P>, t: Translate) => ReactNode
  /** 옵션: 프로필별 그룹 키 (없으면 단순 목록) */
  groupBy?: (item: RecordItem<P>) => string
  /** 빈 상태 안내 + CTA */
  empty: { message: (t: Translate) => string; ctaHref: string; ctaLabel: (t: Translate) => string }
  /** 옵션: 삭제. 정의된 타입만 편집 모드에서 휴지통 노출. */
  remove?: { fn: (api: ApiClient, id: number) => Promise<void>; label: (item: RecordItem<P>) => string }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── 카드 빌더 (registry.cards.tsx에서 주입) ───────────────────────────────────
//
// renderCard는 JSX를 반환하므로 .tsx 파일에서 정의한다. 순환 의존을 피하려고
// 카드 렌더러를 별도 모듈에서 가져온다.
import {
  SajuCard,
  FortuneCard,
  ConsultationCard,
  CompatibilityCard,
} from './cards'

// ── 레코드 타입 정의 ──────────────────────────────────────────────────────────

const sajuType: RecordType<ReportSummary> = {
  key: 'saju',
  label: (t) => t('tabReports'),
  fetch: async (api) => {
    const rows = await listReports(api)
    return rows.map((r) => ({ id: r.id, createdAt: r.created_at, payload: r }))
  },
  href: (item) => `/report/${item.id}`,
  renderCard: (item, t) => <SajuCard r={item.payload} t={t} />,
  groupBy: (item) => item.payload.profile_name || '',
  empty: { message: (t) => t('emptyReports'), ctaHref: '/manse', ctaLabel: (t) => t('goReport') },
  remove: { fn: deleteReport, label: (item) => item.payload.first_headline },
}

const fortuneType: RecordType<DailyRecordSummary> = {
  key: 'fortune',
  label: (t) => t('tabFortune'),
  fetch: async (api) => {
    const rows = await listDailyRecords(api)
    // DailyRecordSummary는 created_at이 없고 date(YYYY-MM-DD)를 정렬·표시 기준으로 쓴다.
    return rows.map((f) => ({ id: f.id, createdAt: f.date, payload: f }))
  },
  href: (item) => `/fortune?record=${item.id}`,
  renderCard: (item, t) => <FortuneCard f={item.payload} t={t} />,
  groupBy: (item) => item.payload.profile_name || '',
  empty: { message: (t) => t('emptyFortune'), ctaHref: '/', ctaLabel: (t) => t('goFortune') },
  remove: { fn: deleteDailyRecord, label: (item) => item.payload.keyword },
}

const consultationType: RecordType<ConsultationHistoryItem> = {
  key: 'consultation',
  label: (t) => t('tabQuestion'),
  fetch: async (api) => {
    const rows = await listConsultations(api)
    return rows.map((c) => ({ id: c.id, createdAt: c.created_at, payload: c }))
  },
  // 상담은 공유 토큰을 통해 열린다 — 토큰이 없으면 카드에서 발급 후 이동(ConsultationCard 내부 처리).
  href: (item) =>
    item.payload.share_token ? `/share/question/${item.payload.share_token}` : `/question`,
  // ConsultationCard uses useState/useRouter hooks — must render as JSX element, never as a direct function call.
  renderCard: (item, t) => <ConsultationCard c={item.payload} t={t} />,
  groupBy: (item) => item.payload.profile_name || '',
  empty: { message: (t) => t('emptyQuestion'), ctaHref: '/question', ctaLabel: (t) => t('goQuestion') },
  remove: { fn: deleteConsultation, label: (item) => item.payload.headline },
}

const compatibilityType: RecordType<CompatibilityReportSummary> = {
  key: 'compatibility',
  label: (t) => t('tabCompatibility'),
  fetch: async (api) => {
    const rows = await listCompatibilityReports(api)
    return rows.map((r) => ({ id: r.id, createdAt: r.created_at, payload: r }))
  },
  href: (item) => `/compatibility/${item.id}`,
  renderCard: (item, t) => <CompatibilityCard r={item.payload} t={t} />,
  // 두 사람이라 프로필 그룹핑 부적합 — 단순 목록.
  empty: { message: (t) => t('emptyCompatibility'), ctaHref: '/compatibility/new', ctaLabel: (t) => t('goCompatibility') },
  remove: {
    fn: deleteCompatibilityReport,
    label: (item) => `${item.payload.person_a_name ?? ''} ❤ ${item.payload.person_b_name ?? ''}`,
  },
}

/** 등록 배열 — 표시 순서이기도 하다. */
export const RECORD_TYPES: RecordType<any>[] = [
  sajuType,
  fortuneType,
  consultationType,
  compatibilityType,
]

/**
 * 모든 레코드 타입을 병렬 fetch해 `{ [key]: RecordItem[] }` 맵으로 반환한다.
 * 개별 타입 실패는 빈 배열로 흡수(백엔드 미완성·권한 등). 서버/클라이언트 공용.
 */
export async function fetchAllRecords(api: ApiClient): Promise<Record<string, RecordItem[]>> {
  const entries = await Promise.all(
    RECORD_TYPES.map(async (type) => {
      try {
        return [type.key, await type.fetch(api)] as const
      } catch {
        return [type.key, []] as const
      }
    }),
  )
  return Object.fromEntries(entries)
}

export { formatDate }
