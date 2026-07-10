import { ALLERGENS } from '../layout/AllergyPanel.jsx'
import { STANDARDS } from '../../utils/nutrition.js'

export function TodayEatWhat({ school, meals, myAllergens = [] }) {
  const todayMeal = meals[meals.length - 1] || meals[0]
  if (!todayMeal) return <div style={{ color: 'var(--text-muted)' }}>오늘 급식 데이터가 없습니다.</div>

  const { menu, contribution = {}, eat_recommendation = [], skip_recommendation = [], allergens: mealAllergens = [], nutrients } = todayMeal
  const myAlertItems = mealAllergens.filter(id => myAllergens.includes(id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 알레르기 배너 */}
      {myAlertItems.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(244,63,94,0.1)', border: '2px solid rgba(244,63,94,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'var(--glow-rose)',
        }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--rose)', fontSize: 14 }}>알레르기 경보</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              오늘 급식에 {myAlertItems.map(id => `${ALLERGENS[id]?.name}(${id})`).join(', ')}이 포함되어 있습니다
            </div>
          </div>
        </div>
      )}

      {/* 날짜 & 기상 정보 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{todayMeal.date}</div>
        {todayMeal.weather && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {todayMeal.weather} {todayMeal.temperature}°C
          </div>
        )}
        <div style={{
          padding: '3px 10px', background: 'var(--cyan-dim)', border: '1px solid rgba(0,229,255,0.3)',
          borderRadius: 100, fontSize: 11, color: 'var(--cyan)', fontFamily: 'JetBrains Mono',
        }}>오늘의 급식</div>
      </div>

      {/* 반찬 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {menu.map((item, i) => {
          const contrib = contribution[item]
          const isEat  = eat_recommendation.includes(item)
          const isSkip = skip_recommendation.includes(item)
          const hasMyAllergy = myAllergens.some(id => mealAllergens.includes(id))

          return (
            <div key={i} style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${isEat ? 'rgba(16,185,129,0.4)' : isSkip ? 'rgba(244,63,94,0.4)' : 'var(--border-default)'}`,
              borderRadius: 14, padding: '14px 16px',
              boxShadow: isEat ? '0 0 16px rgba(16,185,129,0.08)' : 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isEat ? '0 0 16px rgba(16,185,129,0.08)' : 'none' }}
            >
              {/* 배지 */}
              {isEat && (
                <div style={{ position: 'absolute', top: -8, right: 10, background: 'var(--emerald)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                  ✓ 꼭 드세요
                </div>
              )}

              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--text-primary)' }}>{item}</div>

              {contrib ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['에너지', contrib.energy, 'var(--amber)'], ['철 분', contrib.iron, 'var(--rose)'], ['칼 슘', contrib.calcium, 'var(--cyan)']].map(([label, pct, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 38, flexShrink: 0, fontFamily: 'JetBrains Mono' }}>{label}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease', opacity: 0.85 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color, fontWeight: 700, width: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>영양 기여 데이터 없음</div>
              )}

              {/* 알레르기 경보 */}
              {myAlertItems.length > 0 && i === 2 && (
                <div style={{ marginTop: 10, padding: '4px 8px', background: 'rgba(244,63,94,0.1)', borderRadius: 6, fontSize: 11, color: 'var(--rose)' }}>
                  ⚠️ 알레르기 #{myAlertItems.join(',')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 오늘 영양 요약 */}
      <div className="card">
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>오늘 급식 영양 달성 현황</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: '에너지', actual: nutrients.energy_kcal, target: 950, unit: 'kcal' },
            { label: '단백질', actual: nutrients.protein_g,   target: 25,  unit: 'g' },
            { label: '철 분', actual: nutrients.iron_mg,     target: 5,   unit: 'mg' },
            { label: '칼 슘', actual: nutrients.calcium_mg,  target: 300, unit: 'mg' },
            { label: '비타민C', actual: nutrients.vitc_mg,   target: 35,  unit: 'mg' },
          ].map(({ label, actual, target, unit }) => {
            const pct = Math.min(Math.round((actual / target) * 100), 100)
            const color = pct < 60 ? 'var(--rose)' : pct < 80 ? 'var(--amber)' : 'var(--emerald)'
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, width: 52, color: 'var(--text-secondary)' }}>{label}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color, fontWeight: 700, width: 32 }}>{pct}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 100 }}>
                  {actual}{unit} / {target}{unit}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
