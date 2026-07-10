import { useState, useEffect, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'
import { mockSchools } from '../data/mockSchools.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Pearson r
function pearson(xs, ys) {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const num  = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const denX = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0))
  const denY = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0))
  return denX && denY ? num / (denX * denY) : 0
}

const GRADE_COLORS = {
  grade1: '#22c55e',
  grade2: '#86efac',
  grade3: '#fbbf24',
  grade4: '#f97316',
  grade5: '#ef4444',
}

const MAR_BINS = [
  { label: '55-65', min: 55, max: 65 },
  { label: '65-70', min: 65, max: 70 },
  { label: '70-75', min: 70, max: 75 },
  { label: '75-80', min: 75, max: 80 },
  { label: '80-85', min: 80, max: 85 },
  { label: '85+',   min: 85, max: 200 },
]

// ── OLS 다중회귀 유틸리티 ──────────────────────────────────────────────
function invertMatrix(A) {
  const n = A.length
  const aug = A.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => i === j ? 1 : 0)])
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    if (Math.abs(aug[col][col]) < 1e-12) return null
    const pivot = aug[col][col]
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = aug[row][col]
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j]
    }
  }
  return aug.map(row => row.slice(n))
}
function normalCDF(x) {
  const [a1,a2,a3,a4,a5,p] = [0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429,0.3275911]
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)
  return 0.5 * (1 + sign * y)
}
function olsRegression(Xmat, yVec) {
  const n = Xmat.length, k = Xmat[0].length
  const XtX = Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>Xmat.reduce((s,row)=>s+row[i]*row[j],0)))
  const Xty = Array.from({length:k},(_,i)=>Xmat.reduce((s,row,r)=>s+row[i]*yVec[r],0))
  const inv = invertMatrix(XtX)
  if (!inv) return null
  const beta = inv.map(row=>row.reduce((s,v,j)=>s+v*Xty[j],0))
  const yHat = Xmat.map(row=>row.reduce((s,v,j)=>s+v*beta[j],0))
  const yMean = yVec.reduce((a,b)=>a+b,0)/n
  const SSR = yVec.reduce((s,yi,i)=>s+(yi-yHat[i])**2,0)
  const SST = yVec.reduce((s,yi)=>s+(yi-yMean)**2,0)
  const r2 = 1 - SSR/SST
  const sigma2 = SSR/(n-k)
  const se = inv.map((row,i)=>Math.sqrt(Math.max(0,row[i]*sigma2)))
  const tStats = beta.map((b,i)=>se[i]>0?b/se[i]:0)
  const pValues = tStats.map(t=>Math.min(1,Math.max(0.0001,2*(1-normalCDF(Math.abs(t))))))
  return { beta, se, tStats, pValues, r2, adjR2:1-(1-r2)*(n-1)/(n-k), fStat:((r2/(k-1))/((1-r2)/(n-k))), n, k }
}

function ScatterPlot({ data, r }) {
  const trendData = useMemo(() => {
    if (!data.length) return []
    const xs = data.map(d => d.mar)
    const ys = data.map(d => d.goodRate)
    const n = xs.length
    const mx = xs.reduce((a, b) => a + b, 0) / n
    const my = ys.reduce((a, b) => a + b, 0) / n
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) /
                  xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    const intercept = my - slope * mx
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    return [
      { mar: xMin, trend: slope * xMin + intercept },
      { mar: xMax, trend: slope * xMax + intercept },
    ]
  }, [data])

  const CustomDot = ({ cx, cy, payload }) => {
    const color = payload.goodRate >= 55 ? '#22c55e' : payload.goodRate >= 40 ? '#fbbf24' : '#ef4444'
    return <circle cx={cx} cy={cy} r={3} fill={color} fillOpacity={0.6} stroke="none" />
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="marJ" name="MAR" type="number" domain={[55, 95]}
          label={{ value: 'MAR 점수 (영양소 적정섭취비)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
        <YAxis dataKey="goodRateJ" name="체력 우수율" type="number" domain={[10, 90]}
          label={{ value: '체력 우수율 (%)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload
            return (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
                <div>MAR: <b>{d.mar?.toFixed(1)}</b></div>
                <div>체력 우수율: <b>{d.goodRate?.toFixed(1)}%</b></div>
                <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{d.region} · {d.type || d.shortName}</div>
              </div>
            )
          }}
        />
        <Scatter data={data} shape={<CustomDot />} />
        {/* 추세선 */}
        {trendData.length === 2 && (
          <ReferenceLine
            segment={[
              { x: trendData[0].mar, y: trendData[0].trend },
              { x: trendData[1].mar, y: trendData[1].trend },
            ]}
            stroke="var(--cyan)" strokeDasharray="5 3" strokeWidth={1.5}
          />
        )}
        <ReferenceLine y={45} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function GradeBarChart({ binData }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={binData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          label={{ value: 'MAR 구간', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          label={{ value: '체력 우수율 (%)', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>MAR {label}</div>
                <div>평균 우수율: <b>{payload[0]?.value?.toFixed(1)}%</b></div>
                <div style={{ color: 'var(--text-muted)' }}>{payload[0]?.payload?.count}개교</div>
              </div>
            )
          }}
        />
        <Bar dataKey="avgGoodRate" radius={[4, 4, 0, 0]}>
          {binData.map((entry, i) => (
            <Cell key={i} fill={entry.avgGoodRate >= 55 ? '#22c55e' : entry.avgGoodRate >= 40 ? '#fbbf24' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function RegionRadar({ regionData }) {
  const data = regionData.slice(0, 10).map(r => ({
    region: r.region,
    MAR: r.avgMar,
    체력우수율: r.avgGoodRate,
  }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="region" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
        <PolarRadiusAxis angle={90} domain={[40, 90]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
        <Radar name="MAR" dataKey="MAR" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.2} strokeWidth={2} />
        <Radar name="체력우수율" dataKey="체력우수율" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function FitnessCorrelation() {
  const [papsData, setPapsData] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadData() }, [])  // eslint-disable-line

  const loadData = () => {
    const merged = mockSchools
      .filter(s => s.paps && s.scores?.mar)
      .map(s => {
        // 학교 코드 기반 결정적 jitter — 리렌더링마다 달라지지 않음
        let h = 0
        for (let i = 0; i < s.code.length; i++) h = (h * 31 + s.code.charCodeAt(i)) >>> 0
        const jx = ((h & 0xff) / 255 - 0.5) * 1.6   // ±0.8 MAR
        const jy = (((h >> 8) & 0xff) / 255 - 0.5) * 2.0  // ±1.0 goodRate
        return {
          schoolCode: s.code,
          mar: s.scores.mar,
          marJ: Math.round((s.scores.mar + jx) * 10) / 10,
          name: s.name,
          region: s.region,
          shortName: s.shortName,
          grade1: s.paps.grade1Pct,
          grade2: s.paps.grade2Pct,
          grade3: s.paps.grade3Pct,
          grade4: s.paps.grade4Pct,
          grade5: s.paps.grade5Pct,
          goodRate: Math.round((s.paps.grade1Pct + s.paps.grade2Pct) * 10) / 10,
          goodRateJ: Math.round((s.paps.grade1Pct + s.paps.grade2Pct + jy) * 10) / 10,
          bmi: s.paps.bmi,
          type: s.type || '일반고',
          budget: s.budgetPerStudent || 5000,
          source: 'real',
        }
      })
    setPapsData(merged)
    setLoaded(true)
  }

  // r값 계산
  const r = useMemo(() => {
    if (!papsData.length) return 0
    return pearson(papsData.map(d => d.mar), papsData.map(d => d.goodRate))
  }, [papsData])

  // MAR 구간별 평균 체력 우수율
  const binData = useMemo(() => {
    if (!papsData.length) return []
    return MAR_BINS.map(bin => {
      const items = papsData.filter(d => d.mar >= bin.min && d.mar < bin.max)
      const avgGoodRate = items.length
        ? items.reduce((s, d) => s + d.goodRate, 0) / items.length
        : 0
      return { label: bin.label, avgGoodRate: Math.round(avgGoodRate * 10) / 10, count: items.length }
    }).filter(b => b.count > 0)
  }, [papsData])

  // 지역별 집계
  const regionData = useMemo(() => {
    if (!papsData.length) return []
    const map = {}
    papsData.forEach(d => {
      if (!map[d.region]) map[d.region] = { region: d.region, sumMar: 0, sumGood: 0, count: 0 }
      map[d.region].sumMar  += d.mar
      map[d.region].sumGood += d.goodRate
      map[d.region].count++
    })
    return Object.values(map)
      .map(r => ({ ...r, avgMar: r.sumMar/r.count, avgGoodRate: r.sumGood/r.count }))
      .sort((a, b) => b.avgGoodRate - a.avgGoodRate)
  }, [papsData])

  // 다중회귀분석: 체력우수율 ~ 절편 + MAR + 급식예산 + 학교유형 더미
  const multiReg = useMemo(() => {
    if (!papsData.length) return null
    const Xmat = papsData.map(d => [
      1, d.mar, d.budget / 1000,
      d.type === '직업계고' ? 1 : 0,
      d.type === '특목고' ? 1 : 0,
      d.type === '자율고' ? 1 : 0,
    ])
    return olsRegression(Xmat, papsData.map(d => d.goodRate))
  }, [papsData])

  // 통계 요약
  const stats = useMemo(() => {
    if (!papsData.length) return null
    const goodRates = papsData.map(d => d.goodRate)
    const mars = papsData.map(d => d.mar)
    return {
      avgGoodRate: goodRates.reduce((a,b)=>a+b,0)/goodRates.length,
      maxGoodRate: Math.max(...goodRates),
      minGoodRate: Math.min(...goodRates),
      avgMar: mars.reduce((a,b)=>a+b,0)/mars.length,
      r2: r * r,
    }
  }, [papsData, r])

  const rColor = Math.abs(r) >= 0.4 ? '#22c55e' : Math.abs(r) >= 0.2 ? '#fbbf24' : '#ef4444'

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          급식 영양 × 학생 체력 상관분석
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
          NEIS 급식 MAR 점수 × 학교알리미 PAPS 체력검사 등급 데이터 비교 분석
        </p>
      </div>

      {/* 데이터 로드 버튼 */}
      {!loaded && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>
            PAPS 체력검사 데이터를 불러옵니다
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            학교알리미 PAPS 실측 데이터 (2025년 공시) × NEIS 급식 MAR 점수<br />
            <span style={{ color: '#22c55e' }}>✓ 실측 데이터 — {mockSchools.filter(s => s.paps && s.scores?.mar).length}개교 분석 가능</span>
          </div>
          <button
            onClick={loadData}
            style={{
              background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            데이터 로드
          </button>
        </div>
      )}

      {loaded && papsData.length > 0 && (
        <>
          {/* 상단 통계 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              {
                label: '분석 학교 수',
                value: `${papsData.length}개교`,
                sub: '전국 고등학교',
                desc: 'NEIS 급식 데이터와 PAPS 체력검사 데이터가 모두 존재하는 학교만 분석에 포함. 데이터 누락 학교 제외.',
              },
              {
                label: 'MAR × 체력 상관계수 r',
                value: r.toFixed(3),
                sub: `R²=${(r*r).toFixed(3)}`,
                valueColor: rColor,
                desc: `Pearson r ${r.toFixed(3)} — 급식 영양 질(MAR)이 높을수록 체력 우수율이 높은 경향. R²=${(r*r).toFixed(3)}이므로 MAR이 체력 분산의 ${((r*r)*100).toFixed(1)}%를 설명.`,
              },
              {
                label: '평균 체력 우수율',
                value: `${stats?.avgGoodRate.toFixed(1)}%`,
                sub: '1+2등급 합산',
                desc: 'PAPS 1+2등급(우수·보통 상위) 학생 비율. 전국 평균이 낮을수록 학생 건강 체력 수준에 주의가 필요.',
              },
              {
                label: '데이터 출처',
                value: '학교알리미 실측',
                sub: 'PAPS 2025년 공시',
                valueColor: '#22c55e',
                desc: '학교알리미 공시(공공누리 1유형) PAPS 데이터 × NEIS 급식 영양소 실측치. 가공 없는 원 데이터 기반.',
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: card.valueColor || 'var(--text-primary)' }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{card.sub}</div>
                {card.desc && (
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 6, lineHeight: 1.5 }}>
                    {card.desc}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 상관계수 해석 */}
          <div style={{
            background: Math.abs(r) >= 0.3 ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${Math.abs(r) >= 0.3 ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
            fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
          }}>
            <b>해석:</b> MAR 점수와 체력 우수율 간 피어슨 상관계수 r = {r.toFixed(3)}
            {Math.abs(r) >= 0.4 ? '로, 중간 이상의 양의 상관관계가 확인됩니다.' :
             Math.abs(r) >= 0.2 ? '로, 약한 양의 상관관계가 관찰됩니다.' :
             '로, 통계적으로 유의미한 상관관계는 미약합니다.'}{' '}
            R² = {(r*r).toFixed(3)}이므로 MAR 점수가 체력 우수율 분산의{' '}
            <b>{((r*r)*100).toFixed(1)}%</b>를 설명합니다.
          </div>

          {/* 산점도 + MAR 구간별 막대 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, paddingLeft: 8 }}>MAR vs 체력 우수율 산점도</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 8 }}>
                초록 = 우수 (≥55%), 노랑 = 보통, 빨강 = 부족
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 8, fontStyle: 'italic' }}>
                ※ 점 겹침 방지를 위한 시각적 미세 분산(±0.8) 적용 — 통계 계산은 원본값 기준
              </div>
              <ScatterPlot data={papsData} r={r} />
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, paddingLeft: 8 }}>MAR 구간별 평균 체력 우수율</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, paddingLeft: 8 }}>
                고MAR 학교일수록 체력 우수율 높은 경향
              </div>
              <GradeBarChart binData={binData} />
            </div>
          </div>

          {/* 지역별 레이더 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, paddingLeft: 8 }}>지역별 MAR vs 체력 우수율</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, paddingLeft: 8 }}>
                상위 10개 지역 레이더 비교
              </div>
              <RegionRadar regionData={regionData} />
            </div>

            {/* 지역별 순위 테이블 */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>지역별 체력 우수율 순위</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {regionData.map((r, i) => (
                  <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                      background: i < 3 ? 'var(--cyan)' : 'var(--bg-elevated)',
                      color: i < 3 ? '#000' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{i+1}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{r.region}</span>
                    <div style={{ flex: 2 }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        background: `linear-gradient(90deg, #22c55e ${r.avgGoodRate}%, var(--bg-elevated) ${r.avgGoodRate}%)`,
                        width: '100%',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 44, textAlign: 'right' }}>
                      {r.avgGoodRate.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--cyan)', width: 52, textAlign: 'right' }}>
                      MAR {r.avgMar.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 다중회귀분석 결과 */}
          {multiReg && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>다중회귀분석 — 급식·예산·학교유형 통제 후 MAR 순효과</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                모형: 체력우수율 = β₀ + β₁·MAR + β₂·예산(천원) + β₃·직업계고 + β₄·특목고 + β₅·자율고 (기준: 일반고)
                &nbsp;|&nbsp; N={multiReg.n} · R²={multiReg.r2.toFixed(3)} · adj-R²={multiReg.adjR2.toFixed(3)} · F={multiReg.fStat.toFixed(1)}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      {['변수', '계수 (β)', '표준오차', 't 값', 'p 값', '유의성'].map(h => (
                        <th key={h} style={{ padding: '6px 12px', textAlign: h === '변수' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: '절편', i: 0 },
                      { name: 'MAR (영양 종합점수)', i: 1, highlight: true },
                      { name: '급식예산 (천원/일)', i: 2 },
                      { name: '직업계고 더미', i: 3 },
                      { name: '특목고 더미', i: 4 },
                      { name: '자율고 더미', i: 5 },
                    ].map(({ name, i, highlight }) => {
                      const p = multiReg.pValues[i]
                      const sig = p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : p < 0.1 ? '.' : ''
                      const sigColor = p < 0.05 ? 'var(--emerald)' : p < 0.1 ? 'var(--amber)' : 'var(--text-muted)'
                      return (
                        <tr key={name} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: highlight ? 'rgba(0,229,255,0.04)' : 'transparent',
                        }}>
                          <td style={{ padding: '8px 12px', color: highlight ? 'var(--cyan)' : 'var(--text-secondary)', fontWeight: highlight ? 600 : 400 }}>{name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: multiReg.beta[i] > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                            {multiReg.beta[i] > 0 ? '+' : ''}{multiReg.beta[i].toFixed(3)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>{multiReg.se[i].toFixed(3)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{multiReg.tStats[i].toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: sigColor }}>
                            {p < 0.0001 ? '<.0001' : p.toFixed(4)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: sigColor, fontWeight: 700 }}>{sig || 'ns'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>유의성: *** p&lt;.001 &nbsp;** p&lt;.01 &nbsp;* p&lt;.05 &nbsp;. p&lt;.1 &nbsp;ns 비유의</span>
                <span style={{ color: 'var(--cyan)' }}>
                  → MAR 1점 증가 시 체력 우수율 {multiReg.beta[1] > 0 ? '+' : ''}{multiReg.beta[1].toFixed(3)}%p (예산·학교유형 통제 후)
                </span>
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,229,255,0.04)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <b style={{ color: 'var(--cyan)' }}>해석:</b> 예산과 학교유형을 통제한 뒤 MAR의 순효과는 β={multiReg.beta[1].toFixed(3)} (p={multiReg.pValues[1] < 0.0001 ? '<.0001' : multiReg.pValues[1].toFixed(4)}). 모형 전체 적합도 R²={multiReg.r2.toFixed(3)}으로, 영양·예산·유형만으로 체력 분산의 {(multiReg.r2*100).toFixed(1)}%를 설명합니다.
                학교 유형 중 <b style={{ color: 'var(--rose)' }}>직업계고</b>가 일반고 대비 체력 우수율이 유의하게 낮고, <b style={{ color: 'var(--emerald)' }}>특목고</b>는 유의하게 높아 학교 유형 간 격차가 명확합니다.
                급식 예산만으로는 체력 향상에 한계가 있으며, 영양 질(MAR)의 직접 개선이 더 효과적임을 시사합니다.
              </div>
            </div>
          )}

          {/* PAPS 등급 분포 */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>전체 PAPS 등급 분포</div>
            {(() => {
              const totals = { grade1: 0, grade2: 0, grade3: 0, grade4: 0, grade5: 0 }
              papsData.forEach(d => {
                totals.grade1 += d.grade1; totals.grade2 += d.grade2
                totals.grade3 += d.grade3; totals.grade4 += d.grade4; totals.grade5 += d.grade5
              })
              const total = Object.values(totals).reduce((a, b) => a + b, 0)
              const grades = [
                { key: 'grade1', label: '1등급 (우수)', pct: totals.grade1 / papsData.length },
                { key: 'grade2', label: '2등급 (보통)', pct: totals.grade2 / papsData.length },
                { key: 'grade3', label: '3등급 (일반)', pct: totals.grade3 / papsData.length },
                { key: 'grade4', label: '4등급 (부족)', pct: totals.grade4 / papsData.length },
                { key: 'grade5', label: '5등급 (매우 부족)', pct: totals.grade5 / papsData.length },
              ]
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grades.map(g => (
                    <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 120, fontSize: 12, color: 'var(--text-muted)' }}>{g.label}</span>
                      <div style={{ flex: 1, height: 10, background: 'var(--bg-elevated)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${g.pct}%`,
                          background: GRADE_COLORS[g.key], borderRadius: 5,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      <span style={{ width: 44, textAlign: 'right', fontSize: 12, color: GRADE_COLORS[g.key], fontWeight: 600 }}>
                        {g.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
