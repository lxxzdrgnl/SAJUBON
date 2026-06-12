import type { ApiClient } from './client'

/** 도시 검색 옵션 (이식: frontend/utils/citySearch.ts) */
export interface CityOption {
  label: string
  sublabel: string
  longitude: number
  utcOffset: number
  isKorea: boolean
  timezone: string
}

interface CityDto {
  label: string; sublabel: string; longitude: number
  utc_offset: number; timezone: string; is_korea: boolean
}

/** GET /api/cities — 한국어/영문 통합 도시 검색. 실패 시 빈 배열 (폼 UX 보호) */
export async function searchCities(api: ApiClient, query: string): Promise<CityOption[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const data = await api.get<CityDto[]>(`/api/cities?q=${encodeURIComponent(q)}`)
    return data.map((d) => ({
      label: d.label, sublabel: d.sublabel, longitude: d.longitude,
      utcOffset: d.utc_offset, timezone: d.timezone, isKorea: d.is_korea,
    }))
  } catch {
    return []
  }
}
