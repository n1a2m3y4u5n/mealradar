import { useState } from 'react'

const METRIC_EXPLANATIONS = {
  MAR: {
    full: 'Mean Adequacy Ratio',
    desc: '평균 영양 적정 비율. 5가지 영양소(에너지·단백질·철분·칼슘·비타민C)가 권장량의 몇 %를 달성했는지 평균. 100에 가까울수록 우수.',
    range: '0-100',
  },
  NAR: {
    full: 'Nutrient Adequacy Ratio',
    desc: '개별 영양소 적정 비율. 해당 영양소가 권장량 대비 몇 %인지. 100%면 권장량 충족.',
    range: '0-100%',
  },
  INQ: {
    full: 'Index of Nutritional Quality',
    desc: '영양 질 지수. 1,000kcal당 해당 영양소가 권장량을 얼마나 충족하는지. 1.0 이상이면 에너지 밀도 대비 영양이 우수.',
    range: '0-2.0',
  },
  NRF: {
    full: 'Nutrient Rich Food Score',
    desc: '영양 풍부도 지수. 권장 영양소는 높고 제한 영양소(나트륨·포화지방)는 낮을수록 높은 점수.',
    range: '0-100',
  },
  DDS: {
    full: 'Dietary Diversity Score',
    desc: '식품 다양성 점수. 5대 식품군(곡류·고기류·채소류·유제품·과일류) 중 몇 가지를 포함했는지. 5에 가까울수록 다양.',
    range: '0-5',
  },
  STL: {
    full: 'Seasonal Trend Loess',
    desc: '시계열 성분 분해법. 시계열 데이터를 추세·계절성·잔차로 분리해 패턴 분석.',
    range: '-',
  },
  DiD: {
    full: 'Difference-in-Differences',
    desc: '이중차분법. 정책(예산 증액) 효과를 처치군-통제군 비교로 추정. 관찰되지 않는 개별 특성 통제.',
    range: '-',
  },
}

export function MetricTooltip({ metric, children }) {
  const [show, setShow] = useState(false)
  const info = METRIC_EXPLANATIONS[metric]
  if (!info) return children

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span style={{
        marginLeft: 4, width: 14, height: 14, borderRadius: '50%',
        background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)',
        fontSize: 9, color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'help', fontFamily: 'JetBrains Mono', fontWeight: 700,
      }}>?</span>
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 9999, marginTop: 4,
          background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          borderRadius: 10, padding: '12px 14px', width: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--cyan)', marginBottom: 4 }}>
            {metric} — {info.full}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{info.desc}</div>
          {info.range !== '-' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>범위: {info.range}</div>
          )}
        </div>
      )}
    </span>
  )
}
