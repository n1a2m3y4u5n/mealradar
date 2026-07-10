import { useState, useMemo } from 'react'
import { STANDARDS, SUPPLEMENT_GUIDE, GENDER_ADJUST, GRADE_ADJUST } from '../../utils/nutrition.js'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js'

const SCHOOL_TYPES = [
  { value: 'elementary', label: '초등학교', grades: ['1~2학년', '3~4학년', '5~6학년'] },
  { value: 'middle',     label: '중학교',   grades: ['1학년', '2학년', '3학년'] },
  { value: 'high',       label: '고등학교', grades: ['1학년', '2학년', '3학년'] },
]

const DIET_RESTRICTIONS = [
  { key: 'vegetarian', label: '채식 선호', icon: '🥦' },
  { key: 'lowSodium',  label: '저염 식단', icon: '🧂' },
  { key: 'highCalorie',label: '고열량 필요', icon: '⚡' },
  { key: 'ironBoost',  label: '철분 강화', icon: '💪' },
]

const NUTRIENT_INFO = [
  { key: 'energy_kcal', label: '에너지',  unit: 'kcal', color: 'var(--amber)',   stdKey: 'energy_kcal' },
  { key: 'protein_g',   label: '단백질',  unit: 'g',    color: 'var(--emerald)', stdKey: 'protein_g'   },
  { key: 'iron_mg',     label: '철 분',  unit: 'mg',   color: 'var(--rose)',    stdKey: 'iron_mg'     },
  { key: 'calcium_mg',  label: '칼 슘',  unit: 'mg',   color: 'var(--cyan)',    stdKey: 'calcium_mg'  },
  { key: 'vitc_mg',     label: '비타민C', unit: 'mg',   color: 'var(--violet)',  stdKey: 'vitc_mg'     },
]

function CircleGauge({ pct, color, size = 80, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct / 100, 1))
  const displayPct = useAnimatedNumber(Math.min(pct, 100), 700, 0)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--bg-raised)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={pct < 60 ? 'var(--rose)' : pct < 85 ? 'var(--amber)' : color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 800,
          color: pct < 60 ? 'var(--rose)' : pct < 85 ? 'var(--amber)' : color,
        }}>{displayPct}%</span>
      </div>
    </div>
  )
}

export function NutritionCalculator() {
  const [schoolType, setSchoolType] = useState('middle')
  const [gradeIdx,   setGradeIdx]   = useState(0)
  const [gender,     setGender]     = useState('mixed')
  const [restrictions, setRestrictions] = useState([])
  const [meals, setMeals] = useState({ energy_kcal: 820, protein_g: 23, iron_mg: 4.2, calcium_mg: 280, vitc_mg: 30 })

  const toggleRestriction = key =>
    setRestrictions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const adjusted = useMemo(() => {
    const base = { ...STANDARDS }
    const gAdj = GENDER_ADJUST[gender] || {}
    const type = SCHOOL_TYPES.find(t => t.value === schoolType)
    const gradeLabel = type?.grades[gradeIdx] || ''
    const grdAdj = GRADE_ADJUST[schoolType]?.[gradeLabel] || {}

    const result = {}
    Object.keys(NUTRIENT_INFO.reduce((a, n) => ({ ...a, [n.key]: true }), {})).forEach(key => {
      const stdKey = key
      const std = base[stdKey]
      if (!std) return
      let min = std.min
      if (gAdj[key])  min *= gAdj[key]
      if (grdAdj[key]) min *= grdAdj[key]
      if (restrictions.includes('highCalorie') && key === 'energy_kcal') min *= 1.1
      if (restrictions.includes('ironBoost')   && key === 'iron_mg')     min *= 1.2
      if (restrictions.includes('lowSodium')   && key === 'sodium_mg')   min *= 0.8
      result[key] = Math.round(min * 10) / 10
    })
    return result
  }, [schoolType, gradeIdx, gender, restrictions])

  const scores = useMemo(() => {
    return NUTRIENT_INFO.reduce((acc, n) => {
      const actual = meals[n.key] || 0
      const std    = adjusted[n.key] || STANDARDS[n.stdKey]?.min || 1
      acc[n.key] = Math.round((actual / std) * 100)
      return acc
    }, {})
  }, [meals, adjusted])

  const overallMAR = Math.round(
    Object.values(scores).reduce((s, v) => s + Math.min(v, 100), 0) / NUTRIENT_INFO.length
  )

  const deficits = NUTRIENT_INFO.filter(n => scores[n.key] < 75)
  const supplements = deficits.flatMap(n => SUPPLEMENT_GUIDE[n.key] || [])

  const schoolTypeObj = SCHOOL_TYPES.find(t => t.value === schoolType)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 설정 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* 학교 유형 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>학교 정보 설정</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>학교 유형</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SCHOOL_TYPES.map(t => (
                <button key={t.value}
                  className={`btn ${schoolType === t.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setSchoolType(t.value); setGradeIdx(0) }}
                  style={{ fontSize: 13, padding: '6px 14px' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>학년</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(schoolTypeObj?.grades || []).map((g, i) => (
                <button key={g}
                  className={`btn ${gradeIdx === i ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setGradeIdx(i)}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>성별 구성</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['mixed', '혼합'], ['male', '남학생'], ['female', '여학생']].map(([v, l]) => (
                <button key={v}
                  className={`btn ${gender === v ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setGender(v)}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 식단 조건 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>식단 조건</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {DIET_RESTRICTIONS.map(r => (
              <button key={r.key}
                onClick={() => toggleRestriction(r.key)}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: restrictions.includes(r.key) ? 'rgba(0,229,255,0.1)' : 'var(--bg-raised)',
                  border: `1px solid ${restrictions.includes(r.key) ? 'rgba(0,229,255,0.4)' : 'var(--border-default)'}`,
                  color: restrictions.includes(r.key) ? 'var(--cyan)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                <span>{r.icon}</span>{r.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>조정된 기준값:</span>{' '}
            에너지 <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--amber)' }}>{adjusted.energy_kcal}</span>kcal ·
            철분 <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--rose)' }}>{adjusted.iron_mg}</span>mg ·
            칼슘 <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--cyan)' }}>{adjusted.calcium_mg}</span>mg
          </div>
        </div>
      </div>

      {/* 영양소 입력 */}
      <div className="card">
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>실제 급식 영양소 입력</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {NUTRIENT_INFO.map(n => (
            <div key={n.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{n.label} ({n.unit})</label>
              <input
                type="number"
                value={meals[n.key]}
                onChange={e => setMeals(prev => ({ ...prev, [n.key]: parseFloat(e.target.value) || 0 }))}
                style={{
                  padding: '8px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
                  borderRadius: 8, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono',
                  width: '100%',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>기준 {adjusted[n.key] || STANDARDS[n.stdKey]?.min}{n.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 결과 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* 원형 게이지 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 20 }}>영양소별 달성률</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {NUTRIENT_INFO.map(n => (
              <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CircleGauge pct={scores[n.key]} color={n.color} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{n.label}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 48, fontWeight: 800, lineHeight: 1,
                color: overallMAR < 60 ? 'var(--rose)' : overallMAR < 80 ? 'var(--amber)' : 'var(--emerald)' }}>
                {overallMAR}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>전체 MAR</div>
            </div>
          </div>
        </div>

        {/* 보충 가이드 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>보충 식재료 추천</div>
          {deficits.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>모든 영양소 기준 달성!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deficits.map(n => (
                <div key={n.key} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-raised)', border: `1px solid ${n.color}30` }}>
                  <div style={{ fontSize: 12, color: n.color, fontWeight: 700, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>
                    {n.label} 부족 ({scores[n.key]}%)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(SUPPLEMENT_GUIDE[n.key] || []).map(food => (
                      <span key={food} style={{
                        padding: '2px 8px', borderRadius: 100, fontSize: 11,
                        background: `${n.color}15`, border: `1px solid ${n.color}30`,
                        color: n.color,
                      }}>{food}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 상세 비교표 */}
      <div className="card">
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>영양 기준 상세 비교</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['영양소', '실제값', '권장기준', '달성률', '평가'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUTRIENT_INFO.map(n => {
                const pct = scores[n.key]
                const color = pct < 60 ? 'var(--rose)' : pct < 85 ? 'var(--amber)' : 'var(--emerald)'
                const label = pct < 60 ? '미달' : pct < 85 ? '주의' : '달성'
                return (
                  <tr key={n.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>{n.label}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontWeight: 700, color: n.color }}>
                      {meals[n.key]}{n.unit}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                      {adjusted[n.key] || STANDARDS[n.stdKey]?.min}{n.unit}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 120, height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: `${color}15`, color, border: `1px solid ${color}30`,
                      }}>{label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
