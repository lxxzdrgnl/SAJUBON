"""Google OAuth Authorization Code Flow + Refresh Token 인증.

authlib — OAuth 클라이언트 관리 (Google, Kakao 등 멀티 프로바이더 대응)
CSRF state는 Starlette SessionMiddleware 쿠키로 관리.
"""

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.config import Config

from core.config import settings
from core.exceptions import (
    DatabaseException,
    OAuthFailedException,
)
from crud.auth import revoke_all_tokens
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from services.auth import exchange_refresh_token, social_login

router = APIRouter(prefix="/api/auth", tags=["인증"])

# ─── OAuth 클라이언트 ──────────────────────────────────────────────────────────

_config = Config(
    environ={
        "GOOGLE_CLIENT_ID": settings.google_client_id,
        "GOOGLE_CLIENT_SECRET": settings.google_client_secret,
    }
)
oauth = OAuth(_config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
# 추후 추가 예시:
# oauth.register(name="kakao", ...)


# ─── Pydantic 스키마 ───────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


# ─── 쿠키 헬퍼 (신규 web — httpOnly 쿠키 모드) ───────────────────────────────────

# 쿠키 max_age는 토큰 만료 정책(core.config·core.security)과 일치시킨다.
_ACCESS_MAX_AGE = settings.jwt_expire_minutes * 60
_REFRESH_MAX_AGE = settings.refresh_token_expire_days * 24 * 60 * 60


def _cookie_kwargs() -> dict:
    return dict(httponly=True, samesite="lax", secure=settings.cookie_secure, path="/")


def _set_auth_cookies(resp: Response, access_token: str, refresh_token: str) -> None:
    common = _cookie_kwargs()
    resp.set_cookie("access_token", access_token, max_age=_ACCESS_MAX_AGE, **common)
    resp.set_cookie("refresh_token", refresh_token, max_age=_REFRESH_MAX_AGE, **common)


def _clear_auth_cookies(resp: Response) -> None:
    common = _cookie_kwargs()
    resp.delete_cookie("access_token", **common)
    resp.delete_cookie("refresh_token", **common)


# ─── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.get("/google", summary="Google OAuth 로그인 시작")
async def google_login(request: Request, client: str | None = None):
    # client=web 이면 콜백에서 httpOnly 쿠키 모드로 처리한다 (신규 Next.js web).
    # 그 외(레거시 Nuxt)는 기존 쿼리 토큰 리다이렉트를 유지한다.
    if client == "web":
        request.session["oauth_client"] = "web"
    else:
        request.session.pop("oauth_client", None)
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/callback", summary="Google OAuth 콜백")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise OAuthFailedException(str(e))

    user_info = token.get("userinfo")
    if not user_info:
        raise OAuthFailedException("userinfo를 가져올 수 없습니다.")

    email = user_info.get("email")
    social_id = user_info.get("sub")
    if not email:
        raise OAuthFailedException("이메일 정보가 없습니다.")

    try:
        access_token, refresh_token = await social_login(db, email, social_id)
    except Exception as e:
        raise DatabaseException(str(e))

    # 신규 web — httpOnly 쿠키를 심고 web URL로 리다이렉트.
    if request.session.pop("oauth_client", None) == "web":
        resp = RedirectResponse(url=f"{settings.web_url}/auth/done", status_code=302)
        _set_auth_cookies(resp, access_token, refresh_token)
        return resp

    # 레거시 Nuxt — 기존 쿼리 토큰 리다이렉트 그대로 유지.
    redirect_url = (
        f"{settings.frontend_url}/auth/callback"
        f"?access_token={access_token}"
        f"&refresh_token={refresh_token}"
    )
    return RedirectResponse(url=redirect_url, status_code=302)


@router.post("/refresh", response_model=TokenResponse, summary="Refresh Token으로 새 토큰 발급")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    body: RefreshRequest | None = None,
):
    # body의 refresh_token(레거시) 또는 쿠키(신규 web) 중 하나를 사용.
    raw_token = (body.refresh_token if body else None) or request.cookies.get("refresh_token")
    if not raw_token:
        raise OAuthFailedException("refresh_token이 없습니다.")

    access_token, new_refresh_token = await exchange_refresh_token(db, raw_token)

    # 쿠키로 들어온 요청이면 새 토큰도 쿠키로 갱신 (web 무중단 회전).
    if not (body and body.refresh_token):
        _set_auth_cookies(response, access_token, new_refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.jwt_expire_minutes * 60,
    )


@router.post("/logout", summary="로그아웃 — 모든 Refresh Token 폐기")
async def logout(
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await revoke_all_tokens(db, user.id)
    # web 쿠키 모드에서도 안전하게 삭제 (레거시 Bearer는 쿠키 없으니 무해).
    _clear_auth_cookies(response)
    return {"message": "로그아웃되었습니다.", "revoked_tokens": count}


@router.get("/me", summary="현재 로그인 유저 정보")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "provider": user.provider,
    }
