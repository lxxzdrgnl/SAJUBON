// frontend/types/{saju,chat}.ts에서 이식 (2026-06-12).
// 백엔드 schemas/*.py가 원천 — 변경 시 양쪽 동기화.

/** 사주 계산 요청 */
export interface SajuCalcRequest {
  name?: string             // 이름 (표시용)
  birth_date: string        // 'YYYY-MM-DD'
  birth_time: string | null // 'HH:MM' | null (시간 모름)
  gender: 'male' | 'female'
  calendar?: 'solar' | 'lunar'
  is_leap_month?: boolean
  birth_longitude?: number  // 출생지 경도 (진태양시 보정용)
  birth_utc_offset?: number // UTC 오프셋(분) — 해외 도시 전용, 한국은 생략
  city?: string             // 출생지 도시명 (표시용)
}

/** 기둥 하나 */
export interface Pillar {
  stem: string
  stem_hanja: string
  branch: string
  branch_hanja: string
  stem_element: string
  branch_element: string
  yin_yang: string
  ganji_name: string
  stem_ten_god: string
  branch_ten_god: string
  twelve_wun: string
  twelve_sin_sal: string
}

/** 일간 강약 */
export interface DayMasterStrength {
  score: number
  level: 'very_strong' | 'strong' | 'medium' | 'weak' | 'very_weak'
  level_8: string
  deuk_ryeong: boolean
  deuk_ji: boolean
  deuk_si: boolean
  deuk_se: boolean
}

/** 용신 */
export interface YongSin {
  primary: string
  secondary: string | null
  xi_sin: string[]
  ji_sin: string[]
  logic_type: string
  yong_sin_label: string
  reasoning_priority: string
}

/** 대운 한 구간 */
export interface DaeUnEntry {
  start_age: number
  end_age: number
  stem: string
  branch: string
  stem_element: string
  branch_element: string
  ganji_name: string
  stem_ten_god?: string
  branch_ten_god?: string
  twelve_wun?: string
}

/** 신살 */
export interface SinSal {
  name: string
  type: 'lucky' | 'neutral' | 'unlucky' | 'warning'
  priority: 'high' | 'medium' | 'low'
  location: string[]
  desc?: string
}

/** 공망 */
export interface GongMang {
  vacant_branches: string[]
  affected_pillars: string[]
}

/** 사주 계산 응답 */
export interface SajuCalcResponse {
  meta: {
    gender: string
    birth_date: string
    birth_time: string | null
    calendar: string
    time_correction_minutes: number
    applied_time: string
    timezone_note: string
    climate_vibe: {
      season: string
      temperature: string
      humidity: string
      month_element: string
      day_element_relation: string
    }
  }
  day_master_strength: DayMasterStrength
  yong_sin: YongSin
  gyeok_guk: { name: string; basis: string }
  year_pillar: Pillar
  month_pillar: Pillar
  day_pillar: Pillar
  hour_pillar: Pillar | null
  wuxing_count:     Record<string, number>
  wuxing_count_hap: Record<string, number>
  wuxing_chars:     { pillar: string; type: string; element: string }[]
  wuxing_hap_contributions: { pillar: string; type: string; hap_type: string | null; base_element: string; hap_element: string | null; hap_ratio: number }[]
  dominant_elements: string[]
  weak_elements: string[]
  yin_yang_ratio: { yang: number; yin: number }
  ten_gods_distribution: Record<string, number>
  ten_gods_void_info: Array<{ category: string; hidden_in_ji_jang_gan: Record<string, string[]> }>
  structure_patterns: unknown[]
  gong_mang: GongMang
  sin_sals: SinSal[]
  branch_relations: Record<string, unknown>
  ji_jang_gan: Record<string, string[]>
  dae_un_start_age: number
  dae_un_list: DaeUnEntry[]
  current_dae_un: DaeUnEntry
  dynamics: unknown
  synergy: unknown[]
  behavior_profile: unknown
  context_ranking: unknown
  life_domains: unknown
}

/** 월운 항목 */
export interface WolUnEntry {
  month: number
  stem: string
  branch: string
  stem_element: string
  branch_element: string
  ganji_name: string
  stem_ten_god: string
  branch_ten_god: string
  twelve_wun: string
}

/** 년운 항목 */
export interface YeonUnEntry {
  year: number
  stem: string
  branch: string
  stem_element: string
  branch_element: string
  ganji_name: string
  stem_ten_god: string
  branch_ten_god: string
  twelve_wun: string
}

/** 오늘의 운세 요청 */
export interface DailyFortuneRequest {
  birth_date: string
  birth_time: string | null
  gender: 'male' | 'female'
  calendar?: 'solar' | 'lunar'
  is_leap_month?: boolean
  birth_longitude?: number
  target_date?: string
}

/** 카테고리 운세 항목 */
export interface FortuneItem {
  score: number
  level: string
  text: string
  label: string
}

/** 옷 색깔 추천 */
export interface ClothingColor {
  color:   string
  element: string
  reason:  string
}

/** 오늘의 운세 응답 */
export interface DailyFortuneResponse {
  target_date:      string
  day_ganji:        { stem: string; branch: string }
  overall:          string
  caution:          string
  basis:            string
  clothing_color:   ClothingColor
  fortunes:         Record<string, FortuneItem>
  birth_day_pillar: { stem: string; branch: string; stem_element: string }
}

/** 일진 항목 */
export interface IlJinEntry {
  date: string
  stem: string
  branch: string
  ganji_name: string
  lunar_month: number
  lunar_day: number
  is_leap_month: boolean
  solar_term?: string
}

// ── 프로필 ──────────────────────────────────────────────────────────────────

/** 저장된 만세력 프로필 (Single Source of Truth — 모든 컴포넌트/페이지에서 이 타입 사용) */
export interface ProfileResponse {
  id: number
  name: string
  birth_date: string
  birth_time: string | null
  calendar: string
  gender: string
  is_leap_month: boolean
  city: string | null
  longitude: number | null
  is_representative: boolean
  day_stem: string | null
  day_branch: string | null
  day_stem_element: string | null
}

// ── 한줄 상담 ────────────────────────────────────────────────────────────────

export type QuestionCategory = 'career' | 'love' | 'money' | 'health' | 'general'

export interface QuestionRequest extends SajuCalcRequest {
  question: string
  category?: QuestionCategory  // 생략 시 백엔드 LLM이 자동 분류
}

/** 차트/칩 항목 — tool 이름 + 백엔드 payload */
export interface ToolChartItem {
  tool: string
  payload: Record<string, unknown>
}

export interface ConsultationResponse {
  id: number
  headline: string
  content: string
  category: string
  /** 자동 표시 차트 0~2개 */
  charts?: ToolChartItem[]
  /** 칩(더보기) 항목 2~4개 */
  more?: ToolChartItem[]
}

export interface ConsultationHistoryItem {
  id: number
  profile_name: string
  question: string
  category: string
  headline: string
  content: string
  created_at: string
  share_token: string | null
}

export interface ConsultationDetail {
  id: number
  name?: string | null
  birth_input?: Record<string, unknown> | null
  question: string
  category: string
  headline: string
  content: string
  /** 자동 표시 차트 (저장본 그대로) */
  charts?: ToolChartItem[]
  /** 칩(더보기) 항목 (저장본 그대로) */
  more?: ToolChartItem[]
  created_at: string
  share_token: string | null
}

// ── 채팅 ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string
  birth_info: Record<string, unknown>
  title: string | null
  created_at: string
  last_message_at: string
}

export interface ChatMessage {
  role: 'human' | 'ai' | 'tool'
  content: string
  /** role === 'tool' 일 때 tool 이름 */
  tool?: string
  /** role === 'tool' 일 때 차트 data */
  payload?: Record<string, unknown>
}

export interface ChatReport {
  id: number
  session_id: string
  summary: string
  key_insights: string[]
  advice: string[]
  topics_covered: string[]
  created_at: string
}

export interface ChatSessionCreate {
  profile_id?: number
  birth_date?: string
  birth_time?: string | null
  gender?: string
  calendar?: string
  is_leap_month?: boolean
}
