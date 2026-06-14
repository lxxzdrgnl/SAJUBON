"""GenerationJob / DeviceToken 모델 스키마 검증 (메타데이터 레벨)."""
from db.models import GenerationJob, DeviceToken


def test_generation_job_columns():
    cols = GenerationJob.__table__.columns.keys()
    for c in ("id", "user_id", "job_type", "status", "payload",
              "result_id", "error", "created_at", "updated_at"):
        assert c in cols, c


def test_device_token_columns_and_unique():
    cols = DeviceToken.__table__.columns.keys()
    for c in ("id", "user_id", "platform", "token", "created_at"):
        assert c in cols, c
    uniques = [
        tuple(sorted(col.name for col in c.columns))
        for c in DeviceToken.__table__.constraints
        if c.__class__.__name__ == "UniqueConstraint"
    ]
    assert ("token", "user_id") in uniques
