import { defineStore } from 'pinia'
import type { ChatSession, ChatMessage, ChatSessionCreate } from '~/types/chat'

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentMessages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)

  const auth = useAuthStore()
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  async function fetchSessions() {
    sessions.value = await auth.authFetch<ChatSession[]>(`${base}/api/chat/sessions`)
  }

  async function createSession(payload: ChatSessionCreate): Promise<ChatSession> {
    const session = await auth.authFetch<ChatSession>(`${base}/api/chat/session`, {
      method: 'POST',
      body: payload,
    })
    sessions.value.unshift(session)
    return session
  }

  async function fetchHistory(sessionId: string) {
    const data = await auth.authFetch<{ messages: ChatMessage[] }>(
      `${base}/api/chat/${sessionId}/history`
    )
    currentMessages.value = data.messages
  }

  async function sendMessage(sessionId: string, message: string): Promise<void> {
    currentMessages.value.push({ role: 'human', content: message })
    currentMessages.value.push({ role: 'ai', content: '' })
    const aiIdx = currentMessages.value.length - 1
    isStreaming.value = true

    const token = auth.token.value
    const response = await fetch(`${base}/api/chat/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    })

    if (!response.body) {
      isStreaming.value = false
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'token') {
            currentMessages.value[aiIdx].content += json.content
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
    isStreaming.value = false
  }

  function clearMessages() {
    currentMessages.value = []
  }

  return {
    sessions, currentMessages, isStreaming,
    fetchSessions, createSession, fetchHistory, sendMessage, clearMessages,
  }
})
