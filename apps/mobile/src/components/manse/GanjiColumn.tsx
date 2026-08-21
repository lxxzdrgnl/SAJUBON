import { View, Text } from 'react-native'
import { ohaengColor } from '@/lib/manse/ohaeng'

interface Props {
  topLabel: string
  stem: string
  stemElement: string
  branch: string
  branchElement: string
  stemTenGod?: string
  branchTenGod?: string
  twelveWun?: string
  highlight?: boolean
  badge?: string
  dim?: boolean
}

function Tile({ ch, element, highlight }: { ch: string; element: string; highlight: boolean }) {
  return (
    <View style={{
      width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, borderWidth: 2,
      borderColor: highlight ? '#FF6B00' : '#1A1A1A',
      backgroundColor: highlight ? '#FFFFFF' : ohaengColor(element),
      shadowColor: highlight ? '#FF6B00' : '#1A1A1A',
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    }}>
      <Text className="font-serif" style={{ fontSize: 20, fontWeight: '900', color: highlight ? ohaengColor(element) : 'rgba(255,255,255,0.96)' }}>{ch}</Text>
    </View>
  )
}

export function GanjiColumn({ topLabel, stem, stemElement, branch, branchElement, stemTenGod, branchTenGod, twelveWun, highlight = false, badge, dim = false }: Props) {
  return (
    <View style={{ flexShrink: 0, alignItems: 'center', gap: 4, opacity: dim ? 0.5 : 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A8270' }}>{topLabel}</Text>
      {stemTenGod ? <Text style={{ fontSize: 10, color: '#8A8270' }}>{stemTenGod}</Text> : null}
      <Tile ch={stem} element={stemElement} highlight={highlight} />
      <Tile ch={branch} element={branchElement} highlight={highlight} />
      {branchTenGod ? <Text style={{ fontSize: 10, color: '#8A8270' }}>{branchTenGod}</Text> : null}
      {twelveWun ? <Text style={{ fontSize: 10, fontWeight: '600', color: '#8A8270' }}>{twelveWun}</Text> : null}
      {badge ? (
        <View style={{ borderRadius: 6, backgroundColor: '#FF6B00', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}
