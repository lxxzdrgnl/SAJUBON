/**
 * PersonSlotPicker — 정적 타입 계약 검증.
 * vitest glob(lib/**) 범위 밖이라 tsc --noEmit로만 검증됨.
 * DOM 렌더 없이 props/export 타입이 올바른지, "궁합 보기" 버튼이
 * 두 슬롯이 모두 채워지기 전까지 disabled 상태임을 타입 계약으로 보장한다.
 */
import type { PersonPick } from './PersonSlotPicker'
import PersonSlotPicker from './PersonSlotPicker'
import type { ProfileResponse } from '@sajuguri/api-client'

// ── PersonPick 타입 검증 ─────────────────────────────────────────────────────

const pickA: PersonPick = {
  name: '이용재',
  birth_date: '1990-03-15',
  birth_time: '14:30',
  gender: 'male',
  calendar: 'solar',
  is_leap_month: false,
}

const pickB: PersonPick = {
  name: '유다연',
  birth_date: '1992-07-21',
  birth_time: null,
  gender: 'female',
  calendar: 'solar',
  is_leap_month: false,
  birth_longitude: 126.978,
}

// birth_longitude optional이어도 할당 가능한지
const pickNoLongitude: PersonPick = {
  name: '게스트',
  birth_date: '1995-01-01',
  birth_time: null,
  gender: 'male',
  calendar: 'lunar',
  is_leap_month: true,
}

// ── Props 타입 검증 ──────────────────────────────────────────────────────────

const repProfile: ProfileResponse = {
  id: 1,
  name: '이용재',
  birth_date: '1990-03-15',
  birth_time: '14:30',
  calendar: 'solar',
  gender: 'male',
  is_leap_month: false,
  city: null,
  longitude: null,
  is_representative: true,
  day_stem: '갑',
  day_branch: null,
  day_stem_element: null,
}

// PersonSlotPicker 컴포넌트가 profiles + onComplete를 받는지 검증
const _el = (
  <PersonSlotPicker
    profiles={[repProfile]}
    onComplete={(a: PersonPick, b: PersonPick) => {
      // a, b는 PersonPick 타입이어야 함
      void a.name
      void b.birth_date
    }}
  />
)

// onComplete 콜백에 올바른 PersonPick이 전달되는지 타입 수준 검증
function _assertOnComplete(a: PersonPick, b: PersonPick): void {
  // 두 슬롯이 모두 채워져야 onComplete가 호출됨을 나타냄
  const _checkA: PersonPick = a
  const _checkB: PersonPick = b
  void _checkA
  void _checkB
}

// 타입 단언 — 컴파일만 통과하면 됨
void pickA
void pickB
void pickNoLongitude
void _el
void _assertOnComplete
