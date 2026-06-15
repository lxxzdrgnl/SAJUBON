"""Auth CRUD 헬퍼 — 유저 upsert + 토큰 쌍 생성."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import create_access_token, generate_refresh_token, hash_token
from db.models import RefreshToken, User


async def get_or_create_user(
    db: AsyncSession, email: str, social_id: str, name: str | None = None
) -> User:
    """이메일로 유저를 조회하고 없으면 생성한다. commit은 호출자 책임.

    name(구글 프로필 닉네임)은 생성 시 저장하고, 기존 유저는 로그인할 때마다
    최신 구글 닉네임으로 동기화한다(닉네임이 바뀌면 반영).
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email, name=name, provider="google", social_id=social_id, role="user")
        db.add(user)
        await db.flush()
        await db.refresh(user)
    elif name and user.name != name:
        # 로그인 때마다 최신 구글 닉네임으로 동기화 (변경 반영 + 과거 미저장분 보강)
        user.name = name
        await db.flush()
    return user


async def create_token_pair(db: AsyncSession, user: User) -> tuple[str, str]:
    """액세스 토큰 + 리프레시 토큰 쌍을 준비하고 flush한다. commit은 호출자 책임."""
    access_token = create_access_token(user.id)
    refresh_token = generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    ))
    await db.flush()
    return access_token, refresh_token


async def get_active_refresh_token(db: AsyncSession, token_hash: str) -> RefreshToken | None:
    """폐기되지 않은 리프레시 토큰을 조회한다. 만료 여부는 호출자가 판단한다."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """ID로 유저를 조회한다."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def revoke_all_tokens(db: AsyncSession, user_id: int) -> int:
    """유저의 모든 활성 리프레시 토큰을 폐기한다. 단발 연산이므로 내부에서 commit한다."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    tokens = result.scalars().all()
    for t in tokens:
        t.revoked = True
    await db.commit()
    return len(tokens)
