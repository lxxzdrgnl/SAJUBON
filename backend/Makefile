PHOENIX_ENDPOINT := http://localhost:6006/v1/traces
PHOENIX_PROJECT := sajuguri-chat

# ─── 일반 개발 ───────────────────────────────────────────────────────────────

dev:
	uv run uvicorn main:app --reload --port 8000

# ─── Phoenix 트레이싱 (my-own-phoenix가 실행 중일 때만) ──────────────────────
# Phoenix 시작: cd /home/rheon/Desktop/projects/my-own-phoenix && docker compose up -d

dev-phoenix:
	PHOENIX_ENABLED=true \
	PHOENIX_ENDPOINT=$(PHOENIX_ENDPOINT) \
	PHOENIX_PROJECT=$(PHOENIX_PROJECT) \
	uv run uvicorn main:app --reload --port 8000
