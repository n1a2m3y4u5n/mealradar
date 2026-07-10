import { useState, useMemo, useEffect, useRef } from 'react'
import { ALLERGENS } from '../layout/AllergyPanel.jsx'

const STANDARDS = { energy_kcal: 850, protein_g: 25, iron_mg: 5, calcium_mg: 300, vitc_mg: 35 }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function calcMAR(nutrients) {
  if (!nutrients) return null
  const keys = Object.keys(STANDARDS)
  const nars = keys.map(k => Math.min((nutrients[k] || 0) / STANDARDS[k], 1.0))
  return Math.round((nars.reduce((a, b) => a + b, 0) / nars.length) * 100)
}

function marColor(mar) {
  if (mar == null) return 'var(--border-default)'
  if (mar >= 80) return '#22c55e'
  if (mar >= 65) return '#fbbf24'
  if (mar >= 50) return '#f97316'
  return '#ef4444'
}

export function MealCalendar({ meals = [], myAllergens = [] }) {
  const now = new Date()

  // 가장 최근 급식이 있는 달로 초기화
  const initialDate = useMemo(() => {
    if (!meals.length) return { year: now.getFullYear(), month: now.getMonth() }
    const latest = meals[meals.length - 1]?.date || ''
    return { year: parseInt(latest.slice(0, 4)) || now.getFullYear(), month: (parseInt(latest.slice(5, 7)) - 1) || now.getMonth() }
  }, [])  // eslint-disable-line

  const [year, setYear]   = useState(initialDate.year)
  const [month, setMonth] = useState(initialDate.month)
  const [selected, setSelected] = useState(null)

  // meals가 나중에 로드되면 (NEIS 비동기) 가장 최근 달로 점프
  const autoJumped = useRef(false)
  useEffect(() => {
    if (autoJumped.current || !meals.length) return
    const latest = meals[meals.length - 1]?.date
    if (!latest) return
    const y = parseInt(latest.slice(0, 4))
    const m = parseInt(latest.slice(5, 7)) - 1
    if (!isNaN(y) && !isNaN(m)) { setYear(y); setMonth(m) }
    autoJumped.current = true
  }, [meals])

  // meals를 날짜 → meal 맵으로 변환
  const mealMap = useMemo(() => {
    const m = {}
    meals.forEach(meal => { m[meal.date] = meal })
    return m
  }, [meals])

  // 현재 월 달력 생성
  const calDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()  // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ d, dateStr, meal: mealMap[dateStr] || null })
    }
    return cells
  }, [year, month, mealMap])

  const prevMonth = () => {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 })
    setSelected(null)
  }
  const nextMonth = () => {
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 })
    setSelected(null)
  }

  // 이번 달 총 급식 수 / 평균 MAR
  const monthStats = useMemo(() => {
    const monthMeals = calDays.filter(c => c?.meal).map(c => c.meal)
    if (!monthMeals.length) return null
    const mars = monthMeals.map(m => calcMAR(m.nutrients)).filter(v => v != null)
    return {
      count: monthMeals.length,
      avgMAR: Math.round(mars.reduce((a, b) => a + b, 0) / mars.length),
    }
  }, [calDays])

  const selectedMeal = selected ? mealMap[selected] : null
  const selectedMAR = calcMAR(selectedMeal?.nutrients)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

      {/* 달력 영역 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14, overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '4px 8px', borderRadius: 6, lineHeight: 1 }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>
              {year}년 {month + 1}월
            </span>
            {monthStats && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                급식 {monthStats.count}회 · 평균 MAR {monthStats.avgMAR}
              </span>
            )}
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '4px 8px', borderRadius: 6, lineHeight: 1 }}>›</button>
        </div>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', padding: '8px 0', fontSize: 11,
              color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--text-muted)',
              fontFamily: 'JetBrains Mono', fontWeight: 600,
            }}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-subtle)', padding: 1 }}>
          {calDays.map((cell, idx) => {
            if (!cell) return <div key={`e${idx}`} style={{ background: 'var(--bg-surface)', minHeight: 82 }} />
            const { d, dateStr, meal } = cell
            const mar = calcMAR(meal?.nutrients)
            const color = marColor(mar)
            const isSelected = selected === dateStr
            const isToday = dateStr === now.toISOString().slice(0, 10)
            const dow = (idx) % 7
            const hasAllergyAlert = meal?.allergens?.some(id => myAllergens.includes(id))

            return (
              <div key={dateStr}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                style={{
                  background: isSelected ? 'rgba(0,229,255,0.08)' : 'var(--bg-surface)',
                  minHeight: 82, padding: '6px 8px', cursor: meal ? 'pointer' : 'default',
                  borderTop: isSelected ? `2px solid var(--cyan)` : `2px solid transparent`,
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (meal) e.currentTarget.style.background = isSelected ? 'rgba(0,229,255,0.1)' : 'var(--bg-elevated)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(0,229,255,0.08)' : 'var(--bg-surface)' }}
              >
                {/* 날짜 숫자 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 12, fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--cyan)' : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : 'var(--text-secondary)',
                    ...(isToday && { background: 'rgba(0,229,255,0.15)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }),
                  }}>{d}</span>
                  {hasAllergyAlert && <span style={{ fontSize: 10 }}>⚠️</span>}
                </div>

                {/* 급식 있는 날 */}
                {meal && (
                  <>
                    {/* MAR 게이지 바 */}
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-elevated)', marginBottom: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${mar ?? 0}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                    {/* 메뉴 목록 (최대 3개) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {meal.menu.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                          {item}
                        </div>
                      ))}
                      {meal.menu.length > 3 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>+{meal.menu.length - 3}개</div>
                      )}
                    </div>
                    {/* MAR 수치 */}
                    {mar != null && (
                      <div style={{ position: 'absolute', bottom: 5, right: 6, fontSize: 9, fontFamily: 'JetBrains Mono', color, fontWeight: 700 }}>
                        {mar}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 16, padding: '10px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          {[['#22c55e', 'MAR 80+'], ['#fbbf24', '65~79'], ['#f97316', '50~64'], ['#ef4444', '~49']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
              {l}
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>셀 우하단 = MAR 점수</div>
        </div>
      </div>

      {/* 상세 패널 */}
      <div style={{ position: 'sticky', top: 80 }}>
        {selectedMeal ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* 패널 헤더 */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)',
              background: `linear-gradient(135deg, var(--bg-surface) 0%, ${marColor(selectedMAR)}10 100%)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{selected}</span>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 4, flex: 1, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selectedMAR ?? 0}%`, background: marColor(selectedMAR), borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: marColor(selectedMAR), fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                  MAR {selectedMAR ?? '-'}
                </span>
              </div>
            </div>

            {/* 메뉴 목록 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>오늘의 메뉴</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {selectedMeal.menu.map((item, i) => {
                  const contrib = selectedMeal.contribution?.[item]
                  const isEat = selectedMeal.eat_recommendation?.includes(item)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, flex: 1,
                        color: isEat ? 'var(--emerald)' : 'var(--text-primary)',
                        fontWeight: isEat ? 600 : 400,
                      }}>
                        {isEat && '✓ '}{item}
                      </span>
                      {contrib && (
                        <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                          {contrib.energy}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 영양 달성률 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>영양 달성률</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '에너지', k: 'energy_kcal', std: 850, unit: 'kcal' },
                  { label: '단백질', k: 'protein_g',   std: 25,  unit: 'g' },
                  { label: '철분',   k: 'iron_mg',     std: 5,   unit: 'mg' },
                  { label: '칼슘',   k: 'calcium_mg',  std: 300, unit: 'mg' },
                  { label: '비타민C',k: 'vitc_mg',     std: 35,  unit: 'mg' },
                ].map(({ label, k, std, unit }) => {
                  const v = selectedMeal.nutrients?.[k] || 0
                  const pct = Math.min(Math.round(v / std * 100), 100)
                  const c = pct < 60 ? '#ef4444' : pct < 80 ? '#fbbf24' : '#22c55e'
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, width: 44, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: c, fontWeight: 700, width: 30, textAlign: 'right' }}>{pct}%</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 70 }}>{v}{unit}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 알레르기 */}
            {selectedMeal.allergens?.length > 0 && (
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>알레르기 정보</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedMeal.allergens.map(id => (
                    <span key={id} style={{
                      padding: '2px 7px', borderRadius: 100, fontSize: 10,
                      background: myAllergens.includes(id) ? 'rgba(244,63,94,0.15)' : 'var(--bg-elevated)',
                      color: myAllergens.includes(id) ? 'var(--rose)' : 'var(--text-muted)',
                      border: myAllergens.includes(id) ? '1px solid rgba(244,63,94,0.3)' : '1px solid var(--border-subtle)',
                    }}>
                      {ALLERGENS[id]?.name || id}({id})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 14,
            padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              날짜를 클릭하면<br />급식 상세 정보를 볼 수 있습니다
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
