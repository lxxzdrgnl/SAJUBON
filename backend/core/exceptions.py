"""커스텀 예외 클래스 — ErrorCode와 1:1 매핑."""

from __future__ import annotations
from core.errors import ErrorCode


class AppException(Exception):
    """모든 커스텀 예외의 베이스 클래스."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class ValidationException(AppException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(ErrorCode.VALIDATION_FAILED, message, details)


class InvalidDateFormatException(AppException):
    def __init__(self, value: str):
        super().__init__(
            ErrorCode.INVALID_DATE_FORMAT,
            f"날짜 형식이 올바르지 않습니다: '{value}' — YYYY-MM-DD 형식으로 입력하세요.",
            {"input": value, "expected_format": "YYYY-MM-DD"},
        )


class InvalidBirthYearException(AppException):
    def __init__(self, year: int):
        super().__init__(
            ErrorCode.INVALID_BIRTH_YEAR,
            f"지원하지 않는 연도입니다: {year} — 허용 범위: 1900~2100",
            {"year": year, "allowed_range": "1900~2100"},
        )


class CalcFailedException(AppException):
    def __init__(self, detail: str):
        super().__init__(
            ErrorCode.CALC_FAILED,
            "사주 계산 중 오류가 발생했습니다.",
            {"detail": detail},
        )


class ReportNotFoundException(AppException):
    def __init__(self, token: str):
        super().__init__(
            ErrorCode.REPORT_NOT_FOUND,
            "해당 공유 링크로 저장된 리포트를 찾을 수 없습니다.",
            {"share_token": token},
        )


class UnauthorizedException(AppException):
    def __init__(self):
        super().__init__(
            ErrorCode.UNAUTHORIZED,
            "인증 토큰이 없거나 유효하지 않습니다.",
        )


class TokenExpiredException(AppException):
    def __init__(self):
        super().__init__(
            ErrorCode.TOKEN_EXPIRED,
            "토큰이 만료되었습니다. 다시 로그인해주세요.",
        )


class OAuthFailedException(AppException):
    def __init__(self, detail: str = ""):
        super().__init__(
            ErrorCode.OAUTH_FAILED,
            "Google 인증에 실패했습니다.",
            {"detail": detail} if detail else None,
        )


class ForbiddenException(AppException):
    def __init__(self):
        super().__init__(
            ErrorCode.FORBIDDEN,
            "해당 리소스에 접근할 권한이 없습니다.",
        )


class DatabaseException(AppException):
    def __init__(self, detail: str = ""):
        super().__init__(
            ErrorCode.DATABASE_ERROR,
            "데이터베이스 오류가 발생했습니다.",
            {"detail": detail} if detail else None,
        )


class LLMFailedException(AppException):
    """LLM 호출 또는 응답 파싱 실패 — 사용자 입력과 무관한 서버 오류."""

    def __init__(self, detail: str = ""):
        super().__init__(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            {"detail": detail} if detail else None,
        )


class ChatSessionNotFoundException(AppException):
    def __init__(self, session_id: str):
        super().__init__(
            ErrorCode.CHAT_SESSION_NOT_FOUND,
            "채팅 세션을 찾을 수 없습니다.",
            {"session_id": session_id},
        )
