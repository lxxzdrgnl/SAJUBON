PHOENIX_OTLP_ENDPOINT := http://localhost:4318/v1/traces
PHOENIX_PROJECT_NAME := sajuguri-chat

# ─── 일반 개발 ───────────────────────────────────────────────────────────────

dev:
	uv run uvicorn main:app --reload --port 8000

# ─── IQHub 트레이싱 (my-own-phoenix가 실행 중일 때만) ────────────────────────
# IQHub 시작: cd /home/rheon/Desktop/projects/my-own-phoenix && docker compose up -d
# IQHub 대시보드: http://localhost:3000

install-phoenix:
	uv sync --group observability

dev-phoenix:
	PHOENIX_ENABLED=true \
	PHOENIX_OTLP_ENDPOINT=$(PHOENIX_OTLP_ENDPOINT) \
	PHOENIX_PROJECT_NAME=$(PHOENIX_PROJECT_NAME) \
	uv run uvicorn main:app --reload --port 8000
