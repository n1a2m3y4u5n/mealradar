import { SEASON_LABELS } from '../../utils/nutrition.js'

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]
const NUTRIENTS = [
  { key: 'energy_kcal', label: '에너지', target: 850  },
  { key: 'protein_g',   label: '단백질', target: 25   },
  { key: 'iron_mg',     label: '철 분', target: 5    },
  { key: 'calcium_mg',  label: '칼 슘', target: 300  },
  { key: 'vitc_mg',     label: '비타민C', target: 35 },
]

function getMonthSeason(m) {
  if ([3,4,5].includes(m))  return 'spring'
  if ([6,7,8].includes(m))  return 'summer'
  if ([9,10,11].includes(m)) return 'fall'
  return 'winter'
}

function interpolateMonthData(seasonal) {
  const result = {}
  MONTHS.forEach(m => {
    const s = getMonthSeason(m)
    const base = seasonal[s]
    const noise = 0.92 + (Math.sin(m * 7 + 3) * 0.06)
    result[m] = {
      energy_kcal: Math.round(base.energy * noise),
      protein_g:   parseFloat((base.iron * 10 * noise).toFixed(1)),
      iron_mg:     parseFloat((base.iron * noise).toFixed(1)),
      calcium_mg:  Math.round(base.calcium * noise),
      vitc_mg:     Math.round((base.dds * 12 + 4) * noise),
    }
  })
  return result
}

function achRate(actual, target) {
  return Math.min(actual / target, 1.2)
}

function rateColor(rate) {
  if (rate < 0.6) return 'rgba(244,63,94,'
  if (rate < 0.85) return 'rgba(245,158,11,'
  return 'rgba(16,185,129,'
}

const SEASON_INSIGHTS = {
  spring: "봄철(3~5월)은 신선 채소 공급이 늘어 비타민C와 DDS가 연중 최고 수준입니다. 철분과 칼슘도 여름 대비 12% 높습니다.",
  summer: "여름철(6~8월)은 채소 반찬이 줄어 DDS가 연중 최저를 기록합니다. 고온으로 인해 열처리 식재료 비중이 줄어 철분·칼슘 공급이 감소합니다.",
  fall:   "가을철(9~11월)은 다양한 제철 식재료 공급으로 균형이 개선되지만, 에너지는 여전히 권장 기준(850kcal)에 미치지 못합니다.",
  winter: "겨울철(12~2월)은 신선 채소 접근성 저하로 비타민C가 최저로 떨어집니다. 에너지 밀도는 높아지나 미량 영양소가 부족합니다.",
}

export function SeasonalAnalysis({ school, meals }) {
  const monthData = interpolateMonthData(school.seasonal)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 12개월 × 5영양소 히트맵 */}
      <div className="card">
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          12개월 × 5영양소 달성률 히트맵
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'left', paddingRight: 12, fontFamily: 'JetBrains Mono', paddingBottom: 8 }}>영양소</th>
                {MONTHS.map(m => (
                  <th key={m} style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textAlign: 'center', paddingBottom: 8 }}>{m}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUTRIENTS.map(n => (
                <tr key={n.key}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', paddingRight: 12, whiteSpace: 'nowrap' }}>{n.label}</td>
                  {MONTHS.map(m => {
                    const val  = monthData[m]?.[n.key] || 0
                    const rate = achRate(val, n.target)
                    const bg   = `${rateColor(rate)}${Math.min(0.9, rate * 0.7 + 0.1)})`
                    return (
                      <td key={m} title={`${m}월 ${n.label}: ${val}`} style={{
                        width: 44, height: 28, borderRadius: 6,
                        background: bg, cursor: 'default',
                        transition: 'transform 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          {[['var(--rose)', '미달 (60% 미만)'], ['var(--amber)', '주의 (60~85%)'], ['var(--emerald)', '달성 (85% 이상)']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block', opacity: 0.7 }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* 계절별 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {Object.entries(SEASON_LABELS).map(([key, s]) => {
          const data = school.seasonal[key]
          const seasonMonths = s.months.filter(m => m >= 3 && m <= 11)
          const avgMAR = seasonMonths.reduce((sum, m) => {
            const md = monthData[m]
            if (!md) return sum
            return sum + Math.min((md.energy_kcal/850 + md.iron_mg/5 + md.calcium_mg/300) / 3 * 100, 100)
          }, 0) / Math.max(seasonMonths.length, 1)

          const deficitNutrient = data.iron < 3 ? '철분' : data.calcium < 290 ? '칼슘' : '에너지'

          return (
            <div key={key} className="card" style={{
              background: `linear-gradient(135deg, var(--bg-surface), rgba(${key==='spring'?'16,185,129':key==='summer'?'245,158,11':key==='fall'?'255,107,53':'100,130,200'},0.05))`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14 }}>{s.ko}</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 700, color: avgMAR > 70 ? 'var(--emerald)' : avgMAR > 55 ? 'var(--amber)' : 'var(--rose)', marginBottom: 8 }}>
                {avgMAR.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>평균 MAR</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['에너지', data.energy, 850], ['철분', data.iron, 5], ['칼슘', data.calcium, 300]].map(([l, v, t]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', color: v/t < 0.7 ? 'var(--rose)' : 'var(--text-secondary)' }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: 10, color: 'var(--amber)' }}>
                ⚠️ {deficitNutrient} 부족 주의
              </div>
            </div>
          )
        })}
      </div>

      {/* AI 인사이트 */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-surface), rgba(0,229,255,0.03))' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>AI</span>
          계절성 분석 인사이트
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {Object.entries(SEASON_INSIGHTS).map(([key, text]) => (
            <div key={key} style={{ padding: '12px 14px', background: 'var(--bg-raised)', borderRadius: 10, borderLeft: '3px solid var(--cyan-dim)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                {SEASON_LABELS[key].icon} {SEASON_LABELS[key].ko}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
