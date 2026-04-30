<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useSajuStore } from '~/stores/saju'
import { useChatStore } from '~/stores/chat'
import type { SajuCalcRequest, ProfileResponse } from '~/types/saju'
import { iljuColor, formatIljuHanja, formatIljuLabel } from '~/utils/ganji'

const auth = useAuthStore()
const store = useSajuStore()
const config = useRuntimeConfig()
const base = config.public.apiBase

const profiles = ref<ProfileResponse[]>([])
const pending = ref(true)
const openingId = ref<number | null>(null)

async function fetchProfiles() {
  try {
    profiles.value = await auth.authFetch<ProfileResponse[]>(`${base}/api/profiles`)
  } finally {
    pending.value = false
  }
}

onMounted(fetchProfiles)

function iljuHanja(p: ProfileResponse) { return formatIljuHanja(p.day_stem, p.day_branch) }
function iljuLabel(p: ProfileResponse) { return formatIljuLabel(p.day_stem, p.day_branch) }

function birthLabel(p: ProfileResponse) {
  const [y, m, d] = p.birth_date.split('-')
  const cal = p.calendar === 'lunar' ? '음력' : '양력'
  return `${y}년 ${m}월 ${d}일 (${cal})`
}

const deletingId = ref<number | null>(null)
const repSettingId = ref<number | null>(null)

async function openProfile(p: ProfileResponse) {
  openingId.value = p.id
  const req: SajuCalcRequest = {
    name: p.name,
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    gender: p.gender as 'male' | 'female',
    calendar: p.calendar as 'solar' | 'lunar',
    is_leap_month: p.is_leap_month,
    city: p.city ?? undefined,
    birth_longitude: p.longitude ?? undefined,
  }
  try {
    await store.calculate(req)
    await navigateTo('/profile?saved=1')
  } finally {
    openingId.value = null
  }
}

async function deleteProfile(id: number) {
  if (!confirm('이 프로필을 삭제할까요?')) return
  deletingId.value = id
  try {
    await auth.authFetch(`${base}/api/profiles/${id}`, { method: 'DELETE' })
    profiles.value = profiles.value.filter(p => p.id !== id)
  } finally {
    deletingId.value = null
  }
}

async function setRepresentative(id: number) {
  repSettingId.value = id
  try {
    await auth.authFetch(`${base}/api/profiles/${id}/representative`, { method: 'PATCH' })
    profiles.value = profiles.value.map(p => ({ ...p, is_representative: p.id === id }))
  } finally {
    repSettingId.value = null
  }
}

const chatStore = useChatStore()
const chatStartingId = ref<number | null>(null)

async function startChatWithProfile(profileId: number) {
  chatStartingId.value = profileId
  try {
    const session = await chatStore.createSession({ profile_id: profileId })
    await navigateTo(`/chat/${session.id}`)
  } finally {
    chatStartingId.value = null
  }
}
</script>

<template>
  <div class="page-wrap">
    <h2 class="page-title">내 만세력</h2>

    <!-- 로딩 -->
    <div v-if="pending" class="loading">
      <LoadingSpinner />
    </div>

    <!-- 비어있음 -->
    <div v-else-if="!profiles.length" class="empty">
      <div class="empty-illust-box">
        <img src="/onboarding-illust.webp" alt="" class="empty-illust" />
      </div>
      <p class="empty-title">저장된 만세력이 없으시네요</p>
      <p class="empty-desc">생년월일시만 알면 내 사주 만세력을 바로 만들 수 있어요.</p>
      <NuxtLink to="/profile" class="btn-primary" style="margin-top: 8px; display: inline-flex; padding: 14px 28px;">
        만세력 보러가기
      </NuxtLink>
    </div>

    <!-- 목록 -->
    <div v-else class="profile-list">
      <div
        v-for="p in profiles"
        :key="p.id"
        class="profile-item"
        :class="{ 'is-rep': p.is_representative, 'is-opening': openingId === p.id }"
        @click="openProfile(p)"
      >
        <div class="profile-item-info">
          <div class="profile-item-top">
            <span class="profile-item-name">{{ p.name }}</span>
            <span v-if="p.is_representative" class="rep-badge">대표</span>
          </div>
          <span class="profile-item-birth">{{ birthLabel(p) }}</span>
          <span v-if="p.day_stem" class="profile-item-ilju">
            <span
              class="ilju-chars"
              :style="`color: ${iljuColor(p.day_stem_element)}`"
            >{{ iljuHanja(p) }}</span>
            <span
              class="ilju-animal-text"
              :style="`color: ${iljuColor(p.day_stem_element)}`"
            >{{ iljuLabel(p) }}</span>
          </span>
        </div>

        <div class="profile-item-actions" @click.stop>
          <button
            class="action-btn chat-btn"
            :disabled="chatStartingId === p.id"
            @click="startChatWithProfile(p.id)"
          >
            {{ chatStartingId === p.id ? '시작 중...' : 'AI 상담' }}
          </button>
          <button
            v-if="!p.is_representative"
            class="action-btn rep-btn"
            :disabled="repSettingId === p.id"
            @click="setRepresentative(p.id)"
          >
            {{ repSettingId === p.id ? '설정 중...' : '대표 설정' }}
          </button>
          <button
            class="action-btn del-btn"
            :disabled="deletingId === p.id"
            @click="deleteProfile(p.id)"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-muted);
  font-size: var(--fs-sub);
}

.empty-illust-box {
  width: 200px;
  height: 200px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  background: var(--surface-1);
  margin-bottom: 16px;
}

.empty-illust {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.3);
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
}

.empty-desc {
  font-size: var(--fs-sub);
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
}

.profile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--border-default);
  background: var(--surface-1);
  cursor: pointer;
  transition: background 0.15s;
}
.profile-item:hover {
  background: var(--surface-2);
}
.profile-item.is-rep {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface-1));
}
.profile-item.is-rep:hover {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-1));
}
.profile-item.is-opening {
  opacity: 0.6;
  pointer-events: none;
}

.profile-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.profile-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.profile-item-name {
  font-size: var(--fs-body);
  font-weight: 700;
  color: var(--text-primary);
}
.rep-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
}
.profile-item-birth {
  font-size: var(--fs-sub);
  color: var(--text-muted);
}
.profile-item-ilju {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.ilju-chars {
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-ganji);
}
.ilju-animal-text {
  font-size: var(--fs-sub);
  color: var(--text-secondary);
}

.profile-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  border-radius: 10px;
  font-family: inherit;
  transition: background 0.15s;
}
.rep-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  background: var(--surface-2);
  color: var(--text-secondary);
  white-space: nowrap;
}
.rep-btn:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}
.del-btn {
  width: 34px;
  height: 34px;
  background: color-mix(in srgb, #c04838 8%, transparent);
  color: #c04838;
}
.del-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #c04838 15%, transparent);
}
.del-btn svg {
  width: 16px;
  height: 16px;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chat-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  background: color-mix(in srgb, #6366f1 15%, transparent);
  color: #818cf8;
  white-space: nowrap;
}
.chat-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #6366f1 25%, transparent);
  color: #a5b4fc;
}
</style>
