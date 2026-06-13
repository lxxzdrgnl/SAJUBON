"""인증 — httpOnly 쿠키 폴백 + 레거시 Bearer 회귀."""

import pytest
from httpx import ASGITransport, AsyncClient

from core.security import create_access_token
from main import app


@pytest.mark.asyncio
async def test_me_with_cookie(db_user):
    """access_token 쿠키만으로 /me 인증된다 (신규 web)."""
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://t", cookies={"access_token": token}
    ) as c:
        r = await c.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == db_user.email


@pytest.mark.asyncio
async def test_bearer_still_works(db_user):
    """레거시 Bearer 헤더 인증이 그대로 동작한다 (Nuxt 회귀 방지)."""
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == db_user.email


@pytest.mark.asyncio
async def test_no_credentials_401(override_db):
    """자격 증명이 없으면 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_bearer_takes_precedence_over_cookie(db_user):
    """Bearer 헤더가 있으면 우선 사용한다 (쿠키와 공존)."""
    token = create_access_token(db_user.id)
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://t", cookies={"access_token": "garbage"}
    ) as c:
        r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == db_user.email
