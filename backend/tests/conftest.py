"""테스트 공용 픽스처.

대부분의 단위 테스트(엔진·파이프라인)는 DB가 필요 없다. 인증·프로필처럼
DB를 요구하는 테스트만 아래 픽스처를 사용한다.

로컬 postgres(127.0.0.1:5433)를 기본 대상으로 하되, TEST_DATABASE_URL 환경변수로
덮어쓸 수 있다. 각 테스트는 고유 이메일의 User를 만들고 끝나면 정리한다.
"""

import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from db.models import User
from dependencies.db import get_db
from main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rheon:localdev@127.0.0.1:5433/sajuguri",
)


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"statement_cache_size": 0},
        pool_pre_ping=True,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_sessionmaker(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def override_db(test_sessionmaker):
    """get_db 의존성을 테스트 세션으로 교체한다."""

    async def _get_db():
        async with test_sessionmaker() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def db_user(test_sessionmaker, override_db):
    """고유 이메일의 테스트 유저를 만들고 끝나면 정리한다."""
    email = f"test-{uuid.uuid4().hex[:12]}@example.com"
    async with test_sessionmaker() as session:
        user = User(email=email, provider="google", role="user")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        created_id = user.id

    async with test_sessionmaker() as session:
        result = await session.get(User, created_id)
        yield result

    async with test_sessionmaker() as session:
        await session.execute(delete(User).where(User.id == created_id))
        await session.commit()
