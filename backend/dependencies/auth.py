"""인증 의존성 — get_current_user / get_optional_user.

토큰 출처는 두 가지를 지원한다:
  1. Authorization: Bearer <token> 헤더 — 레거시 Nuxt 프론트
  2. access_token httpOnly 쿠키 — 신규 Next.js web

Bearer 헤더가 있으면 우선 사용하고, 없으면 쿠키로 폴백한다.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.security import decode_access_token
from db.models import User
from dependencies.db import get_db

bearer = HTTPBearer(auto_error=False)


def _extract_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    """Bearer 헤더 우선, 없으면 access_token 쿠키로 폴백."""
    if credentials:
        return credentials.credentials
    return request.cookies.get("access_token")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    try:
        user_id = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return user


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """로그인 선택적 엔드포인트용."""
    token = _extract_token(request, credentials)
    if not token:
        return None
    try:
        user_id = decode_access_token(token)
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except ValueError:
        return None
