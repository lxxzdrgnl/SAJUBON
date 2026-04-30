PHOENIX_DIR := ../../my-own-phoenix
PHOENIX_ENDPOINT := http://localhost:6006/v1/traces
PHOENIX_PROJECT := sajuguri-chat

# ─── 일반 개발 ───────────────────────────────────────────────────────────────

dev:
	uv run uvicorn main:app --reload --port 8000

# ─── Phoenix 관찰 (원할 때만) ────────────────────────────────────────────────

phoenix-up:
	cd $(PHOENIX_DIR) && docker compose up -d phoenix
	@echo "Phoenix UI → http://localhost:6006"

phoenix-down:
	cd $(PHOENIX_DIR) && docker compose stop phoenix

dev-phoenix: phoenix-up
	PHOENIX_ENABLED=true \
	PHOENIX_ENDPOINT=$(PHOENIX_ENDPOINT) \
	PHOENIX_PROJECT=$(PHOENIX_PROJECT) \
	uv run uvicorn main:app --reload --port 8000

phoenix-logs:
	cd $(PHOENIX_DIR) && docker compose logs -f phoenix
