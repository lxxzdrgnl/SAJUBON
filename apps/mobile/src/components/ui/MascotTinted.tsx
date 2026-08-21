import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { stemToMascotBody } from '@/lib/ganji'
import { tintMascot } from '@/lib/mascotSvg'

// 너구리 마스코트를 일간색으로 틴팅 — 웹 MascotTinted 대응. tintMascot가 만든 SVG 문자열을
// react-native-svg의 SvgXml로 렌더. 회색(임·계)은 옅은 글로우 박스로 보정.
export function MascotTinted({
  stem,
  size = 44,
}: {
  stem?: string | null
  size?: number
}) {
  const { color, grey } = stemToMascotBody(stem)
  const xml = tintMascot(color, { width: size, height: size, grey })

  if (grey) {
    return (
      <View
        style={{
          shadowColor: '#A0AFC8',
          shadowOpacity: 0.65,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <SvgXml xml={xml} width={size} height={size} />
      </View>
    )
  }
  return <SvgXml xml={xml} width={size} height={size} />
}
