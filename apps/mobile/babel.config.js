// NativeWind v4 + Reanimated 4(worklets) 바벨 설정.
// - jsxImportSource: 'nativewind' → className → 스타일 변환
// - nativewind/babel preset → CSS interop
// - react-native-worklets/plugin → Reanimated 4는 worklets 플러그인을 마지막에 둬야 함
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-worklets/plugin'],
  }
}
