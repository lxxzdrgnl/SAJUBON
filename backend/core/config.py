"""앱 설정 — pydantic-settings 기반 환경변수 관리."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM — 기본 OpenAI gpt-4.1 계열 (provider별 모델은 providers.get_llm 참고)
    llm_provider: str = "openai"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Embedding / RAG
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    chroma_path: str = "./chroma_db"

    # DB (PostgreSQL)
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/sajuguri"

    # Server
    port: int = 8000

    # Google OAuth (Authorization Code Flow)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Frontend URL (레거시 Nuxt — OAuth 완료 후 쿼리 토큰 리다이렉트)
    frontend_url: str = "http://localhost:3000"

    # Web URL (신규 Next.js — OAuth 완료 후 httpOnly 쿠키 + 리다이렉트)
    web_url: str = "http://localhost:3001"

    # 쿠키 보안 플래그 — prod(HTTPS)에서 COOKIE_SECURE=true
    cookie_secure: bool = False

    # 리포트 일일 생성 한도 (None = 무제한)
    report_daily_limit: int | None = None

    # 운세 스토리 게스트 어뷰즈 대비 IP별 일일 한도 (None = 무제한) — 자리만, 미사용
    daily_story_guest_limit_per_ip: int | None = None

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15  # 15분 (short-lived)
    refresh_token_expire_days: int = 30  # 30일

    # Observability — IQHub / Arize Phoenix (optional)
    # IQHub: cd /home/rheon/Desktop/projects/my-own-phoenix && docker compose up -d
    # 포트: 4318 = OTLP HTTP (트레이스 수신), 6006 = Phoenix UI, 3000 = IQHub 대시보드
    phoenix_enabled: bool = False
    phoenix_otlp_endpoint: str = "http://localhost:4318/v1/traces"
    phoenix_project_name: str = "sajuguri-chat"

    @property
    def postgres_url(self) -> str:
        """LangGraph AsyncPostgresSaver용 psycopg3 URL."""
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
