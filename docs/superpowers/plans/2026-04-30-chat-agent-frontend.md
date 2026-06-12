# 사주구리 채팅 Agent 구현 계획 (프론트엔드)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 에이전트 Vue/Nuxt 프론트엔드 구현 — 세션 목록 + 채팅 UI + SSE 스트리밍

**Architecture:** Nuxt 3 + Vue 3 Composition API. `/chat` (세션 목록+새 채팅), `/chat/[id]` (채팅 UI). SSE는 `EventSource` 또는 `fetch` streaming으로 처리. Pinia store에 세션/메시지 상태 관리.

**Tech Stack:** Vue 3, Nuxt 3, Pinia, Tailwind CSS

**Prerequisites:** 백엔드 계획 완료 (`2026-04-30-chat-agent-backend.md`)

---

## 파일 맵

### 신규 생성
| 파일 | 역할 |
|---|---|
| `frontend/pages/chat/index.vue` | 세션 목록 + 새 채팅 시작 |
| `frontend/pages/chat/[id].vue` | 채팅 UI (SSE 스트리밍) |
| `frontend/stores/chat.ts` | 세션/메시지 Pinia store |
| `frontend/types/chat.ts` | TypeScript 타입 정의 |

### 수정
| 파일 | 변경 |
|---|---|
| `frontend/pages/my-profiles.vue` | AI 상담하기 버튼 추가 |

---

## Task 1: TypeScript 타입 + Pinia Store

**Files:**
- Create: `frontend/types/chat.ts`
- Create: `frontend/stores/chat.ts`

- [ ] **Step 1: types/chat.ts 작성**

```typescript
// frontend/types/chat.ts

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
```

- [ ] **Step 2: stores/chat.ts 작성**

```typescript
// frontend/stores/chat.ts
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
    // 낙관적 업데이트
    currentMessages.value.push({ role: 'human', content: message })
    currentMessages.value.push({ role: 'ai', content: '' })
    const aiIdx = currentMessages.value.length - 1
    isStreaming.value = true

    const token = auth.accessToken
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
        const json = JSON.parse(line.slice(6))
        if (json.type === 'token') {
          currentMessages.value[aiIdx].content += json.content
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
```

- [ ] **Step 3: import 확인**

```bash
cd frontend && grep -r "useChatStore" . 2>/dev/null || echo "아직 사용 안 됨"
```

---

## Task 2: 채팅 페이지 (/chat/index.vue, /chat/[id].vue)

**Files:**
- Create: `frontend/pages/chat/index.vue`
- Create: `frontend/pages/chat/[id].vue`

- [ ] **Step 1: pages/chat/index.vue 작성**

```vue
<!-- frontend/pages/chat/index.vue -->
<script setup lang="ts">
import { useChatStore } from '~/stores/chat'
import { useAuthStore } from '~/stores/auth'
import type { ChatSessionCreate } from '~/types/chat'

const auth = useAuthStore()
const store = useChatStore()
const router = useRouter()

onMounted(() => store.fetchSessions())

async function startNewChat(payload: ChatSessionCreate) {
  const session = await store.createSession(payload)
  router.push(`/chat/${session.id}`)
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col items-center py-12 px-4">
    <h1 class="text-2xl font-bold mb-8">사주 AI 상담</h1>

    <!-- 새 상담 시작 -->
    <button
      class="mb-10 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
      @click="router.push('/my-profiles')"
    >
      + 새 상담 시작
    </button>

    <!-- 이전 대화 목록 -->
    <div class="w-full max-w-lg space-y-3">
      <p v-if="store.sessions.length === 0" class="text-gray-500 text-center">
        아직 상담 내역이 없습니다.
      </p>
      <nuxt-link
        v-for="s in store.sessions"
        :key="s.id"
        :to="`/chat/${s.id}`"
        class="block p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
      >
        <div class="flex justify-between items-center">
          <span class="font-medium">{{ s.title || '사주 상담' }}</span>
          <span class="text-xs text-gray-400">{{ formatDate(s.last_message_at) }}</span>
        </div>
      </nuxt-link>
    </div>
  </div>
</template>
```

- [ ] **Step 2: pages/chat/[id].vue 작성**

```vue
<!-- frontend/pages/chat/[id].vue -->
<script setup lang="ts">
import { useChatStore } from '~/stores/chat'

const route = useRoute()
const router = useRouter()
const store = useChatStore()
const sessionId = route.params.id as string

const input = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const showReport = ref(false)
const report = ref<any>(null)

const auth = useAuthStore()
const config = useRuntimeConfig()
const base = config.public.apiBase

onMounted(async () => {
  store.clearMessages()
  await store.fetchHistory(sessionId)
  scrollBottom()
})

async function send() {
  const msg = input.value.trim()
  if (!msg || store.isStreaming) return
  input.value = ''
  await store.sendMessage(sessionId, msg)
  scrollBottom()
}

function scrollBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

async function generateReport() {
  report.value = await auth.authFetch(`${base}/api/chat/${sessionId}/report`, {
    method: 'POST',
  })
  showReport.value = true
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="h-screen bg-gray-950 text-white flex">
    <!-- 사이드바: 세션 목록 -->
    <aside class="hidden md:flex w-64 flex-col bg-gray-900 p-4 border-r border-gray-800">
      <nuxt-link to="/chat" class="text-indigo-400 hover:text-indigo-300 mb-6 text-sm">
        ← 목록으로
      </nuxt-link>
      <p class="text-xs text-gray-500 mb-3 uppercase tracking-wider">이전 상담</p>
      <nuxt-link
        v-for="s in store.sessions"
        :key="s.id"
        :to="`/chat/${s.id}`"
        class="block py-2 px-3 rounded-lg text-sm mb-1 truncate"
        :class="s.id === sessionId ? 'bg-indigo-600' : 'hover:bg-gray-800 text-gray-400'"
      >
        {{ s.title || '사주 상담' }}
      </nuxt-link>
    </aside>

    <!-- 채팅 영역 -->
    <div class="flex-1 flex flex-col">
      <!-- 상단바 -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <nuxt-link to="/chat" class="md:hidden text-indigo-400 text-sm">← 목록</nuxt-link>
        <h2 class="font-semibold">사주 AI 상담</h2>
        <button
          class="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          @click="generateReport"
        >
          상담 리포트 생성
        </button>
      </header>

      <!-- 메시지 목록 -->
      <div ref="messagesEl" class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div
          v-for="(m, i) in store.currentMessages"
          :key="i"
          class="flex"
          :class="m.role === 'human' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
            :class="m.role === 'human'
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 rounded-bl-sm'"
          >
            <span v-if="!m.content && store.isStreaming" class="animate-pulse">▋</span>
            <span v-else>{{ m.content }}</span>
          </div>
        </div>
      </div>

      <!-- 입력창 -->
      <div class="px-6 py-4 border-t border-gray-800">
        <div class="flex gap-3 items-end">
          <textarea
            v-model="input"
            rows="1"
            placeholder="고민을 입력하세요..."
            class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-indigo-500 transition"
            :disabled="store.isStreaming"
            @keydown="handleKeydown"
          />
          <button
            class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-semibold text-sm transition"
            :disabled="store.isStreaming || !input.trim()"
            @click="send"
          >
            전송
          </button>
        </div>
      </div>
    </div>

    <!-- 리포트 모달 -->
    <div
      v-if="showReport && report"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="showReport = false"
    >
      <div class="bg-gray-900 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-bold">상담 리포트</h3>
        <p class="text-gray-300 text-sm leading-relaxed">{{ report.summary }}</p>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">핵심 인사이트</p>
          <ul class="space-y-1">
            <li v-for="(ins, i) in report.key_insights" :key="i" class="text-sm text-gray-200">
              • {{ ins }}
            </li>
          </ul>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">맞춤 조언</p>
          <ul class="space-y-1">
            <li v-for="(adv, i) in report.advice" :key="i" class="text-sm text-indigo-300">
              → {{ adv }}
            </li>
          </ul>
        </div>
        <button class="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm" @click="showReport = false">
          닫기
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/pages/chat/ frontend/stores/chat.ts frontend/types/chat.ts
git commit -m "feat: add chat UI pages and store"
```

---

## Task 3: my-profiles.vue에 AI 상담하기 버튼 추가

**Files:**
- Modify: `frontend/pages/my-profiles.vue`

- [ ] **Step 1: 프로필 카드에 버튼 추가**

각 프로필 카드의 액션 버튼 영역에 추가. 기존 "운세 보기", "공유" 등의 버튼 옆에 위치:

```vue
<!-- 기존 프로필 카드 버튼 그룹에 추가 -->
<button
  class="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
  @click="startChatWithProfile(p.id)"
>
  AI 상담
</button>
```

```typescript
// script setup에 추가
const router = useRouter()

async function startChatWithProfile(profileId: number) {
  const store = useChatStore()
  const session = await store.createSession({ profile_id: profileId })
  router.push(`/chat/${session.id}`)
}
```

- [ ] **Step 2: import 추가**

```typescript
// my-profiles.vue script setup 상단에 추가
import { useChatStore } from '~/stores/chat'
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/pages/my-profiles.vue
git commit -m "feat: add AI 상담하기 button to my-profiles"
```
