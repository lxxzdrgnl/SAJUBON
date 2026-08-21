import { useQuery } from '@tanstack/react-query'
import {
  listProfiles,
  listReports,
  listConsultations,
  listCompatibilityReports,
  listDailyRecords,
  type ProfileResponse,
  type ReportSummary,
  type ConsultationHistoryItem,
  type CompatibilityReportSummary,
  type DailyRecordSummary,
} from '@sajuguri/api-client'
import { useAuth } from './auth/AuthContext'

// 공유 서버 상태 훅 — TanStack Query.

/** 내 저장 만세력 목록 (로그인 시에만 fetch). */
export function useProfiles() {
  const { api, status } = useAuth()
  return useQuery<ProfileResponse[]>({
    queryKey: ['profiles'],
    queryFn: () => listProfiles(api),
    enabled: status === 'authed',
  })
}

/** 내 사주 리포트 목록 (로그인 시에만 fetch). */
export function useReports() {
  const { api, status } = useAuth()
  return useQuery<ReportSummary[]>({
    queryKey: ['reports'],
    queryFn: () => listReports(api),
    enabled: status === 'authed',
  })
}

/** 내 한줄 상담 기록 (로그인 시에만 fetch). */
export function useConsultations() {
  const { api, status } = useAuth()
  return useQuery<ConsultationHistoryItem[]>({
    queryKey: ['consultations'],
    queryFn: () => listConsultations(api),
    enabled: status === 'authed',
  })
}

/** 내 궁합 리포트 목록 (로그인 시에만 fetch). */
export function useCompatibilityReports() {
  const { api, status } = useAuth()
  return useQuery<CompatibilityReportSummary[]>({
    queryKey: ['compatibility'],
    queryFn: () => listCompatibilityReports(api),
    enabled: status === 'authed',
  })
}

/** 내 일진 기록 목록 (로그인 시에만 fetch). */
export function useDailyRecords() {
  const { api, status } = useAuth()
  return useQuery<DailyRecordSummary[]>({
    queryKey: ['daily'],
    queryFn: () => listDailyRecords(api),
    enabled: status === 'authed',
  })
}
