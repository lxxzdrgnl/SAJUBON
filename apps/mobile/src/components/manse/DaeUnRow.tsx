import { ScrollView, View, Text } from 'react-native'
import { BrutalShadow } from '@/components/ui/BrutalShadow'
import { ohaengColor, ohaengTintColor } from '@/lib/manse/ohaeng'
import type { DaeUnEntry } from '@sajuguri/api-client'

interface Props {
  daeUnList: DaeUnEntry[]
  currentDaeUn: DaeUnEntry | null
  daeUnStartAge: number
}

export function DaeUnRow({ daeUnList, currentDaeUn, daeUnStartAge }: Props) {
  return (
    <View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 }}>대운 ({daeUnStartAge}세 시작)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
        {daeUnList.map((entry) => {
          const isCurrent = currentDaeUn?.start_age === entry.start_age
          const stemColor = ohaengColor(entry.stem_element)
          const stemBg = ohaengTintColor(entry.stem_element)
          const branchColor = ohaengColor(entry.branch_element)
          const branchBg = ohaengTintColor(entry.branch_element)
          const borderColor = isCurrent ? '#FF6B00' : '#1A1A1A'
          const shadowColor = isCurrent ? '#FF6B00' : '#1A1A1A'

          return (
            <BrutalShadow key={entry.start_age} offset={2} radius={11} color={shadowColor}>
              <View
                style={{
                  width: 72,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor,
                  overflow: 'hidden',
                  backgroundColor: '#FAFAF7',
                }}
              >
                {/* 연령 */}
                <View style={{ backgroundColor: isCurrent ? '#FF6B00' : '#1A1A1A', paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
                    {entry.start_age}~{entry.end_age}
                  </Text>
                </View>

                {/* 천간 */}
                <View style={{ backgroundColor: stemBg, paddingVertical: 8, alignItems: 'center' }}>
                  <Text className="font-serif" style={{ fontSize: 22, fontWeight: '900', color: stemColor }}>{entry.stem}</Text>
                  <Text style={{ fontSize: 9, color: stemColor, fontWeight: '700' }}>{entry.stem_element}</Text>
                  {entry.stem_ten_god && (
                    <Text style={{ fontSize: 9, color: '#8A8270', marginTop: 1 }}>{entry.stem_ten_god}</Text>
                  )}
                </View>

                {/* 지지 */}
                <View style={{ backgroundColor: branchBg, paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: borderColor }}>
                  <Text className="font-serif" style={{ fontSize: 22, fontWeight: '900', color: branchColor }}>{entry.branch}</Text>
                  <Text style={{ fontSize: 9, color: branchColor, fontWeight: '700' }}>{entry.branch_element}</Text>
                  {entry.branch_ten_god && (
                    <Text style={{ fontSize: 9, color: '#8A8270', marginTop: 1 }}>{entry.branch_ten_god}</Text>
                  )}
                </View>
              </View>
            </BrutalShadow>
          )
        })}
      </ScrollView>
    </View>
  )
}
