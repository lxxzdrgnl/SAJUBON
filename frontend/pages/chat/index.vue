<script setup lang="ts">
import { useChatStore } from '~/stores/chat'

const store = useChatStore()
const router = useRouter()

onMounted(() => store.fetchSessions())

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col items-center py-12 px-4">
    <h1 class="text-2xl font-bold mb-8">사주 AI 상담</h1>

    <button
      class="mb-10 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
      @click="router.push('/my-profiles')"
    >
      + 새 상담 시작
    </button>

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
