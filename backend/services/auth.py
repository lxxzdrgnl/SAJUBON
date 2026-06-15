"""Auth 서비스 — 소셜 로그인 + 토큰 재발급 흐름 제어."""

from __future__ import annotations
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import TokenExpiredException, UnauthorizedException
from core.security import hash_token
from crud import auth as auth_crud


async def social_login(
    db: AsyncSession, email: str, social_id: str, name: str | None = None
) -> tuple[str, str]:
    """
    소셜 로그인 — 유저 upsert + 토큰 쌍 발급을 단일 트랜잭션으로 처리한다.

    Returns:
        (access_token, refresh_token)
    """
    user = await auth_crud.get_or_create_user(db, email, social_id, name)
    access_token, refresh_token = await auth_crud.create_token_pair(db, user)
    await db.commit()
    return access_token, refresh_token


async def exchange_refresh_token(db: AsyncSession, raw_token: str) -> tuple[str, str]:
    """
    리프레시 토큰 재발급 — 검증 → 폐기 → 재발급을 단일 트랜잭션으로 처리한다.

    기존 토큰 폐기와 신규 토큰 저장이 하나의 commit으로 묶여
    서버 장애 시에도 원자성이 보장된다.

    Returns:
        (new_access_token, new_refresh_token)

    Raises:
        UnauthorizedException: 토큰이 존재하지 않거나 이미 폐기된 경우
        TokenExpiredException: 토큰이 만료된 경우
    """
    token_hash = hash_token(raw_token)
    stored = await auth_crud.get_active_refresh_token(db, token_hash)

    if not stored:
        raise UnauthorizedException()

    if stored.expires_at < datetime.now(timezone.utc):
        stored.revoked = True
        await db.commit()
        raise TokenExpiredException()

    stored.revoked = True

    user = await auth_crud.get_user_by_id(db, stored.user_id)
    if not user:
        raise UnauthorizedException()

    access_token, new_refresh_token = await auth_crud.create_token_pair(db, user)
    await db.commit()
    return access_token, new_refresh_token
