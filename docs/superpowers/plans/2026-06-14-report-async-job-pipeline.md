# 리포트 비동기 Job 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사주·궁합 리포트 생성을 동기 블로킹에서 arq+redis 기반 비동기 Job 모델로 전환하고, Expo 푸시 발송 토대까지 구현한다.

**Architecture:** `POST`가 `generation_jobs` 행을 만들고 arq로 enqueue 후 `202 {job_id}` 즉시 반환. 별도 arq 워커 프로세스가 백그라운드에서 기존 파이프라인을 돌려 리포트를 저장하고 job 상태를 갱신한 뒤 푸시 훅을 호출한다. 상태의 진실은 Postgres `generation_jobs`이고 redis는 큐 전달 전용. 프론트는 로딩 화면을 유지한 채 `GET /api/jobs/{id}`를 폴링한다.

**Tech Stack:** FastAPI(3-layer), SQLAlchemy 2.0 async, Alembic, arq(redis 큐), httpx(Expo Push), pytest/pytest-asyncio, Next.js 15(App Router), @sajuguri/api-client.

**기준 스펙:** `docs/superpowers/specs/2026-06-14-report-async-job-pipeline.md`

**브랜치:** `dev` (현재 체크아웃됨). 모든 커밋은 dev에서.

**커밋 규칙:** Co-Authored-By 금지, scope 괄호 금지, 독립 변경은 분리 커밋.

---

## 테스트 실행 방법 (모든 백엔드 태스크 공통)

백엔드 테스트는 로컬 postgres(5433)가 필요하다. 실행 커맨드:

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend
UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/<파일> -v
```

프론트 타입체크:

```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit
```

---

## File Structure

**백엔드 — 신규**
- `backend/db/models.py` (수정) — `GenerationJob`, `DeviceToken` 모델 추가
- `backend/alembic/versions/0015_add_generation_jobs_and_device_tokens.py` — 마이그레이션
- `backend/crud/generation_jobs.py` — job CRUD (상태 전이·활성 조회·스윕)
- `backend/crud/device_tokens.py` — 디바이스 토큰 CRUD
- `backend/schemas/jobs.py` — `JobCreatedResponse`, `JobStatusResponse`
- `backend/schemas/devices.py` — `DeviceRegisterRequest`
- `backend/dependencies/arq.py` — `get_arq` 의존성
- `backend/services/jobs.py` — job 조회 서비스 + 활성-job 규칙 헬퍼
- `backend/services/generation_runner.py` — 워커가 호출하는 실제 생성 로직(사주·궁합)
- `backend/services/notifications.py` — Expo 푸시 발송
- `backend/worker.py` — arq WorkerSettings + 태스크 함수 + 스윕 cron
- `backend/routers/jobs.py` — `GET /api/jobs/{id}`
- `backend/routers/devices.py` — `POST /api/devices`

**백엔드 — 수정**
- `backend/core/config.py` — redis/worker/expo 설정
- `backend/pyproject.toml` — `arq` 의존성
- `backend/services/reports.py` — `create_report` → job 생성+enqueue
- `backend/services/compatibility.py` — `create_report`/`create_from_session` → job 생성+enqueue
- `backend/routers/reports.py` — POST 202 `{job_id}`
- `backend/routers/compatibility.py` — POST 202 `{job_id}`
- `backend/main.py` — arq 풀 lifespan + jobs/devices 라우터 등록

**프론트 — 신규/수정**
- `packages/api-client/src/jobs.ts` (신규) — `createReportJob`, `createCompatibilityJob`, `createCompatibilityJobFromSession`, `getJob`
- `packages/api-client/src/devices.ts` (신규) — `registerDeviceToken`
- `packages/api-client/src/index.ts` (수정) — export 추가
- `apps/web/lib/hooks/useGenerationJob.ts` (신규) — 폴링 훅
- `apps/web/app/[locale]/report/new/page.tsx` (수정)
- `apps/web/app/[locale]/compatibility/new/page.tsx` (수정)
- `apps/web/components/chat/CompatibilityReportCTA.tsx` (수정)

**배포**
- `~/servers/docker-compose.yml` (서버, 레포 밖) — `sajuguri-worker` 서비스
- `backend.env` + `BACKEND_ENV` 시크릿 — `REDIS_URL`

---

## Task 1: arq 의존성 추가 + 설정

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/core/config.py`
- Test: `backend/tests/test_async_job_config.py` (Create)

- [ ] **Step 1: `pyproject.toml`에 arq 추가**

`dependencies = [` 리스트 안, `"httpx>=0.28.1",` 줄 아래에 추가:

```toml
    "arq>=0.26.0",
```

- [ ] **Step 2: 의존성 설치**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv sync
```
Expected: arq 및 redis(arq 의존) 설치 완료.

- [ ] **Step 3: 실패하는 설정 테스트 작성**

Create `backend/tests/test_async_job_config.py`:

```python
"""비동기 job 파이프라인 설정 기본값 검증."""
from core.config import settings


def test_redis_and_worker_defaults():
    assert settings.redis_url.startswith("redis://")
    assert settings.gen_worker_max_jobs == 8
    assert settings.gen_job_stale_minutes == 10
    # 선택 설정 — 기본 None
    assert settings.expo_access_token is None
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_async_job_config.py -v`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'redis_url'`

- [ ] **Step 5: `config.py`에 설정 추가**

`backend/core/config.py`의 `class Settings` 안, `report_daily_limit: int | None = None` 줄 아래에 추가:

```python
    # ── 비동기 Job (arq + redis) ──
    redis_url: str = "redis://localhost:6379/2"
    gen_worker_max_jobs: int = 8
    gen_job_stale_minutes: int = 10
    # ── Expo 푸시 (선택) ──
    expo_access_token: str | None = None
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_async_job_config.py -v`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/pyproject.toml backend/uv.lock backend/core/config.py backend/tests/test_async_job_config.py
git commit -m "feat: add arq dependency and async job settings"
```

---

## Task 2: GenerationJob / DeviceToken 모델 + 마이그레이션

**Files:**
- Modify: `backend/db/models.py`
- Create: `backend/alembic/versions/0015_add_generation_jobs_and_device_tokens.py`
- Test: `backend/tests/test_generation_job_model.py` (Create)

- [ ] **Step 1: 실패하는 모델 테스트 작성**

Create `backend/tests/test_generation_job_model.py`:

```python
"""GenerationJob / DeviceToken 모델 스키마 검증 (메타데이터 레벨)."""
from db.models import GenerationJob, DeviceToken


def test_generation_job_columns():
    cols = GenerationJob.__table__.columns.keys()
    for c in ("id", "user_id", "job_type", "status", "payload",
              "result_id", "error", "created_at", "updated_at"):
        assert c in cols, c


def test_device_token_columns_and_unique():
    cols = DeviceToken.__table__.columns.keys()
    for c in ("id", "user_id", "platform", "token", "created_at"):
        assert c in cols, c
    # (user_id, token) 유니크 제약 존재
    uniques = [
        tuple(sorted(col.name for col in c.columns))
        for c in DeviceToken.__table__.constraints
        if c.__class__.__name__ == "UniqueConstraint"
    ]
    assert ("token", "user_id") in uniques
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_job_model.py -v`
Expected: FAIL — `ImportError: cannot import name 'GenerationJob'`

- [ ] **Step 3: 모델 추가**

`backend/db/models.py` 맨 끝(마지막 클래스 뒤)에 추가. (파일 상단에 `UniqueConstraint`가 import 안 돼 있으면 `from sqlalchemy import ... , UniqueConstraint` 에 추가 — 기존 import 줄 확인 후 누락 시 보강.)

```python
class GenerationJob(Base):
    """비동기 생성 작업 — 사주/궁합 리포트의 백그라운드 처리 상태."""

    __tablename__ = "generation_jobs"

    id:         Mapped[int]        = mapped_column(Integer, primary_key=True)
    user_id:    Mapped[int]        = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_type:   Mapped[str]        = mapped_column(String(30), nullable=False)   # saju_report | compatibility
    status:     Mapped[str]        = mapped_column(String(10), nullable=False, default="pending")
    payload:    Mapped[dict]       = mapped_column(JSONB, nullable=False)
    result_id:  Mapped[int | None] = mapped_column(Integer, nullable=True)
    error:      Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime]   = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    __table_args__ = (
        Index("ix_generation_jobs_user_status", "user_id", "status"),
        Index("ix_generation_jobs_status_created", "status", "created_at"),
    )


class DeviceToken(Base):
    """Expo 푸시 토큰 — 앱이 등록, 완료 알림 발송 대상."""

    __tablename__ = "device_tokens"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:    Mapped[int]      = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    platform:   Mapped[str]      = mapped_column(String(10), nullable=False)   # ios | android
    token:      Mapped[str]      = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "token", name="uq_device_tokens_user_token"),
    )
```

> 참고: `Index`도 import 필요할 수 있다. `db/models.py` 상단 `from sqlalchemy import (...)` 에 `Index`, `UniqueConstraint`가 없으면 추가한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_job_model.py -v`
Expected: PASS

- [ ] **Step 5: 마이그레이션 작성**

Create `backend/alembic/versions/0015_add_generation_jobs_and_device_tokens.py`:

```python
"""add generation_jobs and device_tokens tables

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "generation_jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.String(30), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="pending"),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("result_id", sa.Integer, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_generation_jobs_user_status", "generation_jobs", ["user_id", "status"])
    op.create_index("ix_generation_jobs_status_created", "generation_jobs", ["status", "created_at"])

    op.create_table(
        "device_tokens",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(10), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "token", name="uq_device_tokens_user_token"),
    )


def downgrade() -> None:
    op.drop_table("device_tokens")
    op.drop_index("ix_generation_jobs_status_created", table_name="generation_jobs")
    op.drop_index("ix_generation_jobs_user_status", table_name="generation_jobs")
    op.drop_table("generation_jobs")
```

- [ ] **Step 6: 마이그레이션 적용(로컬)**

```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run alembic upgrade head
```
Expected: `Running upgrade 0014 -> 0015` 출력, 에러 없음.

- [ ] **Step 7: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/db/models.py backend/alembic/versions/0015_add_generation_jobs_and_device_tokens.py backend/tests/test_generation_job_model.py
git commit -m "feat: add generation_jobs and device_tokens models and migration"
```

---

## Task 3: generation_jobs CRUD

**Files:**
- Create: `backend/crud/generation_jobs.py`
- Test: `backend/tests/test_generation_jobs_crud.py` (Create)

- [ ] **Step 1: 실패하는 CRUD 테스트 작성**

Create `backend/tests/test_generation_jobs_crud.py`:

```python
"""generation_jobs CRUD: 생성·상태전이·활성조회·스윕."""
from datetime import datetime, timedelta, timezone

import pytest

import crud.generation_jobs as jobs_crud
from db.models import GenerationJob


@pytest.mark.asyncio
async def test_create_and_get(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(
            db, user_id=db_user.id, job_type="saju_report", payload={"a": 1}
        )
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got is not None
        assert got.status == "pending"
        assert got.payload == {"a": 1}
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_active_for_user_and_set_status(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    # pending → 활성으로 조회됨
    async with test_sessionmaker() as db:
        active = await jobs_crud.get_active_for_user(db, db_user.id)
        assert active is not None and active.id == jid
    # done 처리 → 더 이상 활성 아님
    async with test_sessionmaker() as db:
        await jobs_crud.set_status(db, jid, "done", result_id=42)
        await db.commit()
    async with test_sessionmaker() as db:
        assert await jobs_crud.get_active_for_user(db, db_user.id) is None
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "done" and got.result_id == 42
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_sweep_stale(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        # 강제로 오래된 running 으로 만들기
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        swept = await jobs_crud.sweep_stale(db, stale_minutes=10)
        await db.commit()
        assert jid in swept
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        await db.execute(__import__("sqlalchemy").delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_jobs_crud.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'crud.generation_jobs'`

- [ ] **Step 3: CRUD 구현**

Create `backend/crud/generation_jobs.py`:

```python
"""generation_jobs DB 접근 — 멀티스텝 쓰기는 flush까지, commit은 호출측."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GenerationJob

_ACTIVE = ("pending", "running")


async def create_job(
    db: AsyncSession, *, user_id: int, job_type: str, payload: dict
) -> GenerationJob:
    job = GenerationJob(user_id=user_id, job_type=job_type, status="pending", payload=payload)
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_job(db: AsyncSession, job_id: int) -> GenerationJob | None:
    return await db.get(GenerationJob, job_id)


async def get_active_for_user(db: AsyncSession, user_id: int) -> GenerationJob | None:
    result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.user_id == user_id, GenerationJob.status.in_(_ACTIVE))
        .order_by(GenerationJob.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def set_status(
    db: AsyncSession,
    job_id: int,
    status: str,
    *,
    result_id: int | None = None,
    error: str | None = None,
) -> None:
    values: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if result_id is not None:
        values["result_id"] = result_id
    if error is not None:
        values["error"] = error
    await db.execute(update(GenerationJob).where(GenerationJob.id == job_id).values(**values))


async def sweep_stale(db: AsyncSession, stale_minutes: int) -> list[int]:
    """active 상태인데 updated_at이 stale_minutes 초과한 job을 failed 처리. id 목록 반환."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    result = await db.execute(
        select(GenerationJob.id).where(
            GenerationJob.status.in_(_ACTIVE), GenerationJob.updated_at < cutoff
        )
    )
    ids = [row[0] for row in result.all()]
    if ids:
        await db.execute(
            update(GenerationJob)
            .where(GenerationJob.id.in_(ids))
            .values(status="failed", error="stale: worker timeout", updated_at=datetime.now(timezone.utc))
        )
    return ids


async def delete_old_jobs(db: AsyncSession, retention_days: int) -> int:
    """완료/실패 후 retention_days 지난 job 행 삭제. 삭제 건수 반환."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    result = await db.execute(
        delete(GenerationJob).where(
            GenerationJob.status.in_(("done", "failed")),
            GenerationJob.updated_at < cutoff,
        )
    )
    return result.rowcount or 0
```

> `delete`도 import: 파일 상단 `from sqlalchemy import select, update` → `from sqlalchemy import delete, select, update`.

테스트(`test_generation_jobs_crud.py`)에 추가:
```python
@pytest.mark.asyncio
async def test_delete_old_jobs(test_sessionmaker, db_user):
    from datetime import datetime, timedelta, timezone
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        job.status = "done"
        job.updated_at = datetime.now(timezone.utc) - timedelta(days=30)
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        n = await jobs_crud.delete_old_jobs(db, retention_days=14)
        await db.commit()
        assert n >= 1
    async with test_sessionmaker() as db:
        assert await jobs_crud.get_job(db, jid) is None
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_jobs_crud.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/crud/generation_jobs.py backend/tests/test_generation_jobs_crud.py
git commit -m "feat: add generation_jobs crud"
```

---

## Task 4: device_tokens CRUD

**Files:**
- Create: `backend/crud/device_tokens.py`
- Test: `backend/tests/test_device_tokens_crud.py` (Create)

- [ ] **Step 1: 실패하는 테스트 작성**

Create `backend/tests/test_device_tokens_crud.py`:

```python
"""device_tokens CRUD: upsert·목록·삭제."""
import pytest

import crud.device_tokens as dt_crud
from db.models import DeviceToken
from sqlalchemy import delete


@pytest.mark.asyncio
async def test_upsert_idempotent_and_list_and_delete(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[abc]")
        await db.commit()
    # 같은 토큰 재등록 → 중복 행 안 생김
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[abc]")
        await db.commit()
    async with test_sessionmaker() as db:
        tokens = await dt_crud.list_for_user(db, db_user.id)
        assert [t.token for t in tokens] == ["ExponentPushToken[abc]"]
    # 삭제
    async with test_sessionmaker() as db:
        await dt_crud.delete_token(db, "ExponentPushToken[abc]")
        await db.commit()
    async with test_sessionmaker() as db:
        assert await dt_crud.list_for_user(db, db_user.id) == []
        await db.execute(delete(DeviceToken).where(DeviceToken.user_id == db_user.id))
        await db.commit()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_device_tokens_crud.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'crud.device_tokens'`

- [ ] **Step 3: CRUD 구현**

Create `backend/crud/device_tokens.py`:

```python
"""device_tokens DB 접근. 단발 쓰기지만 commit은 호출측(서비스/워커)에서."""
from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DeviceToken


async def upsert_token(db: AsyncSession, *, user_id: int, platform: str, token: str) -> None:
    """(user_id, token) 유니크 충돌 시 무시 — 중복 등록 안전."""
    stmt = (
        pg_insert(DeviceToken)
        .values(user_id=user_id, platform=platform, token=token)
        .on_conflict_do_nothing(constraint="uq_device_tokens_user_token")
    )
    await db.execute(stmt)


async def list_for_user(db: AsyncSession, user_id: int) -> list[DeviceToken]:
    result = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user_id))
    return list(result.scalars().all())


async def delete_token(db: AsyncSession, token: str) -> None:
    await db.execute(delete(DeviceToken).where(DeviceToken.token == token))
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_device_tokens_crud.py -v`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/crud/device_tokens.py backend/tests/test_device_tokens_crud.py
git commit -m "feat: add device_tokens crud"
```

---

## Task 5: 스키마 + arq 의존성 + jobs 서비스

**Files:**
- Create: `backend/schemas/jobs.py`
- Create: `backend/schemas/devices.py`
- Create: `backend/dependencies/arq.py`
- Create: `backend/services/jobs.py`
- Test: `backend/tests/test_jobs_service.py` (Create)

- [ ] **Step 1: 스키마 작성**

Create `backend/schemas/jobs.py`:

```python
"""비동기 job API 스키마."""
from __future__ import annotations

from pydantic import BaseModel


class JobCreatedResponse(BaseModel):
    job_id: int


class JobStatusResponse(BaseModel):
    status: str                 # pending | running | done | failed
    job_type: str               # saju_report | compatibility
    result_id: int | None = None
    error: str | None = None
```

Create `backend/schemas/devices.py`:

```python
"""디바이스 푸시 토큰 등록 스키마."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DeviceRegisterRequest(BaseModel):
    platform: str = Field(description="ios | android")
    token: str = Field(description="ExpoPushToken 문자열")
```

- [ ] **Step 2: arq 의존성 작성**

Create `backend/dependencies/arq.py`:

```python
"""arq redis 풀 의존성 — main lifespan이 app.state.arq에 넣어둔다."""
from __future__ import annotations

from fastapi import Request


def get_arq(request: Request):
    """enqueue용 ArqRedis 풀."""
    return request.app.state.arq
```

- [ ] **Step 3: 실패하는 jobs 서비스 테스트 작성**

Create `backend/tests/test_jobs_service.py`:

```python
"""jobs 서비스: 상태 조회(소유권) + 활성 job 규칙."""
import pytest

import crud.generation_jobs as jobs_crud
import services.jobs as jobs_service
from core.exceptions import ForbiddenException, ReportNotFoundException
from db.models import GenerationJob
from sqlalchemy import delete


@pytest.mark.asyncio
async def test_get_status_owner_ok_and_forbidden(test_sessionmaker, db_user):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    async with test_sessionmaker() as db:
        res = await jobs_service.get_job_status(db, jid, db_user.id)
        assert res.status == "pending"
        assert res.job_type == "saju_report"
    async with test_sessionmaker() as db:
        with pytest.raises(ForbiddenException):
            await jobs_service.get_job_status(db, jid, db_user.id + 99999)
    async with test_sessionmaker() as db:
        with pytest.raises(ReportNotFoundException):
            await jobs_service.get_job_status(db, 99999999, db_user.id)
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_create_job_returns_existing_active(test_sessionmaker, db_user):
    class FakeArq:
        def __init__(self):
            self.calls = []

        async def enqueue_job(self, fn, *args):
            self.calls.append((fn, args))

    arq = FakeArq()
    async with test_sessionmaker() as db:
        jid1 = await jobs_service.create_job_and_enqueue(
            db, user_id=db_user.id, job_type="saju_report",
            payload={"x": 1}, enqueue_fn="generate_saju_report", arq=arq,
        )
        await db.commit()
    # 활성 job 있으니 두 번째 호출은 기존 job_id 반환 + enqueue 추가 안 함
    async with test_sessionmaker() as db:
        jid2 = await jobs_service.create_job_and_enqueue(
            db, user_id=db_user.id, job_type="saju_report",
            payload={"x": 2}, enqueue_fn="generate_saju_report", arq=arq,
        )
        await db.commit()
    assert jid1 == jid2
    assert len(arq.calls) == 1
    async with test_sessionmaker() as db:
        await db.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await db.commit()
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_jobs_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.jobs'`

- [ ] **Step 5: jobs 서비스 구현**

Create `backend/services/jobs.py`:

```python
"""비동기 job 서비스 — 생성+enqueue(활성 1개 규칙) + 상태 조회."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ForbiddenException, ReportNotFoundException
from crud import generation_jobs as jobs_crud
from schemas.jobs import JobStatusResponse


async def create_job_and_enqueue(
    db: AsyncSession,
    *,
    user_id: int,
    job_type: str,
    payload: dict,
    enqueue_fn: str,
    arq,
) -> int:
    """job 행 생성 후 arq enqueue. 이미 활성(pending/running) job이 있으면 그 id 반환.

    호출측(서비스)이 commit한다.
    """
    active = await jobs_crud.get_active_for_user(db, user_id)
    if active is not None:
        return active.id

    job = await jobs_crud.create_job(db, user_id=user_id, job_type=job_type, payload=payload)
    await db.flush()
    try:
        await arq.enqueue_job(enqueue_fn, job.id)
    except Exception as e:  # noqa: BLE001 — redis 다운 등 enqueue 실패
        # commit 전이라 job 행은 롤백된다(유령 pending 방지). 503으로 변환.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="생성 대기열에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        ) from e
    return job.id


async def get_job_status(db: AsyncSession, job_id: int, user_id: int) -> JobStatusResponse:
    job = await jobs_crud.get_job(db, job_id)
    if job is None:
        raise ReportNotFoundException(str(job_id))
    if job.user_id != user_id:
        raise ForbiddenException()
    return JobStatusResponse(
        status=job.status, job_type=job.job_type, result_id=job.result_id, error=job.error
    )
```

> 참고: `ForbiddenException`, `ReportNotFoundException`는 `core/exceptions.py`에 이미 존재(reports 서비스에서 사용 중). import 경로 동일.

- [ ] **Step 6: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_jobs_service.py -v`
Expected: PASS (2 passed)

- [ ] **Step 7: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/schemas/jobs.py backend/schemas/devices.py backend/dependencies/arq.py backend/services/jobs.py backend/tests/test_jobs_service.py
git commit -m "feat: add job schemas, arq dependency, and jobs service"
```

---

## Task 6: notifications 서비스 (Expo 푸시 발송)

**Files:**
- Create: `backend/services/notifications.py`
- Test: `backend/tests/test_notifications.py` (Create)

- [ ] **Step 1: 실패하는 테스트 작성**

Create `backend/tests/test_notifications.py`:

```python
"""Expo 푸시 발송: 토큰 없으면 skip, 있으면 호출, DeviceNotRegistered 토큰 삭제."""
import pytest

import crud.device_tokens as dt_crud
import services.notifications as notif
from db.models import DeviceToken, GenerationJob
from sqlalchemy import delete


class _FakeResp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """httpx.AsyncClient 대체 — 마지막 POST body 기록, 지정 응답 반환."""
    last_json = None

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, json=None, headers=None):
        _FakeAsyncClient.last_json = json
        # 보낸 토큰마다 DeviceNotRegistered 한 건 반환
        data = [{"status": "error", "details": {"error": "DeviceNotRegistered"}} for _ in json]
        return _FakeResp({"data": data})


@pytest.mark.asyncio
async def test_no_tokens_is_noop(test_sessionmaker, db_user, monkeypatch):
    job = GenerationJob(user_id=db_user.id, job_type="saju_report", status="done",
                        payload={}, result_id=1)
    called = {"post": False}
    monkeypatch.setattr(notif.httpx, "AsyncClient", lambda *a, **k: (_ for _ in ()).throw(AssertionError("should not call")))
    async with test_sessionmaker() as db:
        # 토큰 없음 → 예외/호출 없이 통과
        await notif.notify_generation_done(db, job)


@pytest.mark.asyncio
async def test_sends_and_prunes_invalid(test_sessionmaker, db_user, monkeypatch):
    monkeypatch.setattr(notif.httpx, "AsyncClient", _FakeAsyncClient)
    async with test_sessionmaker() as db:
        await dt_crud.upsert_token(db, user_id=db_user.id, platform="ios", token="ExponentPushToken[x]")
        await db.commit()
        job = GenerationJob(user_id=db_user.id, job_type="saju_report", status="done",
                            payload={}, result_id=7)
        db.add(job)
        await db.commit()
        await db.refresh(job)
        await notif.notify_generation_done(db, job)
        await db.commit()
    # Expo로 보낸 메시지에 deep-link 데이터 포함
    assert _FakeAsyncClient.last_json[0]["to"] == "ExponentPushToken[x]"
    assert _FakeAsyncClient.last_json[0]["data"] == {"type": "saju_report", "result_id": 7}
    # DeviceNotRegistered → 토큰 삭제됨
    async with test_sessionmaker() as db:
        assert await dt_crud.list_for_user(db, db_user.id) == []
        await db.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await db.execute(delete(DeviceToken).where(DeviceToken.user_id == db_user.id))
        await db.commit()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_notifications.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.notifications'`

- [ ] **Step 3: notifications 구현**

Create `backend/services/notifications.py`:

```python
"""생성 완료 → Expo Push API 발송. 토큰 없으면 no-op. 만료 토큰은 삭제(회전).

백엔드는 FCM/APNs를 직접 다루지 않는다 — Expo가 중계한다.
"""
from __future__ import annotations

import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from crud import device_tokens as dt_crud
from db.models import GenerationJob

logger = logging.getLogger(__name__)

_EXPO_URL = "https://exp.host/--/api/v2/push/send"

_TITLES = {
    "saju_report": "사주 리포트가 완성됐어요",
    "compatibility": "궁합 리포트가 완성됐어요",
}


async def notify_generation_done(db: AsyncSession, job: GenerationJob) -> None:
    """job 소유자의 모든 디바이스에 완료 푸시. 실패해도 예외를 올리지 않는다."""
    tokens = await dt_crud.list_for_user(db, job.user_id)
    if not tokens:
        return

    title = _TITLES.get(job.job_type, "리포트가 완성됐어요")
    messages = [
        {
            "to": t.token,
            "title": title,
            "body": "지금 확인해 보세요.",
            "data": {"type": job.job_type, "result_id": job.result_id},
        }
        for t in tokens
    ]

    headers = {"Content-Type": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(_EXPO_URL, json=messages, headers=headers)
            resp.raise_for_status()
            tickets = resp.json().get("data", [])
    except Exception as e:  # noqa: BLE001 — 알림 실패가 생성 결과를 깨면 안 됨
        logger.warning("Expo 푸시 발송 실패: %s", e)
        return

    # DeviceNotRegistered 토큰 정리 (티켓 순서 = messages 순서)
    for msg, ticket in zip(messages, tickets):
        details = (ticket or {}).get("details") or {}
        if ticket.get("status") == "error" and details.get("error") == "DeviceNotRegistered":
            await dt_crud.delete_token(db, msg["to"])
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_notifications.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/services/notifications.py backend/tests/test_notifications.py
git commit -m "feat: add Expo push notification service"
```

---

## Task 7: generation_runner (워커가 호출하는 실제 생성 로직)

기존 동기 생성 로직을 워커용으로 옮긴다. 사주는 `run_saju_report_full` + `insert_report`, 궁합은 파이프라인 + `compat_crud.create_report`. 각 함수는 job 상태(running→done/failed)를 전이하고 완료 시 notify를 호출한다.

**Files:**
- Create: `backend/services/generation_runner.py`
- Test: `backend/tests/test_generation_runner.py` (Create)

- [ ] **Step 1: 실패하는 테스트 작성 (파이프라인·notify 모킹)**

Create `backend/tests/test_generation_runner.py`:

```python
"""generation_runner: 사주/궁합 job 실행 성공·실패 경로 (파이프라인 모킹)."""
import pytest

import crud.generation_jobs as jobs_crud
import services.generation_runner as runner
from db.models import GenerationJob, SajuReport
from sqlalchemy import delete


_FAKE_SAJU = {"day_pillar": {"stem": "경"}, "meta": {}}


class _FakeTab:
    def __init__(self, c, h, ct, r=False):
        self._d = dict(category=c, headline=h, content=ct, requested=r)

    def model_dump(self):
        return dict(self._d)


class _FakeWriter:
    tabs = [_FakeTab("성격", "헤드라인", "본문")]


def _fake_year_flow():
    from schemas.report import YearFlow, YearFlowMonth
    return YearFlow(year=2026, first_half="상", second_half="하",
                    months=[YearFlowMonth(month=m, keyword="k", memo="m") for m in range(1, 13)])


def _fake_dae_un():
    from schemas.report import DaeUnAnalysis, DaeUnPeriod
    return DaeUnAnalysis(current=DaeUnPeriod(ganji="을해", period="~2035", text="t"),
                         next=DaeUnPeriod(ganji="갑술", period="2036~", text="t"), caution="c")


class _FakeUnFlow:
    year_flow = _fake_year_flow()
    dae_un_analysis = _fake_dae_un()


_SAJU_PAYLOAD = {
    "birth_input": {"birth_date": "1990-03-15", "birth_time": "14:30", "gender": "male",
                    "calendar": "solar", "is_leap_month": False, "name": "홍길동"},
    "request_topics": "이직", "profile_id": None, "language": "ko",
}


@pytest.mark.asyncio
async def test_run_saju_report_job_success(test_sessionmaker, db_user, monkeypatch):
    async def _fake_full(**kwargs):
        return _FAKE_SAJU, _FakeWriter(), _FakeUnFlow()
    notified = {"v": False}
    async def _fake_notify(db, job):
        notified["v"] = True
    monkeypatch.setattr(runner, "run_saju_report_full", _fake_full)
    monkeypatch.setattr(runner, "notify_generation_done", _fake_notify)

    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload=_SAJU_PAYLOAD)
        await db.commit()
        jid = job.id

    async with test_sessionmaker() as db:
        await runner.run_saju_report_job(db, jid)

    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "done"
        assert got.result_id is not None
        rid = got.result_id
        assert notified["v"] is True
        await db.execute(delete(SajuReport).where(SajuReport.id == rid))
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


@pytest.mark.asyncio
async def test_run_saju_report_job_failure_sets_failed(test_sessionmaker, db_user, monkeypatch):
    async def _boom(**kwargs):
        raise RuntimeError("llm down")
    monkeypatch.setattr(runner, "run_saju_report_full", _boom)
    monkeypatch.setattr(runner, "notify_generation_done", lambda db, job: None)

    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload=_SAJU_PAYLOAD)
        await db.commit()
        jid = job.id

    async with test_sessionmaker() as db:
        await runner.run_saju_report_job(db, jid)

    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        assert "llm down" in (got.error or "")
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_runner.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.generation_runner'`

- [ ] **Step 3: runner 구현**

Create `backend/services/generation_runner.py`:

```python
"""워커 태스크가 호출하는 실제 생성 로직.

각 함수는 자체 트랜잭션으로 running→done/failed 상태를 전이하고,
완료 시 notify_generation_done을 호출한다. 예외는 삼켜 job을 failed로 기록한다.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

import crud.chat as chat_crud
import crud.compatibility as compat_crud
import crud.reports as reports_crud
from crud import generation_jobs as jobs_crud
from llm.pipelines.compatibility_report import run_compatibility_report
from llm.pipelines.saju_report import run_saju_report_full
from schemas.compatibility import BirthInput, CompatibilityReportRequest
from services.compatibility import _score_to_dict, _synastry_to_dict
from services.notifications import notify_generation_done

logger = logging.getLogger(__name__)


async def run_saju_report_job(db: AsyncSession, job_id: int) -> None:
    job = await jobs_crud.get_job(db, job_id)
    if job is None or job.status not in ("pending", "running"):
        return
    await jobs_crud.set_status(db, job_id, "running")
    await db.commit()

    try:
        p = job.payload
        b = p["birth_input"]
        saju, writer_output, un_flow = await run_saju_report_full(
            birth_date=b["birth_date"],
            birth_time=b.get("birth_time"),
            gender=b["gender"],
            calendar=b.get("calendar", "solar"),
            is_leap_month=b.get("is_leap_month", False),
            concern=p.get("request_topics"),
            birth_longitude=b.get("birth_longitude"),
            birth_utc_offset=b.get("birth_utc_offset"),
            language=p.get("language", "ko"),
        )
        report = await reports_crud.insert_report(
            db,
            user_id=job.user_id,
            profile_id=p.get("profile_id"),
            birth_input=b,
            request_topics=p.get("request_topics"),
            language=p.get("language", "ko"),
            tabs=[t.model_dump() for t in writer_output.tabs],
            year_flow=un_flow.year_flow.model_dump(),
            dae_un_analysis=un_flow.dae_un_analysis.model_dump(),
        )
        await db.flush()
        await jobs_crud.set_status(db, job_id, "done", result_id=report.id)
        # job 객체 최신화 후 notify
        await db.refresh(job)
        await notify_generation_done(db, job)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        logger.exception("saju report job 실패 job_id=%s", job_id)
        await jobs_crud.set_status(db, job_id, "failed", error=str(e)[:500])
        await db.commit()


async def run_compatibility_job(db: AsyncSession, job_id: int) -> None:
    job = await jobs_crud.get_job(db, job_id)
    if job is None or job.status not in ("pending", "running"):
        return
    await jobs_crud.set_status(db, job_id, "running")
    await db.commit()

    try:
        p = job.payload
        if p.get("mode") == "session":
            session = await chat_crud.get_session_or_404(
                db, uuid.UUID(p["session_id"]), job.user_id
            )
            if not session.partner_info:
                raise ValueError("세션에 상대 사주가 첨부되어 있지 않습니다.")
            person_a = BirthInput(**session.birth_info)
            person_b = BirthInput(**session.partner_info)
            request_topics = p.get("request_topics")
            language = "ko"
        else:
            person_a = BirthInput(**p["person_a"])
            person_b = BirthInput(**p["person_b"])
            request_topics = p.get("request_topics")
            language = p.get("language", "ko")

        req = CompatibilityReportRequest(
            person_a=person_a, person_b=person_b,
            request_topics=request_topics, language=language,
        )
        score, synastry, tabs = await run_compatibility_report(req)
        report = await compat_crud.create_report(
            db,
            user_id=job.user_id,
            person_a=person_a.model_dump(),
            person_b=person_b.model_dump(),
            request_topics=request_topics,
            language=language,
            score=_score_to_dict(score),
            synastry=_synastry_to_dict(synastry),
            tabs=[t.model_dump() for t in tabs],
        )
        await db.flush()
        await jobs_crud.set_status(db, job_id, "done", result_id=report.id)
        await db.refresh(job)
        await notify_generation_done(db, job)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        logger.exception("compatibility job 실패 job_id=%s", job_id)
        await jobs_crud.set_status(db, job_id, "failed", error=str(e)[:500])
        await db.commit()
```

> 구현 전 확인: `services/compatibility.py`에 `_score_to_dict`, `_synastry_to_dict`, `compat_crud.create_report` 시그니처가 위와 일치하는지 본다(Task 컨텍스트의 services/compatibility.py 발췌 참조). `crud.compatibility` 모듈명·`crud.chat.get_session_or_404`도 실제 경로로 확인(아래 Step 3.5).

- [ ] **Step 3.5: import 경로 검증**

Run:
```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend
UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run python -c "import services.generation_runner; print('import ok')"
```
Expected: `import ok`. ImportError가 나면 해당 모듈/심볼의 실제 경로로 import 줄을 교정한다(`crud/compatibility.py`, `crud/chat.py`, `schemas/compatibility.py`의 `BirthInput`·`CompatibilityReportRequest` 존재 확인).

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_generation_runner.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/services/generation_runner.py backend/tests/test_generation_runner.py
git commit -m "feat: add generation runner for saju and compatibility jobs"
```

---

## Task 8: arq 워커 (worker.py) + 스윕 cron

**Files:**
- Modify: `backend/core/config.py` (retention 설정 추가)
- Create: `backend/worker.py`
- Test: `backend/tests/test_worker_tasks.py` (Create)

- [ ] **Step 0: config에 보존 기간 추가**

`backend/core/config.py`의 `class Settings`에서 `gen_job_stale_minutes: int = 10` 줄 아래에 추가:
```python
    gen_job_retention_days: int = 3
```

- [ ] **Step 1: 실패하는 워커 태스크 테스트 작성**

Create `backend/tests/test_worker_tasks.py`:

```python
"""worker 태스크 함수가 runner로 위임하는지 + 스윕 cron 동작."""
import pytest

import worker
from db.models import GenerationJob
from sqlalchemy import delete
import crud.generation_jobs as jobs_crud


@pytest.mark.asyncio
async def test_generate_saju_report_delegates(monkeypatch, test_sessionmaker):
    seen = {}
    async def _fake_runner(db, job_id):
        seen["job_id"] = job_id
    monkeypatch.setattr(worker, "run_saju_report_job", _fake_runner)
    ctx = {"sessionmaker": test_sessionmaker}
    await worker.generate_saju_report(ctx, 123)
    assert seen["job_id"] == 123


@pytest.mark.asyncio
async def test_sweep_cron_marks_failed(monkeypatch, test_sessionmaker, db_user):
    from datetime import datetime, timedelta, timezone
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        await db.commit()
        jid = job.id
    ctx = {"sessionmaker": test_sessionmaker}
    await worker.sweep_stale_jobs(ctx)
    async with test_sessionmaker() as db:
        got = await jobs_crud.get_job(db, jid)
        assert got.status == "failed"
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_worker_tasks.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'worker'`

- [ ] **Step 3: worker 구현**

Create `backend/worker.py`:

```python
"""arq 워커 — 단일 큐 sajuguri:jobs.

실행: `arq worker.WorkerSettings`
태스크: generate_saju_report, generate_compatibility
cron: 10분마다 stale job 정리.
"""
from __future__ import annotations

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import settings
from crud import generation_jobs as jobs_crud
from services.generation_runner import run_compatibility_job, run_saju_report_job

QUEUE_NAME = "sajuguri:jobs"


async def generate_saju_report(ctx, job_id: int) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await run_saju_report_job(db, job_id)


async def generate_compatibility(ctx, job_id: int) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await run_compatibility_job(db, job_id)


async def sweep_stale_jobs(ctx) -> None:
    sm = ctx["sessionmaker"]
    async with sm() as db:
        await jobs_crud.sweep_stale(db, settings.gen_job_stale_minutes)
        await jobs_crud.delete_old_jobs(db, settings.gen_job_retention_days)
        await db.commit()


async def on_startup(ctx) -> None:
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
        pool_size=10,
        max_overflow=10,
    )
    ctx["engine"] = engine
    ctx["sessionmaker"] = async_sessionmaker(engine, expire_on_commit=False)


async def on_shutdown(ctx) -> None:
    await ctx["engine"].dispose()


class WorkerSettings:
    functions = [generate_saju_report, generate_compatibility]
    cron_jobs = [cron(sweep_stale_jobs, minute=set(range(0, 60, 10)))]
    on_startup = on_startup
    on_shutdown = on_shutdown
    max_jobs = settings.gen_worker_max_jobs
    job_timeout = 180
    queue_name = QUEUE_NAME
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_worker_tasks.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/worker.py backend/tests/test_worker_tasks.py
git commit -m "feat: add arq worker with saju/compatibility tasks and stale sweep"
```

---

## Task 9: reports/compatibility 서비스 전환 + 라우터 202 + main 등록

**Files:**
- Modify: `backend/services/reports.py`
- Modify: `backend/services/compatibility.py`
- Modify: `backend/routers/reports.py`
- Modify: `backend/routers/compatibility.py`
- Create: `backend/routers/jobs.py`
- Create: `backend/routers/devices.py`
- Modify: `backend/main.py`
- Test: 기존 `backend/tests/test_reports_api.py` 갱신 + `backend/tests/test_jobs_api.py` (Create)

- [ ] **Step 1: reports 서비스 create_report 전환**

`backend/services/reports.py`의 `create_report` 함수를 아래로 교체. (한도 체크는 유지, 파이프라인 직접 호출은 제거하고 job 생성+enqueue.)

```python
async def create_report(
    db: AsyncSession,
    user_id: int,
    req: ReportCreateRequest,
    arq,
) -> int:
    """리포트 생성 job 등록 → job_id 반환. 실제 생성은 워커가 수행."""
    from services import jobs as jobs_service

    limit = settings.report_daily_limit
    if limit is not None:
        used = await reports_crud.count_today(db, user_id)
        if used >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"하루 리포트 생성 한도({limit}개)를 초과했습니다. 내일 다시 시도해주세요.",
            )

    job_id = await jobs_service.create_job_and_enqueue(
        db,
        user_id=user_id,
        job_type="saju_report",
        payload=req.model_dump(),
        enqueue_fn="generate_saju_report",
        arq=arq,
    )
    await db.commit()
    return job_id
```

> `run_saju_report_full` import가 services/reports.py에서 더 이상 create_report에 쓰이지 않지만, `_build_charts` 등 다른 함수가 쓰는 import는 그대로 둔다(`run_saju_report_full` import 줄은 create_report 외 사용처 없으면 제거 가능 — 제거 시 `from llm.pipelines.saju_report import run_saju_report_full` 줄 삭제).

- [ ] **Step 2: reports 라우터 POST 202 전환**

`backend/routers/reports.py` 수정:

import에 추가:
```python
from dependencies.arq import get_arq
from schemas.jobs import JobCreatedResponse
```

`create_report` 엔드포인트를 교체:
```python
@router.post("", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED, summary="리포트 생성 job 등록")
async def create_report(
    body: ReportCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq=Depends(get_arq),
) -> JobCreatedResponse:
    job_id = await reports_service.create_report(db, user.id, body, arq)
    return JobCreatedResponse(job_id=job_id)
```

- [ ] **Step 3: compatibility 서비스 전환**

`backend/services/compatibility.py`의 `create_report`와 `create_from_session`을 아래로 교체(기존 `_run_and_store`는 generation_runner로 옮겨갔으므로 더 이상 호출하지 않음 — 단, `_score_to_dict`/`_synastry_to_dict`/`_to_detail`/`get_report` 등 나머지는 유지).

```python
async def create_report(
    db: AsyncSession,
    user_id: int,
    req: CompatibilityReportRequest,
    arq,
) -> int:
    """궁합 생성 job 등록 → job_id."""
    from services import jobs as jobs_service

    payload = {
        "mode": "direct",
        "person_a": req.person_a.model_dump(),
        "person_b": req.person_b.model_dump(),
        "request_topics": req.request_topics,
        "language": req.language,
    }
    job_id = await jobs_service.create_job_and_enqueue(
        db, user_id=user_id, job_type="compatibility",
        payload=payload, enqueue_fn="generate_compatibility", arq=arq,
    )
    await db.commit()
    return job_id


async def create_from_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: int,
    arq,
    request_topics: str | None = None,
) -> int:
    """챗 세션 기반 궁합 생성 job 등록 → job_id."""
    from services import jobs as jobs_service

    payload = {
        "mode": "session",
        "session_id": str(session_id),
        "request_topics": request_topics,
    }
    job_id = await jobs_service.create_job_and_enqueue(
        db, user_id=user_id, job_type="compatibility",
        payload=payload, enqueue_fn="generate_compatibility", arq=arq,
    )
    await db.commit()
    return job_id
```

> `_run_and_store` 함수는 generation_runner로 로직이 이전됐으므로 services/compatibility.py에서 **삭제**한다. 삭제 후 `run_compatibility_report` import가 이 파일에서 더 안 쓰이면 그 import 줄도 제거. (단 `_score_to_dict`/`_synastry_to_dict`는 generation_runner가 import하므로 **유지**.)

- [ ] **Step 4: compatibility 라우터 202 전환**

`backend/routers/compatibility.py` 수정: import에 `from dependencies.arq import get_arq`, `from schemas.jobs import JobCreatedResponse` 추가. 두 생성 엔드포인트 교체:

```python
@router.post("", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED, summary="궁합 생성 job 등록")
async def create_report(
    body: CompatibilityReportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq=Depends(get_arq),
) -> JobCreatedResponse:
    job_id = await compatibility_service.create_report(db, user.id, body, arq)
    return JobCreatedResponse(job_id=job_id)


@router.post("/from-session/{session_id}", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED, summary="세션 기반 궁합 생성 job")
async def create_report_from_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    arq=Depends(get_arq),
) -> JobCreatedResponse:
    job_id = await compatibility_service.create_from_session(db, session_id, user.id, arq)
    return JobCreatedResponse(job_id=job_id)
```

> `status`가 라우터에 import 돼 있는지 확인(`from fastapi import APIRouter, Depends, status`). 누락 시 추가. `from-session` 라우트의 기존 시그니처(`response_model`, path)와 정확히 맞춘다.

- [ ] **Step 5: jobs / devices 라우터 작성**

Create `backend/routers/jobs.py`:

```python
"""비동기 생성 job 상태 조회."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.jobs import JobStatusResponse
from services import jobs as jobs_service

router = APIRouter(prefix="/api/jobs", tags=["생성 Job"])


@router.get("/{job_id}", response_model=JobStatusResponse, summary="job 상태 조회 (소유자)")
async def get_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobStatusResponse:
    return await jobs_service.get_job_status(db, job_id, user.id)
```

Create `backend/routers/devices.py`:

```python
"""Expo 푸시 디바이스 토큰 등록."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from crud import device_tokens as dt_crud
from db.models import User
from dependencies.auth import get_current_user
from dependencies.db import get_db
from schemas.devices import DeviceRegisterRequest

router = APIRouter(prefix="/api/devices", tags=["디바이스"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT, summary="푸시 토큰 등록 (로그인)")
async def register_device(
    body: DeviceRegisterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await dt_crud.upsert_token(db, user_id=user.id, platform=body.platform, token=body.token)
    await db.commit()
```

- [ ] **Step 6: main.py — arq 풀 lifespan + 라우터 등록**

`backend/main.py` lifespan 함수에 arq 풀 생성/정리를 추가. 기존 lifespan을 아래로 교체:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("DB 연결 실패 (create_all 건너뜀): %s", e)

    from arq import create_pool
    from arq.connections import RedisSettings
    app.state.arq = await create_pool(RedisSettings.from_dsn(settings.redis_url))

    async with AsyncPostgresSaver.from_conn_string(settings.postgres_url) as checkpointer:
        await checkpointer.setup()
        app.state.checkpointer = checkpointer
        try:
            yield
        finally:
            await app.state.arq.close()
```

라우터 등록부에 추가 (`app.include_router(reports.share_router)` 줄 아래):
```python
from routers import jobs as jobs_router      # 파일 상단 import 영역으로 이동 권장
from routers import devices as devices_router
app.include_router(jobs_router.router)
app.include_router(devices_router.router)
```
> import는 파일 상단 라우터 import 모음(`from routers import auth, saju, ...`)에 `jobs as jobs_router, devices as devices_router` 형태로 합쳐도 된다. 기존 스타일에 맞춘다.

- [ ] **Step 7: reports API 테스트 갱신**

`backend/tests/test_reports_api.py`는 이제 201/ReportDetail이 아니라 202/{job_id}를 받는다. arq를 모킹해야 한다. 파일을 아래 핵심 변경으로 갱신:

`get_arq` 의존성 오버라이드 픽스처 추가 (파일 상단 import에 `from dependencies.arq import get_arq` 추가):

```python
class _FakeArq:
    def __init__(self):
        self.calls = []

    async def enqueue_job(self, fn, *args):
        self.calls.append((fn, args))


@pytest.fixture(autouse=True)
def _override_arq():
    app.dependency_overrides[get_arq] = lambda: _FakeArq()
    yield
    app.dependency_overrides.pop(get_arq, None)
```

`test_create_report_returns_detail`를 job 등록 검증으로 교체:

```python
async def test_create_report_returns_job_id(db_user, _cleanup_reports):
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.post("/api/reports", json=_BODY)
    assert r.status_code == 202, r.text
    assert isinstance(r.json()["job_id"], int)
```

> `_stub_pipeline`(run_saju_report_full monkeypatch)은 이제 create 경로에서 안 쓰이므로 제거하거나 둬도 무방(워커 경로는 이 API 테스트가 안 탄다). 생성 후 실제 리포트 행은 안 생기므로 `_cleanup_reports`는 generation_jobs 정리로 바꾼다:

```python
@pytest.fixture
async def _cleanup_reports(test_sessionmaker, db_user):
    yield
    from db.models import GenerationJob
    async with test_sessionmaker() as s:
        await s.execute(delete(GenerationJob).where(GenerationJob.user_id == db_user.id))
        await s.commit()
```

`test_list_reports` 등 생성에 의존하던 테스트는 generation_jobs만 만들고 리포트는 안 생기므로, **리스트가 비어있음을 허용**하도록 조정하거나 직접 SajuReport를 insert해 검증한다. 간단히: list/get/share 테스트는 `reports_crud.insert_report`로 행을 직접 만들어 검증하도록 바꾼다(생성 API 대신).

- [ ] **Step 8: jobs API 테스트 작성**

Create `backend/tests/test_jobs_api.py`:

```python
"""GET /api/jobs/{id} — 소유자 상태 조회, 비소유자 403."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from core.security import create_access_token
from db.models import GenerationJob
from main import app
import crud.generation_jobs as jobs_crud


def _client(token=None):
    cookies = {"access_token": token} if token else None
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t", cookies=cookies)


async def test_get_job_status_owner(db_user, test_sessionmaker, override_db):
    async with test_sessionmaker() as db:
        job = await jobs_crud.create_job(db, user_id=db_user.id, job_type="saju_report", payload={})
        await db.commit()
        jid = job.id
    token = create_access_token(db_user.id)
    async with _client(token) as c:
        r = await c.get(f"/api/jobs/{jid}")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending"
    assert r.json()["job_type"] == "saju_report"
    async with test_sessionmaker() as db:
        await db.execute(delete(GenerationJob).where(GenerationJob.id == jid))
        await db.commit()


async def test_get_job_requires_auth(override_db):
    async with _client() as c:
        r = await c.get("/api/jobs/1")
    assert r.status_code == 401
```

- [ ] **Step 9: 전체 백엔드 테스트 실행**

Run:
```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend
UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest tests/test_reports_api.py tests/test_jobs_api.py tests/test_compatibility_api.py -v
```
Expected: 모두 PASS. (compatibility_api 테스트도 202/job_id로 깨지면 reports와 동일 패턴으로 갱신 — `_FakeArq` 오버라이드 + 생성 응답 202·job_id 검증.)

- [ ] **Step 10: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add backend/services/reports.py backend/services/compatibility.py backend/routers/reports.py backend/routers/compatibility.py backend/routers/jobs.py backend/routers/devices.py backend/main.py backend/tests/test_reports_api.py backend/tests/test_jobs_api.py backend/tests/test_compatibility_api.py
git commit -m "feat: switch report and compatibility creation to async jobs with 202 response"
```

---

## Task 10: api-client — jobs/devices + 생성 함수 전환

**Files:**
- Create: `packages/api-client/src/jobs.ts`
- Create: `packages/api-client/src/devices.ts`
- Modify: `packages/api-client/src/reports.ts`
- Modify: `packages/api-client/src/compatibility.ts`
- Modify: `packages/api-client/src/index.ts`
- Test: `packages/api-client/src/jobs.test.ts` (Create)

- [ ] **Step 1: jobs.ts 작성**

Create `packages/api-client/src/jobs.ts`:

```typescript
import type { ApiClient } from './client'

export interface JobCreated {
  job_id: number
}

export interface JobStatus {
  status: 'pending' | 'running' | 'done' | 'failed'
  job_type: 'saju_report' | 'compatibility'
  result_id?: number
  error?: string
}

/** GET /api/jobs/{id} — job 상태 폴링 (소유자). */
export function getJob(api: ApiClient, jobId: number): Promise<JobStatus> {
  return api.get<JobStatus>(`/api/jobs/${jobId}`)
}
```

- [ ] **Step 2: devices.ts 작성**

Create `packages/api-client/src/devices.ts`:

```typescript
import type { ApiClient } from './client'

export interface DeviceRegisterBody {
  platform: 'ios' | 'android'
  token: string
}

/** POST /api/devices — Expo 푸시 토큰 등록 (앱에서 호출). 204 */
export function registerDeviceToken(api: ApiClient, body: DeviceRegisterBody): Promise<void> {
  return api.post('/api/devices', body)
}
```

- [ ] **Step 3: reports.ts — createReport를 job 반환으로 전환**

`packages/api-client/src/reports.ts`의 `createReport`를 교체:

```typescript
import type { JobCreated } from './jobs'

/** POST /api/reports — 리포트 생성 job 등록 (로그인 필수). 202 { job_id } */
export function createReportJob(
  api: ApiClient,
  body: CreateReportBody,
): Promise<JobCreated> {
  return api.post<JobCreated>('/api/reports', body)
}
```
> 기존 `createReport`(ReportDetail 반환)는 삭제. `import type { JobCreated } from './jobs'`를 파일 상단에 추가.

- [ ] **Step 4: compatibility.ts — 생성 2종을 job 반환으로 전환**

`packages/api-client/src/compatibility.ts`의 `createCompatibilityReport`, `createCompatibilityFromSession`을 교체:

```typescript
import type { JobCreated } from './jobs'

/** POST /api/compatibility — 궁합 생성 job 등록. 202 { job_id } */
export function createCompatibilityJob(
  api: ApiClient,
  body: CompatibilityReportRequest,
): Promise<JobCreated> {
  return api.post<JobCreated>('/api/compatibility', body)
}

/** POST /api/compatibility/from-session/{id} — 세션 기반 궁합 생성 job. 202 */
export function createCompatibilityJobFromSession(
  api: ApiClient,
  sessionId: string,
): Promise<JobCreated> {
  return api.post<JobCreated>(`/api/compatibility/from-session/${sessionId}`)
}
```
> 기존 두 함수 삭제, `import type { JobCreated } from './jobs'` 추가.

- [ ] **Step 5: index.ts export 추가**

`packages/api-client/src/index.ts`에 추가:
```typescript
export * from './jobs'
export * from './devices'
```

- [ ] **Step 6: jobs 테스트 작성**

Create `packages/api-client/src/jobs.test.ts` (기존 테스트 스타일 확인 후 맞춤 — 예시):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getJob } from './jobs'
import type { ApiClient } from './client'

describe('getJob', () => {
  it('GETs /api/jobs/{id}', async () => {
    const get = vi.fn().mockResolvedValue({ status: 'done', job_type: 'saju_report', result_id: 5 })
    const api = { get } as unknown as ApiClient
    const res = await getJob(api, 5)
    expect(get).toHaveBeenCalledWith('/api/jobs/5')
    expect(res.result_id).toBe(5)
  })
})
```
> 기존 `*.test.ts`의 import 패턴(vitest 사용 여부)에 맞춘다. 다르면 `reports.test.ts`를 참고해 동일 형식으로.

- [ ] **Step 7: api-client 타입체크/테스트**

Run:
```bash
cd /home/rheon/Desktop/projects/SajuGuri/packages/api-client && npx tsc --noEmit
```
Expected: 에러 없음. (테스트 러너가 설정돼 있으면 `pnpm test` 또는 `npx vitest run`로 jobs.test.ts 통과 확인.)

- [ ] **Step 8: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add packages/api-client/src/jobs.ts packages/api-client/src/devices.ts packages/api-client/src/reports.ts packages/api-client/src/compatibility.ts packages/api-client/src/index.ts packages/api-client/src/jobs.test.ts
git commit -m "feat: add jobs/devices api-client and switch creation to job endpoints"
```

---

## Task 11: useGenerationJob 폴링 훅

**Files:**
- Create: `apps/web/lib/hooks/useGenerationJob.ts`

- [ ] **Step 1: 훅 작성**

Create `apps/web/lib/hooks/useGenerationJob.ts`:

```typescript
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { getJob } from '@sajuguri/api-client'

export interface UseGenerationJob {
  loading: boolean
  error: boolean
  /** job_id를 받아 완료까지 폴링. 완료 시 onDone(jobType, resultId) 호출. */
  start: (jobId: number) => void
}

const POLL_MS = 2500
const MAX_TRIES = 96 // ≈ 4분

export function useGenerationJob(
  onDone: (jobType: string, resultId: number) => void,
): UseGenerationJob {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tries = useRef(0)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => clear, [clear])

  const start = useCallback(
    (jobId: number) => {
      setLoading(true)
      setError(false)
      tries.current = 0

      const poll = async () => {
        tries.current += 1
        try {
          const job = await getJob(api, jobId)
          if (job.status === 'done' && job.result_id != null) {
            clear()
            onDone(job.job_type, job.result_id)
            return
          }
          if (job.status === 'failed') {
            clear()
            setLoading(false)
            setError(true)
            return
          }
        } catch {
          // 일시 네트워크 오류는 무시하고 재시도
        }
        if (tries.current >= MAX_TRIES) {
          clear()
          setLoading(false)
          setError(true)
          return
        }
        timer.current = setTimeout(poll, POLL_MS)
      }

      poll()
    },
    [clear, onDone],
  )

  return { loading, error, start }
}
```

- [ ] **Step 2: 타입체크**

Run: `cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add "apps/web/lib/hooks/useGenerationJob.ts"
git commit -m "feat: add useGenerationJob polling hook"
```

---

## Task 12: report/new 페이지 전환

**Files:**
- Modify: `apps/web/app/[locale]/report/new/page.tsx`

- [ ] **Step 1: import 교체**

`createReport, listReports` import를 제거하고 추가:
```typescript
import { createReportJob } from '@sajuguri/api-client'
import { useGenerationJob } from '@/lib/hooks/useGenerationJob'
```

- [ ] **Step 2: 컴포넌트 내부 — 훅 연결 + handleSubmit 교체 + 복구 함수 제거**

`ReportNewPage` 컴포넌트에서:
- `const [loading, setLoading] = useState(false)` 줄을 제거(훅의 loading 사용).
- 훅 추가 (router 선언 아래):
```typescript
  const { loading, error: jobError, start } = useGenerationJob((_type, resultId) => {
    router.replace(`/report/${resultId}`)
  })
```
- `handleSubmit`을 교체:
```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const birthInput = buildBirthInput()
    if (!birthInput) {
      setError(t('errorMissingBirth'))
      return
    }
    setError('')
    try {
      const profileId = searchParams.get('profile_id')
      const { job_id } = await createReportJob(api, {
        birth_input: birthInput,
        ...(topics.trim() ? { request_topics: topics.trim() } : {}),
        ...(profileId ? { profile_id: Number(profileId) } : {}),
        language: locale,
      })
      start(job_id)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) setError(t('errorLogin'))
      else if (status === 429) setError(t('errorLimit'))
      else setError(t('errorFallback'))
    }
  }
```
- `recoverRecentReport` 함수 **전체 삭제**.
- 폴링 실패(jobError) 시 에러 노출: 로딩 화면 분기 위에 추가:
```typescript
  useEffect(() => {
    if (jobError) setError(t('errorFallback'))
  }, [jobError, t])
```
- 로딩 화면 분기 `if (loading)`는 그대로(훅의 loading 사용). `setLoading` 참조가 남아있지 않은지 확인하고 모두 제거.

- [ ] **Step 3: 타입체크**

Run: `cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit`
Expected: 에러 없음. (`setLoading` 잔존 참조가 있으면 에러로 잡힌다 — 모두 제거.)

- [ ] **Step 4: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add "apps/web/app/[locale]/report/new/page.tsx"
git commit -m "feat: poll report generation job in report/new"
```

---

## Task 13: 궁합 생성 2곳 전환

**Files:**
- Modify: `apps/web/app/[locale]/compatibility/new/page.tsx`
- Modify: `apps/web/components/chat/CompatibilityReportCTA.tsx`

- [ ] **Step 1: compatibility/new 페이지 전환**

`apps/web/app/[locale]/compatibility/new/page.tsx` (line 9, 74 참조):
- import 교체: `createCompatibilityReport` → `createCompatibilityJob`, `useGenerationJob` 추가.
- 훅 연결: 완료 시 `router.replace('/compatibility/' + resultId)` (이 페이지의 라우터/네비 변수명에 맞춰 사용).
- 생성 호출부(line 74 부근) `const report = await createCompatibilityReport(api, {...})` → 
```typescript
  const { job_id } = await createCompatibilityJob(api, { /* 기존 body 그대로 */ })
  start(job_id)
```
- 기존에 `report.id`로 라우팅하던 줄 제거(훅 onDone이 담당).
- 로딩/에러 상태를 훅의 `loading`/`error`로 연결(기존 local loading state 정리).

> 이 파일의 정확한 상태 변수·네비 패턴은 파일을 열어 report/new와 동일한 구조로 맞춘다.

- [ ] **Step 2: CompatibilityReportCTA 전환**

`apps/web/components/chat/CompatibilityReportCTA.tsx` (line 11, 29 참조):
- import: `createCompatibilityFromSession` → `createCompatibilityJobFromSession`, `useGenerationJob` 추가.
- 훅 연결: 완료 시 해당 컴포넌트가 쓰던 네비게이션(예: `router.push('/compatibility/' + resultId)`)로 이동.
- `const detail = await createCompatibilityFromSession(api, sessionId)` →
```typescript
  const { job_id } = await createCompatibilityJobFromSession(api, sessionId)
  start(job_id)
```
- 이후 `detail.id` 사용 줄을 onDone 기반으로 교체. 버튼 로딩 상태를 훅 `loading`과 연결.

- [ ] **Step 3: 타입체크**

Run: `cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add "apps/web/app/[locale]/compatibility/new/page.tsx" "apps/web/components/chat/CompatibilityReportCTA.tsx"
git commit -m "feat: poll compatibility generation jobs in new page and chat CTA"
```

---

## Task 14: 배포 — worker 서비스 + env (SSH, 레포 밖)

이 태스크는 서버에서 수행하며 실기기/실서비스에 영향을 준다. 코드 머지(dev→main) 후 진행한다. **승인 필요.**

**Files (서버):**
- `~/servers/docker-compose.yml` — `sajuguri-worker` 서비스 추가
- `~/servers/sajuguri/backend.env` — `REDIS_URL` 추가
- GitHub Secret `BACKEND_ENV` — `REDIS_URL` 동기화
- `.github/workflows/deploy-backend.yml` — worker도 `up -d`

- [ ] **Step 1: backend.env에 REDIS_URL 추가 (서버)**

```bash
ssh home-server 'grep -q REDIS_URL ~/servers/sajuguri/backend.env || echo "REDIS_URL=redis://redis:6379/2" >> ~/servers/sajuguri/backend.env'
```

- [ ] **Step 2: compose에 worker 서비스 추가 (서버)**

`~/servers/docker-compose.yml`의 `sajuguri-backend` 서비스 정의를 참고해 동일 이미지/네트워크로 worker 추가. backend 블록 아래에 삽입(들여쓰기 정확히):

```yaml
  sajuguri-worker:
    image: servers-sajuguri-backend
    container_name: sajuguri-worker
    restart: always
    command: arq worker.WorkerSettings
    env_file:
      - ./sajuguri/backend.env
    networks:
      - blueming-net
    depends_on:
      - redis
```
> 실제 backend 서비스의 `image`/`env_file`/`networks` 키 이름을 그대로 따른다(파일을 먼저 열어 확인). `redis`가 같은 compose에 있으므로 `depends_on: redis` 가능.

- [ ] **Step 3: 마이그레이션 적용 + 기동 (서버)**

```bash
# 백엔드 재기동 시 main.py의 create_all이 generation_jobs/device_tokens를 이미 생성한다.
# 따라서 alembic은 upgrade가 아니라 stamp로 버전만 맞춘다(upgrade 시 DuplicateTable).
ssh home-server 'cd ~/servers && docker compose exec sajuguri-backend alembic stamp head && docker compose up -d sajuguri-worker'
```
> `alembic upgrade head`는 create_all이 이미 만든 테이블 때문에 DuplicateTable로 실패한다(로컬에서 확인됨). 신규 테이블은 create_all이 만들고 alembic은 `stamp`로 reconcile만. worker 로그 확인: `docker compose logs --tail 30 sajuguri-worker` → arq가 redis 연결·큐 리슨 로그.

- [ ] **Step 4: BACKEND_ENV 시크릿 동기화 + CI worker 기동**

- GitHub `BACKEND_ENV` 시크릿에 `REDIS_URL=redis://redis:6379/2` 한 줄 추가.
- `.github/workflows/deploy-backend.yml`의 배포 스크립트에서 `docker compose up -d sajuguri-backend` 뒤에 `sajuguri-worker`도 포함되도록 수정(예: `docker compose up -d sajuguri-backend sajuguri-worker`). 백엔드 이미지 재빌드 시 worker도 같은 이미지를 쓰므로 함께 재기동돼야 한다.

- [ ] **Step 5: 스모크 테스트 (프로덕션)**

로그인 상태로 리포트 생성을 한 번 돌려 202+job_id → 폴링 → 완료 이동까지 확인. worker 로그에 job 처리 라인 확인.

- [ ] **Step 6: 커밋 (CI 워크플로 변경분)**

```bash
cd /home/rheon/Desktop/projects/SajuGuri
git add .github/workflows/deploy-backend.yml
git commit -m "ci: start sajuguri-worker container on backend deploy"
```
> 워크플로 실제 경로는 레포 루트 `.github/workflows/deploy-backend.yml`. 현재 내용: `docker compose build --no-cache sajuguri-backend` + `docker compose up -d sajuguri-backend` (alembic 단계 없음 — 신규 테이블은 main.py의 `Base.metadata.create_all`이 기동 시 생성). worker도 같은 이미지를 쓰므로 `up -d sajuguri-backend sajuguri-worker`로 함께 재기동되게 한다.
> compose·env·시크릿은 레포 밖이라 커밋 대상 아님(메모리/문서로만 기록).

---

## 최종 검증

- [ ] 전체 백엔드 테스트:
```bash
cd /home/rheon/Desktop/projects/SajuGuri/backend && UV_PROJECT_ENVIRONMENT=/tmp/sajuguri-venv uv run pytest -q
```
Expected: 전체 PASS (신규 포함, 기존 회귀 없음).

- [ ] 프론트 타입체크:
```bash
cd /home/rheon/Desktop/projects/SajuGuri/apps/web && npx tsc --noEmit
cd /home/rheon/Desktop/projects/SajuGuri/packages/api-client && npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] dev → main 머지 후 배포(Task 14)는 사용자 승인 하에 진행.
