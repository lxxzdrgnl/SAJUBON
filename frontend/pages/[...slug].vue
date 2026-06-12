<script setup lang="ts">
// Nuxt 3 SSR에서 throw createError()는 devalue 직렬화 버그를 유발함.
// 에러 시스템을 거치지 않고 일반 페이지로 404를 처리한다.
if (import.meta.server) {
  setResponseStatus(useRequestEvent()!, 404, '페이지를 찾을 수 없어요')
}

useHead({ title: '404 | 사주구리' })

const router = useRouter()
function goHome() { router.push('/') }
</script>

<template>
  <div class="not-found-root">
    <div class="not-found-card">
      <NuxtLink to="/" class="not-found-logo ganji">
        <span style="color: var(--text-primary);">사주</span><span style="color: var(--accent);">구리</span>
      </NuxtLink>
      <p class="not-found-code">404</p>
      <h1 class="not-found-title">페이지를 찾을 수 없어요</h1>
      <p class="not-found-sub">존재하지 않거나 삭제된 페이지입니다.</p>
      <button class="btn-primary not-found-btn" @click="goHome">
        홈으로 돌아가기
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-root {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-base);
}
.not-found-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 360px;
  width: 100%;
  padding: 48px 32px;
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 24px;
  text-align: center;
}
.not-found-logo {
  font-family: var(--font-ganji);
  font-size: 1.2rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.not-found-code {
  font-size: 4rem;
  font-weight: 900;
  color: var(--accent);
  line-height: 1;
  margin: 0;
  letter-spacing: -0.02em;
}
.not-found-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}
.not-found-sub {
  font-size: var(--fs-sub);
  color: var(--text-muted);
  margin: 0 0 8px;
  line-height: 1.6;
}
.not-found-btn {
  margin-top: 4px;
  width: 100%;
  max-width: 200px;
  padding: 13px 24px;
  cursor: pointer;
}
</style>
