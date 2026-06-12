"""OAuth web 모드 — 로그아웃 쿠키 삭제 + refresh 쿠키 회전.

OAuth 라이브 플로우(브라우저)는 자동 테스트 불가하므로 ASGI 레벨에서
쿠키 set/clear와 refresh 동작만 검증한다.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from core.security import create_access_token
from crud.auth import create_token_pair
from main import app


@pytest_asyncio.fixture
async def db_refresh_token(db_user, test_sessionmaker):
    """db_user에 대한 활성 refresh_token 원문을 발급한다."""
    async with test_sessionmaker() as session:
        user = await session.get(type(db_user), db_user.id)
        _access, refresh = await create_token_pair(session, user)
        await session.commit()
    return refresh


@pytest.mark.asyncio
async def test_logout_clears_cookies(db_user):
    """쿠키 모드 로그아웃 응답이 access/refresh 쿠키를 삭제한다."""
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://t", cookies={"access_token": token}
    ) as c:
        r = await c.post("/api/auth/logout")
    assert r.status_code == 200
    set_cookie = r.headers.get_list("set-cookie")
    joined = " ".join(set_cookie)
    assert "access_token=" in joined
    assert "refresh_token=" in joined
    # delete_cookie → Max-Age=0 또는 빈 값 + 과거 만료
    assert "Max-Age=0" in joined or 'access_token="";' in joined or "access_token=;" in joined


@pytest.mark.asyncio
async def test_refresh_with_cookie_sets_new_cookies(db_refresh_token):
    """body 없이 refresh_token 쿠키만으로 갱신되고 새 쿠키가 내려온다 (web)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://t",
        cookies={"refresh_token": db_refresh_token},
    ) as c:
        r = await c.post("/api/auth/refresh")
    assert r.status_code == 200
    data = r.json()
    assert data["access_token"]
    assert data["refresh_token"]
    joined = " ".join(r.headers.get_list("set-cookie"))
    assert "access_token=" in joined
    assert "refresh_token=" in joined


@pytest.mark.asyncio
async def test_refresh_with_body_still_works(db_refresh_token):
    """레거시 body refresh_token 방식이 그대로 동작한다 (회귀 방지)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post("/api/auth/refresh", json={"refresh_token": db_refresh_token})
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_refresh_without_token_fails(override_db):
    """refresh_token이 어디에도 없으면 실패한다."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post("/api/auth/refresh")
    assert r.status_code >= 400
