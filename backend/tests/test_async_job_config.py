"""비동기 job 파이프라인 설정 기본값 검증."""
from core.config import settings


def test_redis_and_worker_defaults():
    assert settings.redis_url.startswith("redis://")
    assert settings.gen_worker_max_jobs == 8
    assert settings.gen_job_stale_minutes == 10
    # 선택 설정 — 기본 None
    assert settings.expo_access_token is None
