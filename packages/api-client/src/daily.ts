import type { ApiClient } from './client'
import type { SajuCalcRequest } from './types'

// ── 공통 API 계약 타입 (plan §트랙B — 변경 금지) ──────────────────────────────

export interface StoryCard {
  /** 'color'는 구버전 저장 스냅샷 호환용 (신규는 action) */
  kind: 'intro' | 'overall' | 'category' | 'caution' | 'action' | 'color' | 'summary'
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
  language?: string          // 생성 언어 ('ko' | 'en'), 기본 'ko'
}

export interface DailyRecordSummary {
  id: number
  date: string
  profile_name: string
  keyword: string
}

export interface DailyShareRequest {
  story?: DailyStoryResponse        // 공유할 스토리 스냅샷
  birth_input?: SajuCalcRequest     // birth_hash 계산용 (선택)
  record_id?: number                // 기존 저장 기록 공유 (소유자, 토큰 재사용)
}

export interface DailyShareResponse {
  share_token: string               // 추측 불가 짧은 토큰
  share_url: string                 // 공개 공유 URL
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

/** DELETE /api/daily/records/{id} — 운세 기록 삭제 (소유자). 204 No Content */
export function deleteDailyRecord(api: ApiClient, id: number): Promise<void> {
  return api.delete(`/api/daily/records/${id}`)
}

/**
 * POST /api/daily/share — 운세 공유 링크 생성 (게스트 허용).
 * story 스냅샷 또는 record_id 중 하나를 보내면 추측 불가 토큰으로 저장.
 * 이미 토큰 있는 레코드는 재사용.
 */
export function createFortuneShare(
  api: ApiClient,
  body: DailyShareRequest,
): Promise<DailyShareResponse> {
  return api.post<DailyShareResponse>('/api/daily/share', body)
}

/**
 * GET /api/daily/shared/{token} — 공유된 운세 공개 조회 (인증 불필요).
 * 저장된 스냅샷을 그대로 반환 (재계산 없음).
 */
export function getSharedFortune(
  api: ApiClient,
  token: string,
): Promise<DailyStoryResponse> {
  return api.get<DailyStoryResponse>(`/api/daily/shared/${token}`)
}
