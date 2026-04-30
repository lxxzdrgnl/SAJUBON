export interface ChatSession {
  id: string
  birth_info: Record<string, unknown>
  title: string | null
  created_at: string
  last_message_at: string
}

export interface ChatMessage {
  role: 'human' | 'ai'
  content: string
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
