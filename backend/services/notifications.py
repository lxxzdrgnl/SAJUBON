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

    for msg, ticket in zip(messages, tickets):
        details = (ticket or {}).get("details") or {}
        if ticket.get("status") == "error" and details.get("error") == "DeviceNotRegistered":
            await dt_crud.delete_token(db, msg["to"])
