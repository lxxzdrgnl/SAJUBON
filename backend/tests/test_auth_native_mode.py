"""OAuth native 모드 — React Native 딥링크 토큰 반환.

OAuth 라이브 플로우(브라우저)는 자동 테스트 불가하므로 콜백에서
authorize_access_token / social_login을 모킹해 클라이언트별 분기만 검증한다.
"""

import pytest
from httpx import ASGITransport, AsyncClient

import routers.auth as auth_router
from core.config import settings
from main import app


def _patch_oauth(monkeypatch):
    """authorize_access_token / social_login을 모킹한다 (live 플로우 우회)."""

    async def _fake_authorize_access_token(request):
        return {"userinfo": {"email": "native@example.com", "sub": "native-sub-1"}}

    async def _fake_social_login(db, email, social_id):
        return "fake-access", "fake-refresh"

    monkeypatch.setattr(
        auth_router.oauth.google, "authorize_access_token", _fake_authorize_access_token
    )
    monkeypatch.setattr(auth_router, "social_login", _fake_social_login)


@pytest.mark.asyncio
async def test_login_native_marks_session(monkeypatch):
    """client=native 로그인은 세션에 native를 마킹하고 OAuth 리다이렉트한다."""
    captured = {}

    async def _fake_authorize_redirect(request, redirect_uri):
        captured["oauth_client"] = request.session.get("oauth_client")
        from fastapi.responses import RedirectResponse

        return RedirectResponse(url="https://accounts.google.com/o/oauth2/auth", status_code=302)

    monkeypatch.setattr(
        auth_router.oauth.google, "authorize_redirect", _fake_authorize_redirect
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/google", params={"client": "native"})
    assert r.status_code == 302
    assert captured["oauth_client"] == "native"


@pytest.mark.asyncio
async def test_login_web_marks_session(monkeypatch):
    """client=web 로그인은 세션에 web을 마킹한다 (회귀 방지)."""
    captured = {}

    async def _fake_authorize_redirect(request, redirect_uri):
        captured["oauth_client"] = request.session.get("oauth_client")
        from fastapi.responses import RedirectResponse

        return RedirectResponse(url="https://accounts.google.com/o/oauth2/auth", status_code=302)

    monkeypatch.setattr(
        auth_router.oauth.google, "authorize_redirect", _fake_authorize_redirect
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/google", params={"client": "web"})
    assert r.status_code == 302
    assert captured["oauth_client"] == "web"


@pytest.mark.asyncio
async def test_callback_native_returns_deeplink_fragment(monkeypatch, override_db):
    """native 콜백은 딥링크 프래그먼트로 토큰을 반환하고 쿠키는 심지 않는다."""
    _patch_oauth(monkeypatch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        # 세션에 native를 마킹한 채로 콜백을 호출하기 위해 SessionMiddleware 쿠키를
        # 직접 만들 수 없으므로, login 단계를 모킹해 세션을 세팅한다.
        async def _fake_authorize_redirect(request, redirect_uri):
            request.session["oauth_client"] = "native"
            from fastapi.responses import RedirectResponse

            return RedirectResponse(url="http://t/seeded", status_code=302)

        monkeypatch.setattr(
            auth_router.oauth.google, "authorize_redirect", _fake_authorize_redirect
        )
        await c.get("/api/auth/google", params={"client": "native"})

        r = await c.get("/api/auth/google/callback", follow_redirects=False)

    assert r.status_code == 302
    location = r.headers["location"]
    assert location.startswith("sajuguri://auth/callback#")
    fragment = location.split("#", 1)[1]
    assert "access_token=fake-access" in fragment
    assert "refresh_token=fake-refresh" in fragment
    assert f"expires_in={settings.jwt_expire_minutes * 60}" in fragment
    # native는 인증 쿠키(access_token/refresh_token)를 심지 않는다.
    # (SessionMiddleware의 session 쿠키 정리는 별개)
    joined = " ".join(r.headers.get_list("set-cookie"))
    assert "access_token=" not in joined
    assert "refresh_token=" not in joined


@pytest.mark.asyncio
async def test_callback_web_sets_cookies(monkeypatch, override_db):
    """web 콜백은 httpOnly 쿠키를 심고 web URL로 리다이렉트한다 (회귀 방지)."""
    _patch_oauth(monkeypatch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        async def _fake_authorize_redirect(request, redirect_uri):
            request.session["oauth_client"] = "web"
            from fastapi.responses import RedirectResponse

            return RedirectResponse(url="http://t/seeded", status_code=302)

        monkeypatch.setattr(
            auth_router.oauth.google, "authorize_redirect", _fake_authorize_redirect
        )
        await c.get("/api/auth/google", params={"client": "web"})

        r = await c.get("/api/auth/google/callback", follow_redirects=False)

    assert r.status_code == 302
    assert r.headers["location"] == f"{settings.web_url}/auth/done"
    joined = " ".join(r.headers.get_list("set-cookie"))
    assert "access_token=" in joined
    assert "refresh_token=" in joined


@pytest.mark.asyncio
async def test_callback_legacy_returns_query_tokens(monkeypatch, override_db):
    """레거시(클라이언트 미지정) 콜백은 쿼리 토큰 리다이렉트를 유지한다 (회귀 방지)."""
    _patch_oauth(monkeypatch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/google/callback", follow_redirects=False)

    assert r.status_code == 302
    location = r.headers["location"]
    assert location.startswith(f"{settings.frontend_url}/auth/callback?")
    assert "access_token=fake-access" in location
    assert "refresh_token=fake-refresh" in location
    joined = " ".join(r.headers.get_list("set-cookie"))
    assert "access_token=" not in joined
    assert "refresh_token=" not in joined
