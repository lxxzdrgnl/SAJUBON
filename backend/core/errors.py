"""표준 에러 코드 정의 및 에러 응답 스키마."""

from __future__ import annotations
from enum import Enum
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    # 400 Bad Request
    BAD_REQUEST           = "BAD_REQUEST"
    VALIDATION_FAILED     = "VALIDATION_FAILED"
    INVALID_DATE_FORMAT   = "INVALID_DATE_FORMAT"
    INVALID_BIRTH_YEAR    = "INVALID_BIRTH_YEAR"
    INVALID_QUERY_PARAM   = "INVALID_QUERY_PARAM"
    # 401 Unauthorized
    UNAUTHORIZED          = "UNAUTHORIZED"
    TOKEN_EXPIRED         = "TOKEN_EXPIRED"
    OAUTH_FAILED          = "OAUTH_FAILED"
    # 403 Forbidden
    FORBIDDEN             = "FORBIDDEN"
    # 404 Not Found
    RESOURCE_NOT_FOUND    = "RESOURCE_NOT_FOUND"
    REPORT_NOT_FOUND      = "REPORT_NOT_FOUND"
    USER_NOT_FOUND        = "USER_NOT_FOUND"
    CHAT_SESSION_NOT_FOUND = "CHAT_SESSION_NOT_FOUND"
    # 409 Conflict
    DUPLICATE_RESOURCE    = "DUPLICATE_RESOURCE"
    STATE_CONFLICT        = "STATE_CONFLICT"
    # 422 Unprocessable Entity
    UNPROCESSABLE_ENTITY  = "UNPROCESSABLE_ENTITY"
    CALC_FAILED           = "CALC_FAILED"
    # 429 Too Many Requests
    TOO_MANY_REQUESTS     = "TOO_MANY_REQUESTS"
    # 500 Internal Server Error
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    DATABASE_ERROR        = "DATABASE_ERROR"
    UNKNOWN_ERROR         = "UNKNOWN_ERROR"


# HTTP 상태 코드 매핑
_STATUS_MAP: dict[ErrorCode, int] = {
    ErrorCode.BAD_REQUEST:           400,
    ErrorCode.VALIDATION_FAILED:     400,
    ErrorCode.INVALID_DATE_FORMAT:   400,
    ErrorCode.INVALID_BIRTH_YEAR:    400,
    ErrorCode.INVALID_QUERY_PARAM:   400,
    ErrorCode.UNAUTHORIZED:          401,
    ErrorCode.TOKEN_EXPIRED:         401,
    ErrorCode.OAUTH_FAILED:          401,
    ErrorCode.FORBIDDEN:             403,
    ErrorCode.RESOURCE_NOT_FOUND:    404,
    ErrorCode.REPORT_NOT_FOUND:      404,
    ErrorCode.USER_NOT_FOUND:        404,
    ErrorCode.CHAT_SESSION_NOT_FOUND: 404,
    ErrorCode.DUPLICATE_RESOURCE:    409,
    ErrorCode.STATE_CONFLICT:        409,
    ErrorCode.UNPROCESSABLE_ENTITY:  422,
    ErrorCode.CALC_FAILED:           422,
    ErrorCode.TOO_MANY_REQUESTS:     429,
    ErrorCode.INTERNAL_SERVER_ERROR: 500,
    ErrorCode.DATABASE_ERROR:        500,
    ErrorCode.UNKNOWN_ERROR:         500,
}


def http_status(code: ErrorCode) -> int:
    return _STATUS_MAP.get(code, 500)


class ErrorResponse(BaseModel):
    """모든 에러 응답의 공통 포맷."""

    timestamp: str = Field(
        description="에러 발생 시각 (ISO 8601 UTC)",
        examples=["2025-08-17T11:00:00Z"],
    )
    path: str = Field(
        description="요청 경로",
        examples=["/api/saju/calc"],
    )
    status: int = Field(
        description="HTTP 상태 코드",
        examples=[422],
    )
    code: str = Field(
        description="시스템 내부 에러 코드 (대문자+언더스코어)",
        examples=["VALIDATION_FAILED"],
    )
    message: str = Field(
        description="사용자에게 전달할 짧은 에러 메시지",
        examples=["birth_date 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요."],
    )
    details: dict | None = Field(
        default=None,
        description="필드별 오류나 내부 상세 사유 (선택)",
        examples=[{"birth_date": "입력값: '1990/03/15' — 허용 형식: YYYY-MM-DD"}],
    )

    @classmethod
    def make(
        cls,
        code: ErrorCode,
        message: str,
        path: str,
        details: dict | None = None,
    ) -> "ErrorResponse":
        return cls(
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            path=path,
            status=http_status(code),
            code=code.value,
            message=message,
            details=details,
        )


# ─── Swagger 예시 응답 (routers에서 responses= 파라미터로 재사용) ──────────────

def _ex(code: ErrorCode, message: str, details: dict | None = None) -> dict:
    return {
        "timestamp": "2025-08-17T11:00:00Z",
        "path": "/api/saju/calc",
        "status": http_status(code),
        "code": code.value,
        "message": message,
        "details": details,
    }


SWAGGER_ERRORS: dict[int, dict] = {
    400: {
        "description": "잘못된 요청 형식",
        "content": {"application/json": {"example": _ex(
            ErrorCode.BAD_REQUEST,
            "요청 형식이 올바르지 않습니다.",
            {"birth_date": "입력값: '1990/03/15' — 허용 형식: YYYY-MM-DD"},
        )}},
    },
    401: {
        "description": "인증 실패",
        "content": {"application/json": {"example": _ex(
            ErrorCode.UNAUTHORIZED,
            "인증 토큰이 없거나 유효하지 않습니다.",
        )}},
    },
    403: {
        "description": "접근 권한 없음",
        "content": {"application/json": {"example": _ex(
            ErrorCode.FORBIDDEN,
            "해당 리소스에 접근할 권한이 없습니다.",
        )}},
    },
    404: {
        "description": "리소스 없음",
        "content": {"application/json": {"example": _ex(
            ErrorCode.REPORT_NOT_FOUND,
            "해당 share_token으로 저장된 리포트를 찾을 수 없습니다.",
            {"share_token": "a1b2c3d4-..."},
        )}},
    },
    422: {
        "description": "입력값 검증 실패",
        "content": {"application/json": {"example": _ex(
            ErrorCode.VALIDATION_FAILED,
            "입력값 검증에 실패했습니다.",
            {
                "birth_date": "지원 연도 범위: 1900~2100, 입력값: 1800-01-01",
                "gender": "허용값: male | female, 입력값: 'M'",
            },
        )}},
    },
    500: {
        "description": "서버 내부 오류",
        "content": {"application/json": {"example": _ex(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        )}},
    },
}
