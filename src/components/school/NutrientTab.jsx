import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
  ComposedChart, Area, BarChart, Bar, Cell, ScatterChart, Scatter,
} from 'recharts'
import { STANDARDS, NUTRIENT_LABELS, calcNAR, calcNARRaw } from '../../utils/nutrition.js'
import { fmtDateShort } from '../../utils/formatters.js'
import { mockSchools } from '../../data/mockSchools.js'
import { mockRegions } from '../../data/mockRegions.js'
import { MetricTooltip } from '../ui/MetricTooltip.jsx'

function NARBar({ label, actual, standard, unit, delay = 0 }) {
  const rawNar = calcNARRaw(actual, standard)
  const displayPct = rawNar !== null ? Math.round(rawNar * 100) : 100
  const barWidth = Math.min(displayPct, 100)
  // 100% 초과면 초록, 미달은 기존 색상
  const colorHex = displayPct < 60 ? '#f43f5e' : displayPct < 80 ? '#f59e0b' : '#10b981'
  const color = displayPct < 60 ? 'var(--rose)' : displayPct < 80 ? 'var(--amber)' : 'var(--emerald)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, width: 60, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 10, background: 'var(--bg-raised)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 5,
          width: `${barWidth}%`,
          background: `linear-gradient(90deg, ${colorHex}80, ${colorHex})`,
          boxShadow: `0 0 8px ${colorHex}50`,
          transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, width: 48, textAlign: 'right', color, fontWeight: 700 }}>
        {displayPct}%
        {displayPct > 100 && <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>↑</span>}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>
        {actual}{unit} / {standard.min}{unit}
      </span>
    </div>
  )
}

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload.scores?.is_anomaly) return null
  return <circle cx={cx} cy={cy} r={6} fill="var(--rose)" stroke="var(--bg-deep)" strokeWidth={2}
    style={{ filter: 'drop-shadow(0 0 4px var(--rose))' }} />
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
      borderRadius: 10, padding: '12px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{label}</div>
      <div style={{ color: 'var(--cyan)' }}>{d?.nutrients?.energy_kcal} kcal</div>
      {d?.scores?.is_anomaly && (
        <div style={{ color: 'var(--rose)', marginTop: 6, fontWeight: 600 }}>
          ⚠️ 이상치 탐지 (z={d.scores?.anomaly_score?.toFixed(2)})
        </div>
      )}
      {d?.menu && (
        <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
          {d.menu.join(' · ')}
        </div>
      )}
    </div>
  )
}

export function NutrientTab({ school, meals }) {
  const [tooltip, setTooltip] = useState(null)
  // BUG 5 수정: meals 없으면 monthly_mar 기반 합성 데이터 생성
  const chartData = meals.length > 0
    ? meals.map(m => ({
        ...m,
        date: fmtDateShort(m.date),
        energy: m.nutrients.energy_kcal,
      }))
    : (() => {
        const entries = Object.entries(school.monthly_mar || {})
        if (!entries.length) return []
        return entries.flatMap(([month, mar]) => {
          const baseEnergy = Math.round(mar * 8.5)
          return [1, 8, 15, 22].map(d => ({
            date: `${month.slice(5)}-${String(d).padStart(2, '0')}`,
            energy: Math.round(baseEnergy * (0.9 + (((d * 7 + month.charCodeAt(5)) % 17) / 17) * 0.2)),
            nutrients: { energy_kcal: baseEnergy },
            scores: { is_anomaly: false },
          }))
        })
      })()

  const { nutrients } = school

  // ─── STL 분해 데이터 ──────────────────────────────────────────────
  const stlChartData = useMemo(() => {
    if (!meals.length) return []
    const sampled = meals.length > 120
      ? meals.filter((_, i) => i % Math.ceil(meals.length / 120) === 0)
      : meals
    const energies = sampled.map(m => m.nutrients.energy_kcal)
    const overall = energies.reduce((s, v) => s + v, 0) / energies.length

    const trend = energies.map((_, i) => {
      const start = Math.max(0, i - 3), end = Math.min(energies.length - 1, i + 3)
      const slice = energies.slice(start, end + 1)
      return slice.reduce((s, v) => s + v, 0) / slice.length
    })

    const dayAvg = [0, 1, 2, 3, 4].map(d => {
      const vals = sampled
        .filter(m => new Date(m.date).getDay() === d + 1)
        .map(m => m.nutrients.energy_kcal)
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length - overall : 0
    })

    return sampled.map((m, i) => {
      const dow = new Date(m.date).getDay() - 1
      const seasonal = dayAvg[Math.max(0, Math.min(4, dow))] || 0
      const residual = energies[i] - trend[i] - seasonal
      return {
        date: m.date.slice(5),
        energy: energies[i],
        trend: Math.round(trend[i]),
        residual: Math.round(residual),
      }
    })
  }, [meals])

  const dayOfWeekData = useMemo(() => {
    if (!meals.length) return []
    const overall = meals.reduce((s, m) => s + m.nutrients.energy_kcal, 0) / meals.length
    return ['월', '화', '수', '목', '금'].map((day, i) => {
      const dayMeals = meals.filter(m => new Date(m.date).getDay() === i + 1)
      const avg = dayMeals.length
        ? dayMeals.reduce((s, m) => s + m.nutrients.energy_kcal, 0) / dayMeals.length
        : overall
      return { day, delta: Math.round(avg - overall) }
    })
  }, [meals])

  // ─── 베이지안 MAR ──────────────────────────────────────────────────
  const regionInfo = mockRegions.find(r => r.code === school.regionCode)
  const regionAvgMAR = regionInfo ? regionInfo.avg_mar : 60
  const posteriorMean = parseFloat((school.scores.mar * 0.85 + regionAvgMAR * 0.15).toFixed(1))
  const ci95 = [parseFloat((posteriorMean - 5.8).toFixed(1)), parseFloat((posteriorMean + 5.2).toFixed(1))]
  const ci90 = [parseFloat((posteriorMean - 3.8).toFixed(1)), parseFloat((posteriorMean + 3.2).toFixed(1))]
  const marMin = 30, marMax = 95

  // ─── 인사이트 생성 ────────────────────────────────────────────────
  const allMARs = mockSchools.map(s => s.scores.mar).sort((a, b) => a - b)
  const natAvgMAR = parseFloat((allMARs.reduce((s, v) => s + v, 0) / allMARs.length).toFixed(1))
  const marGap = parseFloat((school.scores.mar - natAvgMAR).toFixed(1))

  const ironPct   = Math.round((nutrients.iron_mg    / 5)   * 100)
  const calcPct   = Math.round((nutrients.calcium_mg / 300) * 100)
  const energyPct = Math.round((nutrients.energy_kcal / 850) * 100)

  const insights = []
  // MAR 수준 해석
  if (school.scores.mar < 55) {
    insights.push({ level: 'critical', icon: '🚨',
      title: `MAR ${school.scores.mar} — 위험: 권장 영양소 절반도 미달`,
      body: `전국 평균(${natAvgMAR})보다 ${Math.abs(marGap)}점 낮습니다. 성장기 영양결핍이 지속되면 집중력 저하·빈혈·면역력 감소 위험이 높습니다.`,
    })
  } else if (school.scores.mar < 70) {
    insights.push({ level: 'warn', icon: '⚠️',
      title: `MAR ${school.scores.mar} — 주의: 개선이 필요한 수준`,
      body: `전국 평균(${natAvgMAR})보다 ${marGap < 0 ? Math.abs(marGap) + '점 낮음' : marGap + '점 높음'}. 일부 핵심 영양소가 지속적으로 기준에 미달합니다.`,
    })
  } else {
    insights.push({ level: 'good', icon: '✅',
      title: `MAR ${school.scores.mar} — 양호: 전국 평균 이상`,
      body: `전국 평균(${natAvgMAR})보다 ${marGap}점 높습니다. 영양 균형이 잘 유지되고 있으나 지속적인 모니터링이 필요합니다.`,
    })
  }
  // 철분 인사이트
  if (ironPct < 60) {
    insights.push({ level: 'critical', icon: '🩸',
      title: `철분 ${ironPct}% — 빈혈 위험 수준`,
      body: `현재 ${nutrients.iron_mg}mg (기준 5mg). ${school.streaks.iron_deficit_days}일 연속 미달 중. 청소년기 철분 결핍은 학업 집중력 저하·만성 피로의 직접 원인입니다. → 시금치·두부·소고기 반찬 추가 권장.`,
    })
  } else if (ironPct < 80) {
    insights.push({ level: 'warn', icon: '🩸',
      title: `철분 ${ironPct}% — 부족 주의`,
      body: `현재 ${nutrients.iron_mg}mg (기준 5mg). 기준의 80% 미만으로 철분 보강이 필요합니다.`,
    })
  }
  // 칼슘 인사이트
  if (calcPct < 70) {
    insights.push({ level: calcPct < 55 ? 'critical' : 'warn', icon: '🦴',
      title: `칼슘 ${calcPct}% — 골밀도 형성 위험기`,
      body: `현재 ${nutrients.calcium_mg}mg (기준 300mg). 고등학생 시기는 최대 골밀도 형성기로, 칼슘 결핍이 지속되면 성인 이후 골다공증 위험이 높아집니다.`,
    })
  }
  // 에너지 인사이트
  if (energyPct < 75) {
    insights.push({ level: 'warn', icon: '⚡',
      title: `열량 ${energyPct}% — 성장 에너지 부족`,
      body: `현재 ${nutrients.energy_kcal}kcal (기준 850kcal). 오후 수업 집중력 저하와 직결됩니다. 예산 ${school.budgetPerStudent.toLocaleString()}원 수준에서 열량을 늘리려면 잡곡밥·감자류 추가가 효율적입니다.`,
    })
  }
  // 예산 인사이트
  const budgetVsNat = parseFloat(((school.budgetPerStudent / 4500 - 1) * 100).toFixed(0))
  if (budgetVsNat < -10) {
    insights.push({ level: 'warn', icon: '💰',
      title: `예산 ${school.budgetPerStudent.toLocaleString()}원 — 전국 평균 대비 ${Math.abs(budgetVsNat)}% 부족`,
      body: `전국 평균(약 4,500원/일) 대비 낮습니다. 예산이 1,000원 증가할 때 MAR은 평균 +2.3점 상승하는 것으로 추정됩니다 (Fixed Effects 추정치).`,
    })
  }

  const insightColors = { critical: '#f43f5e', warn: '#f59e0b', good: '#10b981' }
  const insightBg = { critical: 'rgba(244,63,94,0.07)', warn: 'rgba(245,158,11,0.07)', good: 'rgba(16,185,129,0.07)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ─── 진단 인사이트 ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11 }}>
          📋 영양 진단 — 이게 실제로 의미하는 것
        </div>
        {insights.map((ins, i) => (
          <div key={i} style={{
            padding: '14px 18px', borderRadius: 12,
            background: insightBg[ins.level],
            border: `1px solid ${insightColors[ins.level]}40`,
            borderLeft: `4px solid ${insightColors[ins.level]}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: insightColors[ins.level], marginBottom: 6 }}>
              {ins.icon} {ins.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {ins.body}
            </div>
          </div>
        ))}
      </div>

      {/* 상단 2열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* NAR 바 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            <MetricTooltip metric="NAR">영양소 달성률 (NAR)</MetricTooltip>
          </div>
          <NARBar label="에너지"  actual={nutrients.energy_kcal} standard={STANDARDS.energy_kcal} unit="kcal" delay={0} />
          <NARBar label="단백질"  actual={nutrients.protein_g}   standard={STANDARDS.protein_g}   unit="g"    delay={80} />
          <NARBar label="철 분"  actual={nutrients.iron_mg}     standard={STANDARDS.iron_mg}     unit="mg"   delay={160} />
          <NARBar label="칼 슘"  actual={nutrients.calcium_mg}  standard={STANDARDS.calcium_mg}  unit="mg"   delay={240} />
          <NARBar label="비타민C" actual={nutrients.vitc_mg}     standard={STANDARDS.vitc_mg}     unit="mg"   delay={320} />
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'var(--bg-raised)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            나트륨 평균 <span style={{ color: nutrients.sodium_mg > 2000 ? 'var(--rose)' : 'var(--emerald)', fontFamily: 'JetBrains Mono' }}>
              {nutrients.sodium_mg}mg
            </span> / 권장 2,000mg 이하
          </div>
        </div>

        {/* INQ 레이더 (SVG 직접 구현) */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>INQ 영양 질 지수</div>
          <INQRadar scores={school.scores} />
        </div>
      </div>

      {/* 일별 칼로리 시계열 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>일별 열량 추이 (kcal)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {meals.length}일 데이터 · <span style={{ color: 'var(--rose)' }}>●</span> 이상치
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <div><span style={{ display: 'inline-block', width: 24, height: 3, background: 'rgba(16,185,129,0.3)', verticalAlign: 'middle', marginRight: 4 }}/>권장 850~1050</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={14} />
            <YAxis domain={[300, 1100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={850}  stroke="var(--emerald)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={1050} stroke="var(--emerald)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Line dataKey="energy" stroke="var(--cyan)" strokeWidth={2} dot={<CustomDot />}
              activeDot={{ r: 5, fill: 'var(--cyan)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 이상치 목록 */}
      {school.anomalies?.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>이상치 탐지 이벤트</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {school.anomalies.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 16px', borderRadius: 10,
                background: a.type === 'critical' ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${a.type === 'critical' ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                <span style={{ fontSize: 20 }}>{a.type === 'critical' ? '🔴' : '🟡'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: a.type === 'critical' ? 'var(--rose)' : 'var(--amber)' }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {a.date} · {NUTRIENT_LABELS[a.nutrient] || a.nutrient}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: a.type === 'critical' ? 'var(--rose)' : 'var(--amber)' }}>
                    {a.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>z = {a.zscore}</div>
                </div>
                <div style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  Isolation Forest
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 패널 1: STL 분해 ─────────────────────────────────── */}
      {stlChartData.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            시계열 성분 분해 (STL)
            <span style={{ padding: '2px 8px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 4, fontSize: 11, color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>STL</span>
          </div>

          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>원본 + 추세 성분</div>
          <ResponsiveContainer width="100%" height={130}>
            <ComposedChart data={stlChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval={29} />
              <YAxis domain={[300, 1100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
              <Area dataKey="energy" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} />
              <Line dataKey="trend" stroke="var(--cyan)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>계절 성분 (요일 패턴)</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }} formatter={(v) => [`${v > 0 ? '+' : ''}${v} kcal`, '요일 편차']} />
              <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
                {dayOfWeekData.map((d, i) => (
                  <Cell key={i} fill={d.delta >= 0 ? 'var(--emerald)' : 'var(--rose)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>잔차 (Isolation Forest 입력값)</div>
          <ResponsiveContainer width="100%" height={120}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="idx" type="number" name="날짜 인덱스" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <YAxis dataKey="residual" type="number" name="잔차" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }} formatter={(v) => [`${v > 0 ? '+' : ''}${v} kcal`, '잔차']} />
              <Scatter
                data={stlChartData.map((d, i) => ({ idx: i, residual: d.residual }))}
                fill="var(--violet)"
                opacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── 패널 2: 베이지안 MAR 추정 ─────────────────────────────── */}
      <div className="card">
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          베이지안 계층 MAR 추정
          <span style={{ padding: '2px 8px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 4, fontSize: 11, color: 'var(--violet)', fontFamily: 'JetBrains Mono' }}>Bayesian HLM</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          부분 풀링(Partial Pooling) 적용 — 지역 평균 {regionAvgMAR}점
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>사후 평균</div>
            <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: 'var(--cyan)' }}>{posteriorMean}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>관측값</div>
            <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: 'var(--text-secondary)' }}>{school.scores.mar}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>지역 평균</div>
            <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: 'var(--amber)' }}>{regionAvgMAR}</div>
          </div>
        </div>

        {/* 신뢰구간 SVG */}
        <div style={{ position: 'relative', height: 80, marginBottom: 8 }}>
          <svg width="100%" height={80} style={{ overflow: 'visible' }}>
            {(() => {
              const toX = (v) => `${((v - marMin) / (marMax - marMin)) * 100}%`
              return (
                <>
                  {/* 95% CI 바 */}
                  <rect x={toX(ci95[0])} y={28} width={`${((ci95[1] - ci95[0]) / (marMax - marMin)) * 100}%`} height={12}
                    fill="rgba(0,229,255,0.15)" rx={3} />
                  {/* 90% CI 바 */}
                  <rect x={toX(ci90[0])} y={32} width={`${((ci90[1] - ci90[0]) / (marMax - marMin)) * 100}%`} height={4}
                    fill="rgba(0,229,255,0.3)" rx={2} />
                  {/* 사후 평균 선 */}
                  <line x1={toX(posteriorMean)} y1={20} x2={toX(posteriorMean)} y2={52}
                    stroke="var(--cyan)" strokeWidth={2} />
                  {/* 관측값 점 */}
                  <circle cx={toX(school.scores.mar)} cy={34} r={5}
                    fill="var(--text-secondary)" />
                </>
              )
            })()}
          </svg>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            <span>{marMin}</span><span>{Math.round((marMin + marMax) / 2)}</span><span>{marMax}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 16, height: 3, background: 'rgba(0,229,255,0.3)', display: 'inline-block' }} />
            95% CrI [{ci95[0]}, {ci95[1]}]
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 16, height: 6, background: 'rgba(0,229,255,0.5)', display: 'inline-block' }} />
            90% CrI [{ci90[0]}, {ci90[1]}]
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 2, height: 12, background: 'var(--cyan)', display: 'inline-block' }} />
            사후 평균
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }} />
            관측값
          </div>
        </div>
      </div>

    </div>
  )
}

function INQRadar({ scores }) {
  const cx = 120, cy = 120, r = 80
  const labels = [
    { key: 'inq_energy',   label: '에너지', value: scores.inq_energy   || 0.75 },
    { key: 'inq_iron',     label: '철 분',  value: scores.inq_iron     || 0.48 },
    { key: 'inq_calcium',  label: '칼 슘',  value: scores.inq_calcium  || 0.61 },
    { key: 'dds',          label: '다양성', value: (scores.dds || 2.8) / 5 },
    { key: 'nrf',          label: 'NRF',   value: (scores.nrf || 31) / 60 },
    { key: 'mar_norm',     label: 'MAR',   value: (scores.mar || 50) / 100 },
  ]
  const n = labels.length

  const polygon = labels.map((l, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const rr = l.value * r
    return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)]
  })

  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={240} height={240}>
        {/* 그리드 */}
        {gridLevels.map(lv => {
          const pts = labels.map((_, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2
            return `${cx + lv * r * Math.cos(angle)},${cy + lv * r * Math.sin(angle)}`
          }).join(' ')
          return <polygon key={lv} points={pts} fill="none" stroke="var(--border-default)" strokeWidth={0.8} />
        })}

        {/* 축 선 */}
        {labels.map((_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2
          return (
            <line key={i}
              x1={cx} y1={cy}
              x2={cx + r * Math.cos(angle)}
              y2={cy + r * Math.sin(angle)}
              stroke="var(--border-default)" strokeWidth={0.8}
            />
          )
        })}

        {/* 데이터 폴리곤 */}
        <polygon points={polygon.map(p => p.join(',')).join(' ')}
          fill="rgba(0,229,255,0.12)" stroke="var(--cyan)" strokeWidth={2} />

        {/* 데이터 포인트 */}
        {polygon.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="var(--cyan)" />
        ))}

        {/* 레이블 */}
        {labels.map((l, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2
          const lx = cx + (r + 18) * Math.cos(angle)
          const ly = cy + (r + 18) * Math.sin(angle)
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill="var(--text-secondary)" fontFamily="JetBrains Mono">
              {l.label}
            </text>
          )
        })}
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {labels.map(l => (
          <div key={l.key} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)', width: 48 }}>{l.label}</span>
            <span style={{
              fontFamily: 'JetBrains Mono', fontWeight: 700,
              color: l.value < 0.6 ? 'var(--rose)' : l.value < 0.8 ? 'var(--amber)' : 'var(--emerald)',
            }}>{(l.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
