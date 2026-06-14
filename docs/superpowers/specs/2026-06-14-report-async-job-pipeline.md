# 리포트 비동기 Job 파이프라인 설계 (Async Generation Jobs)

**작성일:** 2026-06-14
**상태:** 설계 승인 대기 → writing-plans
**범위:** 사주 리포트 + 궁합 리포트 (단일 큐, 태스크 함수 2개)

## 1. 목적 / 배경

무거운 LLM 생성(사주 리포트 ~34s, 궁합 리포트 ~30s+)이 현재 **동기**다. `POST`가 30~34초 블로킹 후 완성본을 반환한다. 관측된 실제 문제:

1. **모바일 타임아웃** — iOS Safari/네트워크가 대기 중 끊겨 "생성 실패"가 뜨지만 백엔드는 성공·저장한다. (현재 `recoverRecentReport` 폴링 땜질로 임시 대응 — 15초 한계·엉뚱한 리포트 선택 등 구멍 있음.)
2. **동시성 천장** — 한 요청이 DB 커넥션을 ~34초 점유(한도 체크 SELECT부터 최종 commit까지 트랜잭션 유지). 풀 기본 15개(pool 5 + overflow 10)를 전 엔드포인트가 공유 → **동시 ~15건이 천장.**
3. **푸시 불가** — 동기 흐름엔 서버측 "완료 시점"이 없어 앱 푸시를 붙일 자리가 없다.

**목표:** 사주·궁합 생성을 **비동기 Job 모델**로 전환해 위 셋을 근본 해결하고, **몇백 사용자** 규모를 수평 확장으로 감당하며, **앱 푸시 알림 토대**(provider-agnostic)를 미리 깔아 앱 출시 시 발송 코드만 끼우면 작동하게 한다.

## 2. 비목표 (YAGNI — 명시적 제외)

- SSE 진행률 스트리밍 (모바일 백그라운드 재연결 버그 표면만 넓힘. 폴링으로 충분)
- 기능별 큐 분리 / 우선순위 레인 (단일 큐가 OpenAI rate limit 총량 제어에 유리. 스타베이션 실제 발생 시 그때 분리)
- 크론 비트(스윕 제외) / 워커 오토스케일 / arq result backend 적극 활용(상태 진실은 Postgres)
- 전용 Redis 컨테이너 (기존 공유 redis 재사용)
- 특정 푸시 벤더 SDK 백엔드 통합 (provider-agnostic 토대만; 발송 구현은 앱 나올 때)
- 챗(이미 SSE), 한줄 상담·오늘의 운세(충분히 빠르면 동기 유지) — 이번 대상 아님

## 3. 아키텍처

```
POST /api/reports            (사주)        ┐
POST /api/compatibility      (궁합)        ├─ 공통 패턴:
POST /api/compatibility/from-session (궁합) ┘   한도/활성-job 체크 → generation_jobs 행 생성(pending)
                                                 → arq enqueue → 202 { job_id }

[arq 워커 — 별도 컨테이너, 단일 큐 sajuguri:jobs, max_jobs=8]
  generate_saju_report(job_id)      ┐ 둘 다:
  generate_compatibility(job_id)    ┘  job=running(자체 세션) → 파이프라인(~34s)
                                        → insert (saju_reports | compatibility_reports)
                                        → job=done, result_id=<생성 id>
                                        → notify_generation_done(job)   # 푸시 훅(지금 no-op)
                                        (예외 시) job=failed, error=...

GET /api/jobs/{job_id}  → { status, job_type, result_id?, error? }   # 두 기능 공용

[프론트]
  report/new          : createGenerationJob('saju', body) → job_id → 폴링 → /report/{result_id}
  compatibility 생성   : createGenerationJob('compatibility', body) → job_id → 폴링 → /compatibility/{result_id}
  공통 pollJob: 2.5초 간격, 상한 ~4분. job_type으로 이동 경로 분기.
  ※ 기존 recoverRecentReport 제거
```

**상태의 진실 = Postgres `generation_jobs`.** Redis는 전달용 큐로만 쓴다(전용 db 인덱스 2 + queue_name `sajuguri:jobs`). redis가 AOF 영속+noeviction이라 자체로도 durable하지만, 최종 권위는 DB. → redis 이슈에도 스윕으로 복구 가능, psql로 디버깅 가능.

**왜 단일 큐?** 사주·궁합 모두 같은 OpenAI 계정 TPM/RPM을 공유한다. 큐를 쪼개면 각자 `max_jobs`라 합산 시 한도 초과. 단일 큐 + 단일 `max_jobs`가 **동시 LLM 호출 총량을 한 곳에서 제어**하는 정답.

## 4. 데이터 모델 (alembic 0014 → 0015)

### `generation_jobs`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| user_id | int FK users | |
| job_type | str | `saju_report` / `compatibility` |
| status | str | `pending` / `running` / `done` / `failed` |
| payload | JSON | 생성 요청 본문 원본(타입별 구조 상이) |
| result_id | int nullable | done 시 해당 리포트 테이블의 id (cross-table라 FK 제약 없음) |
| error | str nullable | failed 시 |
| created_at / updated_at | datetime | |

인덱스: `(user_id, status)`(활성 job 조회), `(status, created_at)`(스윕).

### `device_tokens` (앱 푸시 토대 — Expo, 지금 미사용)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| user_id | int FK users | |
| platform | str | `ios` / `android` |
| token | str | **ExpoPushToken** (`ExponentPushToken[...]`) 문자열 |
| created_at | datetime | |

유니크: `(user_id, token)`. 등록은 upsert. 발송 시 Expo가 `DeviceNotRegistered` 응답하면 해당 토큰 삭제로 회전 처리.

## 5. 백엔드 컴포넌트 (3-layer 준수)

- `db/models.py` — `GenerationJob`, `DeviceToken` 추가.
- `crud/generation_jobs.py` — create / get / get_active_for_user / set_status(+result_id/error) / sweep_stale.
- `crud/device_tokens.py` — upsert / list_for_user / delete.
- `services/reports.py` — `create_report`를 **job 생성 + enqueue('generate_saju_report')**로 변경(파이프라인 직접 호출 제거).
- `services/compatibility.py` — `create_report`, `create_from_session`를 **job 생성 + enqueue('generate_compatibility')**로 변경. (from-session은 payload에 session_id 저장.)
- `services/jobs.py` (신규) — `get_job(job_id, user_id)` 조회 + 공통 enqueue 헬퍼. "활성 job 1개" 규칙(이미 pending/running이면 그 job 반환).
- `services/generation_runner.py` (신규) — 워커가 호출: `run_saju_report_job(job_id)`, `run_compatibility_job(job_id)`. 별도 세션으로 상태 전이 + 기존 파이프라인 호출 + insert + notify.
- `services/notifications.py` (신규) — `async def notify_generation_done(db, job)`: device_tokens 조회 → 없으면 no-op. **발송 자리만**(`# TODO(app): Expo Push API POST https://exp.host/--/api/v2/push/send`, 응답의 DeviceNotRegistered 토큰 삭제). 백엔드는 FCM/APNs 직접 안 건드림 — Expo가 중계.
- `worker.py` (신규) — arq `WorkerSettings`(functions=[두 함수], redis_settings(db=2), queue_name `sajuguri:jobs`, max_jobs=8, job_timeout=180, on_startup/shutdown 엔진 준비) + stale 스윕 cron.
- `routers/reports.py` / `routers/compatibility.py` — 생성 엔드포인트를 202 `{job_id}` 반환으로 변경.
- `routers/jobs.py` (신규) — `GET /api/jobs/{job_id}`.
- `routers/devices.py` (신규) — `POST /api/devices` 토큰 등록(로그인). 앱이 나중에 호출.
- `core/config.py` — `redis_url`, `gen_worker_max_jobs`(8), `gen_job_stale_minutes`(10).
- 앱 시작 시 arq redis 풀 생성(`app.state.arq`)해 라우터에서 enqueue.

## 6. API 계약 (packages/api-client)

- `createGenerationJob(api, type, body): Promise<{ job_id: number }>` — 또는 기능별 얇은 래퍼 `createReportJob` / `createCompatibilityJob`.
- `getJob(api, jobId): Promise<{ status: string; job_type: string; result_id?: number; error?: string }>`.
- `registerDeviceToken(api, { platform, token })` — 정의만, 지금 미호출.
- 기존 list/get/share 류 유지.

## 7. 프론트엔드 (apps/web)

- 공통 훅 `useGenerationJob` — submit → job_id → 로딩 화면 유지 + `pollJob`(2.5초, 상한 ~4분). done → job_type별 경로(`/report/{id}` or `/compatibility/{id}`), failed → 에러.
- `report/new`: `createReportJob` 사용, **`recoverRecentReport`/복구 폴링 제거**.
- 궁합 생성 화면(들): `createCompatibilityJob` 사용, 동일 폴링.
- 비로그인/한도는 기존대로(POST가 401/429 반환).

## 8. 스케일 (몇백 사용자)

- **처리량**: `max_jobs=8`(9번째부터 큐 대기 — HTTP는 즉시 202라 안 막힘; 대기자는 로딩 화면 유지). 부하 증가 시 **워커 컨테이너 복제**(같은 redis 큐 공유, 코드 0 변경).
- **DB 풀**: 요청이 34초 점유 안 하니 웹 풀 압박 급감. 워커는 자체 엔진(pool_size 10). 필요 시 웹 `pool_size=10, max_overflow=20`.
- **남용 방지**: 기존 일일 한도(429) + **사용자당 활성 job 1개**(있으면 그 job_id 반환).
- **OpenAI 429**: arq 지수 백오프 재시도 + `max_jobs`로 동시 호출 상한.
- **폴링 부하**: PK 단건 조회 — 무시 가능.
- **복구 스윕**: arq cron이 `running`/`pending`인데 `stale_minutes` 경과 job을 `failed` 처리(또는 1회 재투입).

## 9. 배포 / 인프라

- **기존 `redis` 컨테이너 재사용**(redis:7-alpine, `servers_blueming-net`). `command: redis-server --appendonly yes` — **패스워드 없음**, AOF ON(재시작 큐 보존), `noeviction`(키 자동삭제 없음 → 유실 위험 없음), 메모리 256M. backend가 `redis:6379`(172.19.0.11) 도달 확인됨.
- **격리**: redis `database=2` + queue_name `sajuguri:jobs` + 키 prefix.
- **워커 서비스 추가**: `~/servers/docker-compose.yml`(레포 밖)에 `sajuguri-worker` — backend와 **같은 이미지**, command `arq worker.WorkerSettings`, 같은 env·네트워크. 배포 시 SSH로 추가/기동.
- **env**: `backend.env` + `BACKEND_ENV` 시크릿에 `REDIS_URL=redis://redis:6379/2` 추가.
- CI(deploy-backend.yml): backend 이미지 재빌드 후 **backend·worker 둘 다 `up -d`**.

## 10. 에러 / 엣지 케이스

- enqueue 직후 워커 다운 → job `pending` 잔류 → 스윕 재투입/실패.
- 워커가 생성 중 크래시 → job `running` 잔류 → 스윕이 `stale_minutes` 후 정리.
- 사용자가 대기 중 이탈 → 생성 계속, 다음 방문 시 내 기록에 존재(앱이면 추후 푸시).
- 같은 입력 재요청/중복 클릭 → 활성 job 있으면 그 job_id 반환(중복 생성 방지).
- redis 다운 → enqueue 실패 → POST 503(프론트 재시도 안내). DB job은 생성 전이라 깔끔.
- 푸시 토큰 만료 → 발송 시 provider가 invalid 응답 → 해당 토큰 삭제(회전).

## 11. 테스트

- crud: generation_jobs 상태 전이 / get_active_for_user / sweep_stale; device_tokens upsert/delete.
- service: create_report·create_compatibility가 job 생성+enqueue(arq 모킹); run_*_job 성공/실패 경로(파이프라인 모킹) — 각 타입.
- 활성 job 1개 규칙: 두 번째 POST가 기존 job_id 반환.
- 라우터: 생성 POST 202 형태; `GET /api/jobs/{id}` 소유자/비소유자(403); job_type 반환 확인.
- notifications: 토큰 없을 때 no-op.
- 프론트: useGenerationJob done/failed·타입별 경로 분기.

## 12. 미해결 / 확인 필요

1. ~~Redis 비밀번호~~ — **해소: 비번 없음**. `REDIS_URL=redis://redis:6379/2`.
2. **OpenAI tier TPM/RPM** — `max_jobs=8` 확정(사용자 승인), tier 확인되면 조정.
3. **푸시 — Expo 확정.** 백엔드는 ExpoPushToken 저장 + Expo Push API 호출만(FCM/APNs 직접 안 건드림). 앱 단계 메모: iOS는 Apple 개발자 계정($99/년)+APNs, Android는 EAS에 FCM 자격증명 1회 등록 필요(코드 작업 아님, Expo가 전송 중계).
4. **`~/servers/docker-compose.yml`에 worker 서비스 추가** — 레포 밖이라 배포 시 SSH로 추가(승인 시).
