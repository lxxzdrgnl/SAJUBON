import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {
  output: 'standalone',           // Docker 배포 (spec §7.5)
  // dev 컨테이너(root)와 호스트 빌드가 같은 .next를 공유하면 권한 충돌 —
  // 컨테이너는 NEXT_DIST_DIR=.next-docker로 분리 (docker-compose.override.yml)
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@sajuguri/design', '@sajuguri/core', '@sajuguri/api-client'],
  async rewrites() {
    // 개발용 백엔드 프록시 — 운영은 리버스 프록시가 담당
    const api = process.env.API_BASE ?? 'http://localhost:8000'
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
  },
}

export default withNextIntl(config)
