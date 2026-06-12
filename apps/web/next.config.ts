import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {
  output: 'standalone',           // Docker 배포 (spec §7.5)
  transpilePackages: ['@sajuguri/design', '@sajuguri/core', '@sajuguri/api-client'],
  async rewrites() {
    // 개발용 백엔드 프록시 — 운영은 리버스 프록시가 담당
    const api = process.env.API_BASE ?? 'http://localhost:8000'
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]
  },
}

export default withNextIntl(config)
