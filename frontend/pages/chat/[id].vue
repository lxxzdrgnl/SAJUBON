<script setup lang="ts">
import { useChatStore } from '~/stores/chat'
import { useAuthStore } from '~/stores/auth'

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
  await store.fetchSessions()
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
