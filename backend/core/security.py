"""JWT 발급 / 검증 + Refresh Token 유틸리티."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from core.config import settings


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    """token → user_id. 실패 시 ValueError."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError) as e:
        raise ValueError("유효하지 않은 토큰입니다.") from e


def generate_refresh_token() -> str:
    """URL-safe 랜덤 32바이트 Refresh Token 문자열 생성."""
    return secrets.token_urlsafe(32)


def generate_share_token() -> str:
    """추측 불가 짧은 공유 토큰 (URL-safe, ≈12자). 외부 의존성 0."""
    return secrets.token_urlsafe(9)


def hash_token(token: str) -> str:
    """Refresh Token SHA256 해시 (DB 저장용)."""
    return hashlib.sha256(token.encode()).hexdigest()
