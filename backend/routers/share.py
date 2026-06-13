"""공유 링크 생성/조회 — 비로그인 접근 가능."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from crud.profile import get_profile_or_404
from crud.share import (
    create_shared_result,
    get_shared_result_or_404,
)
from db.models import User
from dependencies.auth import get_optional_user
from dependencies.db import get_db
from schemas.share import ShareCreate, ShareResponse, SharedResultResponse

router = APIRouter(prefix="/api/share", tags=["공유"])


@router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED, summary="공유 링크 생성")
async def create_share(
    request: Request,
    body: ShareCreate,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if body.profile_id is not None:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
        await get_profile_or_404(db, body.profile_id, user.id)

    if body.profile_id is None and not body.birth_input:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="profile_id 또는 birth_input 중 하나는 필수입니다.")

    shared = await create_shared_result(db, body.profile_id, body.birth_input, body.calc_snapshot)
    return ShareResponse(
        share_token=shared.share_token,
        share_url=f"{settings.frontend_url}/share/{shared.share_token}",
        created_at=shared.created_at,
    )


@router.get("/{token}", response_model=SharedResultResponse, summary="공유 결과 조회 (비로그인 가능)")
async def get_share(token: str, db: AsyncSession = Depends(get_db)):
    return await get_shared_result_or_404(db, token)
