// API 베이스 URL — EXPO_PUBLIC_API_BASE로 주입 (실기기 테스트 시 호스트 LAN IP 또는 프로덕션 도메인).
// 기본값은 로컬 백엔드. 실기기(아이폰)는 localhost에 못 붙으니 반드시 환경변수로 덮어쓸 것.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

// 네이티브 OAuth 콜백 딥링크 — 백엔드 settings.native_auth_redirect와 정확히 일치해야 함.
export const AUTH_REDIRECT = 'sajuguri://auth/callback'
