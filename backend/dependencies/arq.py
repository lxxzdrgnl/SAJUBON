"""arq redis 풀 의존성 — main lifespan이 app.state.arq에 넣어둔다."""
from __future__ import annotations

from fastapi import Request


def get_arq(request: Request):
    """enqueue용 ArqRedis 풀."""
    return request.app.state.arq
