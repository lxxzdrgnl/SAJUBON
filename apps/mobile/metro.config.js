// Metro 설정 — pnpm 모노레포 + NativeWind.
// 워크스페이스 루트를 감시하고 node_modules 해석 경로에 루트를 추가해
// @sajuguri/* 워크스페이스 패키지(TS 소스)와 공유 의존성을 번들한다.
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 모노레포: 루트까지 감시 + 루트 node_modules도 해석 대상에 포함 (Expo 기본 watchFolders 유지)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// @sajuguri/* 패키지가 package.json exports로 ./src/index.ts를 가리키므로
// Metro의 package exports 해석을 켜서 .ts 진입점을 따라가게 한다.
config.resolver.unstable_enablePackageExports = true

module.exports = withNativeWind(config, { input: './src/global.css' })
