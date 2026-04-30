"""앱 설정 — pydantic-settings 기반 환경변수 관리."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Embedding / RAG
    embedding_provider: str = "gemini"
    embedding_model: str = "gemini-embedding-001"
    chroma_path: str = "./chroma_db"

    # DB (PostgreSQL)
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/sajuguri"

    # Server
    port: int = 8000

    # Google OAuth (Authorization Code Flow)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Frontend URL (OAuth 완료 후 리다이렉트)
    frontend_url: str = "http://localhost:3000"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15  # 15분 (short-lived)
    refresh_token_expire_days: int = 30  # 30일

    # Observability — IQHub / Arize Phoenix (optional)
    # IQHub: cd /home/rheon/Desktop/projects/my-own-phoenix && docker compose up -d
    # 포트: 4318 = OTLP HTTP (트레이스 수신), 6006 = Phoenix UI, 3000 = IQHub 대시보드
    phoenix_enabled: bool = False
    phoenix_endpoint: str = "http://localhost:4318/v1/traces"
    phoenix_project: str = "sajuguri-chat"

    @property
    def postgres_url(self) -> str:
        """LangGraph AsyncPostgresSaver용 psycopg3 URL."""
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
