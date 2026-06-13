import type { ProfileResponse } from '@sajuguri/api-client'
import SavedListClient from './SavedListClient'

/** 로그인 유저의 서버 저장 만세력 목록 (대표 뱃지·대표설정·삭제). */
export default function SavedList({ profiles }: { profiles: ProfileResponse[] }) {
  return <SavedListClient profiles={profiles} />
}
