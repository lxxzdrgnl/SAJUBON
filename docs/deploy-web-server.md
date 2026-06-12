# Web(Next.js) 서버 적용 가이드

GitHub Actions(`deploy-web.yml`)는 main 푸시 시 서버에서 `git reset --hard` 후
`docker compose up -d --build --no-deps sajuguri-web`를 실행한다. 아래는 그 전제가
되는 **서버 1회 설정**이다. SSH로 직접 적용한다.

> 전환 기간 동안 레거시 Nuxt(`sajuguri-frontend`, 3000)와 신규 Next.js
> (`sajuguri-web`, 3001)가 공존한다. 컷오버 전까지 둘 다 떠 있어야 한다.

---

## ① 서버 compose에 `sajuguri-web` 서비스 추가

`~/servers/docker-compose.yml`에 아래 서비스를 추가한다. 빌드 컨텍스트는
모노레포 루트(`~/servers/sajuguri/repo`), Dockerfile은 `apps/web/Dockerfile`.

```yaml
  sajuguri-web:
    build:
      context: ./sajuguri/repo
      dockerfile: apps/web/Dockerfile
      args:
        # 빌드 타임 인라인 — 브라우저가 OAuth 시작을 직접 여는 백엔드 공개 URL.
        # /api/auth/google?client=web 링크에 사용된다 (rewrites 우회).
        NEXT_PUBLIC_API_URL: https://api.sajuguri.example   # ← 실제 백엔드 공개 도메인
    environment:
      # SSR이 컨테이너 네트워크로 백엔드를 호출할 때 쓰는 내부 주소.
      - API_BASE=http://sajuguri-backend:8000
    ports:
      - "3001:3000"
    depends_on:
      sajuguri-backend:
        condition: service_healthy
    restart: unless-stopped
```

`apps/web/Dockerfile`이 `NEXT_PUBLIC_API_URL`을 빌드 인자로 받도록 하려면
Dockerfile builder 스테이지에 다음을 추가한다(미적용 시 기본값 사용):

```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

> `NEXT_PUBLIC_*`는 빌드 시점에 번들에 박힌다. 런타임 environment로 바꿔도
> 클라이언트 코드에는 반영되지 않으므로 반드시 **build arg**로 넘긴다.

---

## ② NPM(Nginx Proxy Manager) 테스트 서브도메인 → 3001

전환 검증용 서브도메인(예: `web.sajuguri.example`)을 NPM에 등록하고
Forward Host/Port를 컨테이너 `sajuguri-web:3000` 또는 호스트 `127.0.0.1:3001`로
프록시한다. SSL(Let's Encrypt) 발급 후 HTTPS 강제.

쿠키가 동일 도메인에서 동작하도록, 백엔드와 web이 같은 상위 도메인을 쓰면
(`api.sajuguri.example` ↔ `web.sajuguri.example`) `samesite=lax` 쿠키가
정상 전달된다. 백엔드 콜백이 web 도메인으로 302 리다이렉트하므로
③의 `WEB_URL`을 그 도메인으로 맞춘다.

---

## ③ 백엔드 prod 환경변수 (쿠키 인증용)

`~/servers/sajuguri/repo/backend/.env`(또는 compose env)에 추가:

```dotenv
# OAuth web 모드 — 콜백이 httpOnly 쿠키를 심고 여기로 리다이렉트
WEB_URL=https://web.sajuguri.example
# HTTPS이므로 Secure 쿠키 강제
COOKIE_SECURE=true
```

적용 후 백엔드 재기동:

```bash
cd ~/servers && docker compose up -d --build --no-deps sajuguri-backend
```

검증: `curl -i "https://api.sajuguri.example/api/auth/google?client=web"` →
302 + `Location: https://accounts.google.com/...` 확인. 풀 플로우는 브라우저로
`https://web.sajuguri.example/my` → 구글 로그인 → `/auth/done` → 마이에 이메일 표시.

> 구글 클라우드 콘솔의 **승인된 리디렉션 URI**는 백엔드 콜백
> (`google_redirect_uri`, 기본 `.../api/auth/google/callback`)이므로 web
> 도메인을 추가할 필요는 없다. 백엔드 공개 도메인이 등록돼 있는지만 확인한다.

---

## ④ 컷오버 절차 (나중)

신규 web 검증이 끝나면:

1. NPM 메인 도메인(`sajuguri.example`)의 Forward 대상을
   `sajuguri-frontend:3000` → `sajuguri-web:3000`으로 전환
2. `WEB_URL`을 메인 도메인으로 변경 후 백엔드 재기동
3. `sajuguri-frontend`(레거시 Nuxt) 서비스 제거 + 컨테이너/이미지 정리
4. `deploy-frontend.yml` 워크플로 비활성화/삭제
```
