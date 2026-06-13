FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# 의존성 레이어 캐싱
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --group observability

COPY . .

EXPOSE 8000

# 컨테이너 시작 시 DB 마이그레이션 후 서버 실행
CMD ["sh", "-c", "\
  for i in $(seq 1 10); do \
    uv run alembic upgrade head && break; \
    echo \"[retry $i/10] DB not ready, waiting 3s...\"; \
    sleep 3; \
  done && \
  uv run uvicorn main:app --host 0.0.0.0 --port 8000"]
