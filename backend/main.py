"""사주구리 FastAPI 진입점."""

from dotenv import load_dotenv
load_dotenv()

import logging
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from core.config import settings
from core.errors import ErrorCode, ErrorResponse, http_status
from core.exceptions import AppException
from db.models import Base
from db.session import engine
from core.middleware import AccessLogMiddleware
from routers import saju, cities, auth, profiles, share, question, chat, reports, daily_story, compatibility

# ─── 로깅 설정 ───────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("sajubon")

# ─── Observability (Phoenix) ─────────────────────────────────────────────────

def _setup_phoenix() -> None:
    """IQHub(my-own-phoenix) 연동. PHOENIX_ENABLED=true 일 때만 활성화."""
    if not settings.phoenix_enabled:
        return
    try:
        import os
        from openinference.instrumentation.langchain import LangChainInstrumentor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor

        os.environ["PHOENIX_PROJECT_NAME"] = settings.phoenix_project_name

        tracer_provider = TracerProvider()
        tracer_provider.add_span_processor(
            SimpleSpanProcessor(OTLPSpanExporter(endpoint=settings.phoenix_otlp_endpoint))
        )
        LangChainInstrumentor().instrument(tracer_provider=tracer_provider)
        logger.info("IQHub tracing enabled → %s (project: %s)", settings.phoenix_otlp_endpoint, settings.phoenix_project_name)
    except ImportError:
        logger.warning(
            "PHOENIX_ENABLED=true 지만 패키지가 없습니다. "
            "uv add openinference-instrumentation-langchain opentelemetry-exporter-otlp-proto-http opentelemetry-sdk"
        )


_setup_phoenix()

# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("DB 연결 실패 (create_all 건너뜀): %s", e)

    async with AsyncPostgresSaver.from_conn_string(settings.postgres_url) as checkpointer:
        await checkpointer.setup()
        app.state.checkpointer = checkpointer
        yield

# ─── FastAPI 앱 ──────────────────────────────────────────────────────────────

app = FastAPI(
    lifespan=lifespan,
    title="사주구리 API",
    version="0.1.0",
    description="AI 사주 상담 서비스 — 사주팔자 계산·궁합·오늘의 운세·한줄 상담",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── 미들웨어 ────────────────────────────────────────────────────────────────

app.add_middleware(AccessLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

# ─── 예외 핸들러 ─────────────────────────────────────────────────────────────

def _error_json(req: Request, code: ErrorCode, message: str, details: dict | None = None) -> JSONResponse:
    body = ErrorResponse.make(code=code, message=message, path=req.url.path, details=details)
    origin = req.headers.get("origin", "*")
    return JSONResponse(
        status_code=http_status(code),
        content=body.model_dump(),
        headers={"Access-Control-Allow-Origin": origin},
    )


@app.exception_handler(AppException)
async def app_exception_handler(req: Request, exc: AppException) -> JSONResponse:
    return _error_json(req, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(req: Request, exc: RequestValidationError) -> JSONResponse:
    details = {}
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err["loc"] if loc != "body")
        details[field] = err["msg"]
    return _error_json(
        req,
        ErrorCode.VALIDATION_FAILED,
        "입력값 검증에 실패했습니다.",
        details,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(req: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception: %s %s\n%s",
        req.method,
        req.url.path,
        traceback.format_exc(),
    )
    return _error_json(
        req,
        ErrorCode.INTERNAL_SERVER_ERROR,
        "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    )


# ─── 라우터 ──────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(saju.router)
app.include_router(cities.router)
app.include_router(profiles.router)
app.include_router(share.router)
app.include_router(compatibility.router)
# app.include_router(daily.router)           # 구현 예정
app.include_router(question.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(reports.share_router)
app.include_router(daily_story.router)


@app.get("/health", tags=["상태 확인"])
async def health():
    return {"status": "ok"}
