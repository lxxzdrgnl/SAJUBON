# 리포트 비동기 Job 파이프라인 설계 (Async Report Generation)

**작성일:** 2026-06-14
**상태:** 설계 승인 대기 → writing-plans

## 1. 목적 / 배경

리포트 생성이 현재 **동기**다. `POST /api/reports`가 ~34초 블로킹 후 완성된 리포트를 반환한다. 이로 인해 관측된 실제 문제:

1. **모바일 타임아웃** — iOS Safari/네트워크가 34초 대기 중 끊겨 "생성 실패"가 뜨지만, 백엔드는 성공·저장한다. (현재 `recoverRecentReport` 폴링 땜질로 임시 대응 중 — 15초 한계·엉뚱한 리포트 선택 등 구멍 있음.)
2. **동시성 천장** — 한 요청이 DB 커넥션을 ~34초 점유(한도 체크 SELECT부터 최종 commit까지 트랜잭션 유지). 풀이 기본 15개(pool 5 + overflow 10)이고 전 엔드포인트가 공유 → **동시 리포트 ~15건이 천장.**
3. **푸시 불가** — 동기 흐름엔 "완료 시점"이 없어 향후 네이티브 앱 푸시 알림을 붙일 자리가 없다.

**목표:** 리포트 생성을 **비동기 Job 모델**로 전환해 위 셋을 근본 해결하고, **몇백 사용자** 규모를 수평 확장으로 감당하며, **푸시 알림 토대**를 미리 깔아 앱 출시 시 드롭인으로 붙인다.

## 2. 비목표 (YAGNI — 명시적 제외)

over-engineering 방지를 위해 **이번 범위에서 하지 않는다:**

- SSE 진행률 스트리밍 (모바일 백그라운드 재연결 버그 표면만 넓힘. 폴링으로 충분)
- 여러 큐 / 우선순위 레인 / 크론 비트(스윕 제외) / 워커 오토스케일
- arq result backend 적극 활용 (상태의 진실은 Postgres)
- 전용 Redis 컨테이너 (기존 공유 redis 재사용)
- FCM/APNs 실제 발송 구현 (앱 없음 — 인터페이스·테이블·훅만)

## 3. 아키텍처

```
POST /api/reports
  → 한도 체크(429) + "활성 job 1개" 체크(409 대신 기존 job_id 반환)
  → report_jobs 행 생성 (status=pending), commit
  → arq enqueue_job('generate_report_job', job_id)
  → 202 { job_id }   (즉시 반환, 커넥션 점유 0)

[arq 워커 프로세스 — 별도 컨테이너]
  generate_report_job(job_id):
    세마포어/ max_jobs로 동시 제한
    job.status=running (자체 DB 세션)
    saju, writer, un_flow = run_saju_report_full(...)   # ~34초
    report = insert_report(...)
    job.status=done, job.report_id=report.id
    notify_report_done(job)   # 푸시 훅 — 지금은 no-op
    (예외 시) job.status=failed, job.error=str(e)

GET /api/reports/jobs/{job_id}
  → 소유자 검사 → { status, report_id?, error? }

[프론트 report/new]
  createReportJob(body) → { job_id }
  로딩 화면 유지 + 2~3초 폴링 GET /jobs/{job_id}
    done   → router.replace(/report/{report_id})
    failed → 에러 표시
    pending/running → 계속 (상한 N분)
  ※ 기존 recoverRecentReport 제거
```

**상태의 진실 = Postgres `report_jobs`.** Redis는 전달용 큐로만 쓴다 → redis 키가 evict돼도 DB 행이 남아 스윕으로 복구 가능(유실 아님). 디버깅도 psql로 가능.

## 4. 데이터 모델 (alembic 0014 → 0015)

### `report_jobs`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| user_id | int FK users | |
| status | str | `pending` / `running` / `done` / `failed` |
| birth_input | JSON | 생성 입력 원본 |
| request_topics | str nullable | |
| language | str default 'ko' | |
| profile_id | int nullable | |
| report_id | int FK saju_reports nullable | done 시 채움 |
| error | str nullable | failed 시 |
| created_at | datetime | |
| updated_at | datetime | |

인덱스: `(user_id, status)`, `(status, created_at)` (스윕·활성 job 조회용).

### `device_tokens` (푸시 토대 — 지금은 미사용)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| user_id | int FK users | |
| platform | str | `ios` / `android` / `web` |
| token | str | |
| created_at | datetime | |

유니크: `(user_id, token)`.

## 5. 백엔드 컴포넌트 (3-layer 준수)

- `db/models.py` — `ReportJob`, `DeviceToken` 모델 추가.
- `crud/report_jobs.py` — create / get / get_active_for_user / set_status / sweep_stale.
- `crud/device_tokens.py` — upsert / list_for_user.
- `services/reports.py` — `create_report`를 **job 생성 + enqueue**로 변경(파이프라인 직접 호출 제거). `get_report_job(job_id, user_id)` 추가.
- `services/report_jobs.py` (신규) — 워커가 호출하는 `run_report_job(job_id)`: 별도 세션으로 상태 전이 + `run_saju_report_full` + 저장 + notify.
- `services/notifications.py` (신규) — `async def notify_report_done(db, job)`: device_tokens 조회 → 없으면 no-op. FCM 발송은 `# TODO(app): FCM` 자리만.
- `worker.py` (신규) — arq `WorkerSettings`(functions, redis_settings, max_jobs, job_timeout=180, on_startup/shutdown로 엔진 준비), stale 스윕 cron.
- `routers/reports.py` — `POST ""` 202 + `GET /jobs/{job_id}` 추가.
- `routers/devices.py` (신규) — `POST /api/devices` 토큰 등록(로그인). 앱이 나중에 호출.
- `core/config.py` — `redis_url`, `report_worker_max_jobs`(기본 8), `report_job_stale_minutes`(기본 10) 추가.
- 앱 시작 시 arq redis 풀 생성(`app.state.arq`)해 라우터에서 enqueue.

## 6. API 계약 변경 (packages/api-client)

- `createReport` → `createReportJob(api, body): Promise<{ job_id: number }>` (POST, 202).
- `getReportJob(api, jobId): Promise<{ status: string; report_id?: number; error?: string }>`.
- `registerDeviceToken(api, body)` — 정의만, 지금 미호출.
- 기존 `listReports/getReport` 등 유지.

## 7. 프론트엔드 (apps/web report/new)

- `handleSubmit`: `createReportJob` → 로딩 화면 유지 → `pollJob(job_id)`.
- `pollJob`: 2.5초 간격, 최대 ~4분 상한. done → `/report/{report_id}`, failed → 에러, 그 외 계속.
- **`recoverRecentReport` 및 `listReports` 복구 로직 제거** (job_id로 정확 추적).
- 비로그인/한도 처리는 기존 유지(POST가 401/429 그대로 반환).

## 8. 스케일 (몇백 사용자)

- **처리량**: arq `max_jobs=8~12`(OpenAI rate limit에 맞춤). 부하 증가 시 **워커 컨테이너 복제**(같은 redis 큐 공유, 코드 0 변경).
- **DB 풀**: 요청이 34초 점유 안 하므로 웹 풀 압박 급감. 워커는 자체 엔진(pool_size 10). 필요 시 웹 엔진 `pool_size=10, max_overflow=20`로 상향.
- **남용 방지**: 일일 한도(429) 유지 + **사용자당 활성 job 1개**(pending/running 있으면 그 job_id 반환).
- **OpenAI 429**: arq 재시도(지수 백오프), `max_jobs`로 동시 호출 상한.
- **폴링 부하**: PK 단건 조회 — 무시 가능.
- **복구 스윕**: arq cron이 `running`/`pending`인데 `stale_minutes` 경과 job을 `failed` 처리(또는 1회 재투입).

## 9. 배포 / 인프라

- **기존 `redis` 컨테이너(redis:7-alpine, `servers_blueming-net`) 재사용.** `sajuguri-backend`는 같은 네트워크에서 `redis:6379` 도달 확인됨(172.19.0.11).
- **격리**: 전용 redis DB 인덱스(예: `database=2`) + arq queue_name `sajuguri:reports` + 키 prefix로 블로그/블루밍과 충돌 방지.
- **워커 서비스 추가**: `~/servers/docker-compose.yml`(레포 밖)에 `sajuguri-worker` — 백엔드와 **같은 이미지**, command `arq worker.WorkerSettings`, 같은 env·네트워크. 배포 시 SSH로 추가/기동.
- **env**: `backend.env` + `BACKEND_ENV` 시크릿에 `REDIS_URL=redis://:<pw>@redis:6379/2` 추가. (비번 있으면 사용자 제공.)
- CI(deploy-backend.yml)는 backend 이미지 재빌드 후 backend·worker 둘 다 `up -d` 필요.

## 10. 에러 / 엣지 케이스

- enqueue 직후 워커 다운 → job `pending` 잔류 → 스윕이 재투입/실패.
- 워커가 생성 중 크래시 → job `running` 잔류 → 스윕이 `stale_minutes` 후 정리.
- 사용자가 대기 중 페이지 이탈 → 생성은 계속, 다음 방문 시 내 기록에 존재(앱이면 추후 푸시).
- 같은 입력 재요청 → 활성 job 있으면 그 job_id 반환(중복 생성 방지).
- redis 다운 → enqueue 실패 → POST가 503 반환(프론트 재시도 안내). DB job은 생성 전이라 깔끔.

## 11. 테스트

- crud: report_jobs 상태 전이 / get_active_for_user / sweep_stale.
- service: create_report가 job 생성+enqueue(arq 모킹), run_report_job 성공/실패 경로(파이프라인 모킹).
- 활성 job 1개 규칙: 두 번째 POST가 기존 job_id 반환.
- 라우터: POST 202 형태, GET /jobs/{id} 소유자/비소유자(403).
- notifications: 토큰 없을 때 no-op.
- 프론트: pollJob done/failed 분기(가벼운 단위 또는 수동).

## 12. 미해결 / 확인 필요

1. **Redis 비밀번호** — 있으면 사용자 제공(차단되어 못 읽음).
2. **OpenAI 계정 tier TPM/RPM** — `max_jobs` 최종값 결정용. 우선 8로 보수적 시작.
3. **`~/servers/docker-compose.yml`에 worker 서비스 추가** — 레포 밖이라 배포 시 SSH로 직접 추가(또는 사용자 편집).
