/**
 * ChartPlaceholder — [[chart:TOOL]] 마커의 모바일 대체 렌더.
 * 웹의 ToolCard(전체 인터랙티브 차트) 대신 레이블 카드로 존재를 표시한다.
 * 백엔드가 charts payload를 내려주지 않는 경우에도 마커 위치는 보존된다.
 */

import { Text, View } from 'react-native'

// tool 이름 → 한국어 레이블
const TOOL_LABELS: Record<string, string> = {
  get_palja: '사주 원국',
  get_wuxing_balance: '오행 균형',
  get_strength: '신강/신약',
  get_ten_gods: '십성',
  get_sin_sal: '신살',
  get_twelve_un_seong: '12운성',
  get_hap_chung: '합충',
  get_dae_un: '대운',
  compat_palja_a: '사주 원국 (나)',
  compat_palja_b: '사주 원국 (상대)',
  compat_wuxing_a: '오행 균형 (나)',
  compat_wuxing_b: '오행 균형 (상대)',
  compat_ten_gods_a: '십성 (나)',
  compat_ten_gods_b: '십성 (상대)',
  compat_strength_a: '신강/신약 (나)',
  compat_strength_b: '신강/신약 (상대)',
  compat_branches: '지지 관계',
  compat_day_relation: '일주 관계',
  compat_yongsin: '용신',
}

export function ChartPlaceholder({ tool }: { tool: string }) {
  const label = TOOL_LABELS[tool] ?? tool.replace(/_/g, ' ')
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: '#C0B8A8',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginVertical: 6,
        backgroundColor: '#F5F2EC',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 16 }}>📊</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A8270' }}>{label} 차트</Text>
    </View>
  )
}
