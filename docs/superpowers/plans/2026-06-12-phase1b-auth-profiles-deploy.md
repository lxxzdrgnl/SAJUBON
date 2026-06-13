# Phase 1b — 인증(httpOnly 쿠키)·만세력 저장 목록·마이 탭·배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 또는 executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 구글 OAuth를 httpOnly 쿠키 방식으로 web에 연결하고, 만세력 서버 저장 목록·마이 탭을 구현하며, web 배포 파이프라인(GitHub Actions + 서버 compose)을 깐다.

**Architecture:** 백엔드 인증을 **추가형**으로 확장 — `get_current_user`가 Bearer 헤더(레거시 Nuxt용) **또는** `access_token` 쿠키(신규 web용)를 받는다. OAuth 콜백은 `client=web` 세션 플래그일 때 쿠키를 심고 web URL로 리다이렉트 (레거시 쿼리 방식은 그대로 유지 → Nuxt 무중단). dev에선 쿠키가 host-only(localhost — 포트 무관)라 8000↔3001 간 공유되고, prod는 리버스 프록시 동일 도메인.

**전제:** 현재 인증 코드 — `backend/routers/auth.py`(콜백이 `frontend_url`로 토큰 쿼리 리다이렉트), `backend/dependencies/auth.py`(`HTTPBearer`), `backend/core/security.py`(JWT). 프로필 API — `backend/routers/profiles.py` (POST/GET/대표설정/단건/삭제 완비, 백엔드 수정 불필요).

**사용자 작업 (코드 밖 — 별도 안내 필요):**
1. 구글 클라우드 콘솔에 승인된 리디렉션 URI 확인 (콜백은 백엔드 URI라 변경 없을 가능성 높음 — `settings.google_redirect_uri` 값 확인 후 판단)
2. GitHub 시크릿: 기존 `PC_SSH_*` 재사용 — 추가 불필요 확인
3. 서버 `~/servers/docker-compose.yml`에 web 서비스 추가 + NPM(리버스 프록시)에 테스트 서브도메인 — Task 7 산출물(스니펫)을 보고 SSH로 직접 적용

---

### Task 1: 백엔드 — 쿠키 폴백 인증 (TDD)

**Files:**
- Modify: `backend/dependencies/auth.py`
- Test: `backend/tests/test_auth_cookie.py` (신규)

- [ ] **Step 1: 실패하는 테스트** — 기존 테스트 픽스처 패턴(`backend/tests/` 확인)을 따라:

```python
import pytest
from httpx import ASGITransport, AsyncClient
from main import app
from core.security import create_access_token

@pytest.mark.asyncio
async def test_me_with_cookie(db_user):           # db_user: 기존 conftest 픽스처 확인 후 맞출 것
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/me", cookies={"access_token": token})
    assert r.status_code == 200
    assert r.json()["email"] == db_user.email

@pytest.mark.asyncio
async def test_bearer_still_works(db_user):       # 레거시 회귀 방지
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_no_credentials_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/me")
    assert r.status_code == 401
```

(conftest에 db_user 픽스처가 없으면 기존 테스트의 유저 생성 패턴을 따라 만들 것. DB 의존 테스트가 기존에 없다면 `get_current_user`를 단위 수준으로 테스트하도록 조정 — 기존 테스트 스타일 우선.)

- [ ] **Step 2: 구현** — `dependencies/auth.py`의 `get_current_user`에 쿠키 폴백:

```python
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    # 이하 기존 decode_access_token 로직 동일 (credentials.credentials → token 치환)
```

- [ ] **Step 3: 통과 + 기존 테스트 회귀 확인 + 커밋** — `feat: 인증에 httpOnly 쿠키 폴백 추가`

---

### Task 2: 백엔드 — OAuth 콜백 web 모드 + 로그아웃 쿠키 클리어

**Files:**
- Modify: `backend/routers/auth.py`, `backend/core/config.py`

- [ ] **Step 1: 설정 추가** — `config.py`에 `web_url: str = "http://localhost:3001"` (+ 쿠키 보안 플래그 `cookie_secure: bool = False` — prod env에서 true)

- [ ] **Step 2: 시작 엔드포인트에 client 플래그** — `/google`이 `?client=web`을 받으면 `request.session["oauth_client"] = "web"` 저장 (authlib이 이미 SessionMiddleware 요구 — main.py에서 존재 확인, 없으면 추가하되 기존 OAuth가 동작 중이므로 있을 것)

- [ ] **Step 3: 콜백 분기** — 기존 쿼리 리다이렉트는 유지하고 web 모드만 추가:

```python
    if request.session.pop("oauth_client", None) == "web":
        resp = RedirectResponse(url=f"{settings.web_url}/auth/done", status_code=302)
        common = dict(httponly=True, samesite="lax", secure=settings.cookie_secure, path="/")
        resp.set_cookie("access_token", access_token, max_age=60 * 30, **common)
        resp.set_cookie("refresh_token", refresh_token, max_age=60 * 60 * 24 * 14, **common)
        return resp
    # (기존 frontend_url 쿼리 리다이렉트 그대로)
```

max_age는 기존 토큰 만료 정책(`security.py`·config의 만료 설정값)을 읽고 일치시킬 것.

- [ ] **Step 4: `/logout`에 쿠키 삭제 추가** (`resp.delete_cookie(...)` 양쪽) — 기존 refresh 폐기 로직 유지

- [ ] **Step 5: `/refresh` 쿠키 모드** — body 없이 쿠키의 refresh_token도 허용, 응답으로 새 쿠키 set (기존 body 방식 유지)

- [ ] **Step 6: 수동 검증** (docker compose 백엔드로 — OAuth는 자동 테스트 불가):
`curl -i "http://localhost:8000/api/auth/google?client=web"` → 302 google 리다이렉트 확인. 풀 플로우는 Task 5 후 브라우저로.

- [ ] **Step 7: 커밋** — `feat: OAuth 콜백 web 모드 추가 (httpOnly 쿠키)`

---

### Task 3: api-client — auth·profiles 함수 (TDD)

**Files:**
- Create: `packages/api-client/src/auth.ts` + `auth.test.ts`, `packages/api-client/src/profiles.ts` + `profiles.test.ts`
- Modify: `packages/api-client/src/index.ts`, (필요 시) `types.ts`에 `MeResponse` 추가

- [ ] cities.ts 패턴 그대로:

```typescript
// auth.ts
import type { ApiClient } from './client'

export interface MeResponse { id: number; email: string; nickname: string | null }

export async function getMe(api: ApiClient): Promise<MeResponse | null> {
  try { return await api.get<MeResponse>('/api/auth/me') }
  catch { return null }   // 401 = 비로그인
}

export async function logout(api: ApiClient): Promise<void> {
  try { await api.post('/api/auth/logout') } catch { /* 이미 만료여도 무시 */ }
}
```

(`MeResponse` 필드는 `backend/routers/auth.py` `/me` 응답 스키마를 확인해 정확히 맞출 것.)

```typescript
// profiles.ts — ProfileResponse는 types.ts에 이미 존재
import type { ApiClient } from './client'
import type { ProfileResponse, SajuCalcRequest } from './types'

export function listProfiles(api: ApiClient): Promise<ProfileResponse[]> {
  return api.get('/api/profiles')
}
export function createProfile(api: ApiClient, body: SajuCalcRequest): Promise<ProfileResponse> {
  return api.post('/api/profiles', body)
}
```

(POST /api/profiles의 실제 요청 스키마는 `backend/schemas/`에서 확인 — SajuCalcRequest와 다르면 맞출 것.)

- [ ] 테스트: getMe 성공/401→null, listProfiles GET 경로, createProfile POST body — cities.test.ts 패턴. 커밋: `feat: api-client에 auth·profiles 함수 추가`

---

### Task 4: web — SSR 쿠키 포워딩 + 로그인 상태

**Files:**
- Create: `apps/web/lib/serverAuth.ts`
- Modify: `apps/web/lib/api.ts` (변경 없을 수도 — 검토)

- [ ] SSR에서 백엔드로 쿠키 전달하는 헬퍼:

```typescript
// lib/serverAuth.ts — 서버 컴포넌트 전용
import { cookies } from 'next/headers'
import { ApiClient, getMe, type MeResponse } from '@sajuguri/api-client'

const base = process.env.API_BASE ?? 'http://localhost:8000'

/** 요청 쿠키를 포워딩하는 서버용 ApiClient */
export async function serverAuthApi(): Promise<ApiClient> {
  const jar = await cookies()
  const header = jar.toString()
  const client = new ApiClient(base)
  // ApiClient에 헤더 주입 지점이 없으므로 fetch 래핑이 필요하면
  // api-client의 ApiClient 생성자에 defaultHeaders?: Record<string,string> 옵션을 추가하라 (Task 3에서 함께)
  return new ApiClient(base, { Cookie: header })
}

export async function currentUser(): Promise<MeResponse | null> {
  return getMe(await serverAuthApi())
}
```

이를 위해 **Task 3에서 `ApiClient` 생성자에 `defaultHeaders` 두 번째 인자(선택)를 추가**하고 request 시 병합 + 기존 테스트에 헤더 병합 케이스 1개 추가. (기존 호출부는 인자 1개 그대로 — 하위호환)

- [ ] `/auth/done` 페이지 — 콜백 후 착지: 단순히 홈으로 replace 리다이렉트하는 클라이언트 페이지 (`router.replace('/')`). 커밋: `feat: web SSR 쿠키 인증 헬퍼 추가`

---

### Task 5: web — 마이 탭

**Files:**
- Create: `apps/web/app/[locale]/my/page.tsx`, `apps/web/components/my/LogoutButton.tsx`
- Modify: messages (`my.*` ko/en)

- [ ] 서버 컴포넌트: `currentUser()` →
  - **비로그인**: 마스코트 + "로그인이 필요해요"(frontend/CLAUDE.md 문구 규칙) + [구글로 로그인] 버튼 = `<a href={api 백엔드 절대 URL + /api/auth/google?client=web}>` (rewrites 안 타는 풀 URL — `NEXT_PUBLIC_API_URL` env 추가, 기본 http://localhost:8000)
  - **로그인**: 프로필 카드(마스코트+이메일 마스킹) + 메뉴 리스트(내 리포트·운세 기록·공유 관리 = "준비 중" 비활성, 설정 자리) + LogoutButton(클라 — `logout(api)` 후 refresh)
- [ ] 이메일 마스킹 유틸 `lib/mask.ts` + 테스트 (`coop.plz.plz@gmail.com` → `coop***@gmail.com` 류)
- [ ] 커밋: `feat: 마이 탭 구현 (로그인·로그아웃·프로필 카드)`

---

### Task 6: web — 만세력 서버 저장 목록 + 저장 버튼

**Files:**
- Modify: `apps/web/app/[locale]/manse/page.tsx`, `apps/web/components/manse/RecentList.tsx`(필요 시), `apps/web/app/[locale]/manse/result/page.tsx`
- Create: `apps/web/components/manse/SavedList.tsx`, `apps/web/components/manse/SaveButton.tsx`

- [ ] `/manse` 페이지를 서버 컴포넌트화: `currentUser()` 확인 →
  - 로그인: `listProfiles(serverAuthApi)`로 **저장된 만세력 섹션**(브루탈 카드 — 이름·생년월일시·대표 뱃지, 탭=분석) 먼저, 그 아래 게스트 최근 입력 섹션 유지
  - 비로그인: 기존 그대로 + "매번 입력하기 번거로우시죠?" 로그인 유도 (CLAUDE.md 문구)
- [ ] 저장된 프로필 → 분석 동선: `ProfileResponse`의 birth 필드를 `/manse/result` 쿼리로 직렬화 (RecentList의 `toQuery` 로직을 `lib/manse/query.ts`로 추출·공용화 + 테스트)
- [ ] `SaveButton.tsx`(클라) — 분석 화면 하단: 로그인 상태에서만 노출(`currentUser()`를 result 페이지에서 조회해 prop으로), 클릭 시 `createProfile(api, 입력값)` → 성공 토스트 대신 버튼 라벨 "저장됨"으로 전환. 게스트면 미노출
- [ ] messages `manse.saved.*` ko/en. 커밋: `feat: 만세력 서버 저장 목록과 저장 버튼 추가`

---

### Task 7: 배포 — GitHub Actions + 서버 적용 가이드

**Files:**
- Create: `.github/workflows/deploy-web.yml`, `docs/deploy-web-server.md`

- [ ] `deploy-web.yml` — 기존 `deploy-frontend.yml` 패턴 복제·수정:

```yaml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'packages/**'
      - 'pnpm-lock.yaml'
      - '.github/workflows/deploy-web.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Setup SSH Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PC_SSH_KEY }}" > ~/.ssh/pc_key
          chmod 600 ~/.ssh/pc_key
          ssh-keyscan -H ${{ secrets.PC_SSH_HOST }} >> ~/.ssh/known_hosts
      - name: Deploy to server
        run: |
          ssh -i ~/.ssh/pc_key \
            ${{ secrets.PC_SSH_USER }}@${{ secrets.PC_SSH_HOST }} \
            "cd ~/servers/sajuguri/repo && \
             git fetch origin && git reset --hard origin/main && \
             docker compose -f ~/servers/docker-compose.yml build sajuguri-web && \
             docker compose -f ~/servers/docker-compose.yml up -d sajuguri-web"
```

(서버 compose 파일 경로·서비스명은 기존 `deploy-frontend.yml`의 실제 배포 명령을 읽고 동일 관례로 맞출 것 — 위는 형태 예시.)

- [ ] `docs/deploy-web-server.md` — 사용자가 SSH로 1회 적용할 체크리스트: ① 서버 compose에 `sajuguri-web` 서비스 스니펫(로컬 docker-compose.yml의 web 서비스 + `API_BASE=http://sajuguri-backend:8000`, 포트 3001) ② NPM에서 테스트 서브도메인 → 3001 프록시 ③ prod env: `WEB_URL`(쿠키 리다이렉트용)·`COOKIE_SECURE=true` ④ 컷오버 절차(나중): 프록시 타깃 전환 + frontend 서비스 제거
- [ ] 커밋 2개: `chore: web 배포 워크플로 추가` / `docs: web 서버 적용 가이드 추가`

---

### Task 8: 통합 검증

- [ ] `pnpm build && pnpm test && pnpm typecheck` + `cd backend && uv run pytest -q`
- [ ] 브라우저 수동 플로우 (docker compose 환경): 마이 탭 → 구글 로그인 → `/auth/done` → 마이에 이메일 표시 → 만세력 저장 → 목록 노출 → 로그아웃
- [ ] 레거시 회귀: Nuxt(3000) 로그인 플로우가 그대로 동작 (쿼리 리다이렉트 유지 확인)

## 완료 기준
쿠키 인증 E2E(수동) + 저장 목록 + 마이 탭 + deploy-web.yml. 서버 적용(②③)은 사용자 SSH 작업 후 종결.
