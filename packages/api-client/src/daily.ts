import type { ApiClient } from './client'
import type { SajuCalcRequest } from './types'

// ── 공통 API 계약 타입 (plan §트랙B — 변경 금지) ──────────────────────────────

export interface StoryCard {
  kind: 'intro' | 'overall' | 'category' | 'caution' | 'color' | 'summary'
  category_key?: string      // kind=category: exam|money|love|career|health|social
  title: string              // 질문 라벨 — "오늘의 금전운"
  score?: number             // overall·category만
  headline: string           // 큰 문구 — "지갑 열되 큰 건 멈춰"
  body: string               // 1~2문장 반말
}

export interface DailyStoryResponse {
  date: string
  day_ganji: { stem: string; branch: string }
  profile_name: string
  cards: StoryCard[]         // intro → overall → category×6 → caution → color → summary
  scores: Record<string, number>   // 요약 카드 바 렌더용 {exam: 87, ...}
  keyword: string            // 오늘의 키워드 — 요약 카드 타이포
  record_id: number | null   // 로그인 시 저장 레코드
  rewritten: boolean         // GPT 리라이트 성공 여부 (false = 템플릿 폴백)
}

export interface DailyStoryRequest {
  birth_input: SajuCalcRequest
  date: string               // YYYY-MM-DD (사용자 로컬 날짜)
  language?: 'ko'
}

export interface DailyRecordSummary {
  id: number
  date: string
  profile_name: string
  keyword: string
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * POST /api/daily/story — 운세 스토리 생성 (게스트 허용).
 * 로그인 + 동일 (user, birth해시, date) 레코드 → 저장본 반환.
 * 게스트 → 매 호출 생성 (클라가 localStorage 캐시로 1일 1회 보장).
 */
export function createDailyStory(
  api: ApiClient,
  body: DailyStoryRequest,
): Promise<DailyStoryResponse> {
  return api.post<DailyStoryResponse>('/api/daily/story', body)
}

/** GET /api/daily/records — 마이 운세 기록 (로그인). */
export function listDailyRecords(api: ApiClient): Promise<DailyRecordSummary[]> {
  return api.get<DailyRecordSummary[]>('/api/daily/records')
}

/** GET /api/daily/records/{id} — 저장본 재생 (소유자). */
export function getDailyRecord(api: ApiClient, id: number): Promise<DailyStoryResponse> {
  return api.get<DailyStoryResponse>(`/api/daily/records/${id}`)
}
