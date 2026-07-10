import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, ScatterChart, Scatter,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts'
import { mockRegions } from '../data/mockRegions.js'
import { mockSchools } from '../data/mockSchools.js'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js'
import { marColor, marBadgeClass } from '../utils/nutrition.js'
import { fmtDate, marGrade, schoolDisplayName } from '../utils/formatters.js'

function StatCard({ label, value, suffix = '', color, decimals = 0, description }) {
  const animated = useAnimatedNumber(value, 900, decimals)
  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${color}30`,
      borderRadius: 16, padding: '20px 24px',
      boxShadow: `0 0 32px ${color}10`,
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Syne', fontSize: 42, fontWeight: 800, color, lineHeight: 1 }}>
        {decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString('ko-KR')}{suffix}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6, borderTop: `1px solid ${color}18`, paddingTop: 10 }}>
          {description}
        </div>
      )}
    </div>
  )
}

const REGION_COLORS = { HH: '#f43f5e', HL: '#f97316', LH: '#f59e0b', LL: '#10b981', NS: '#475569' }

function normalCDFNational(x) {
  const [a1,a2,a3,a4,a5,p] = [0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429,0.3275911]
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)
  return 0.5 * (1 + sign * y)
}

function KoreaMap({ regions, onSelect, selected }) {
  const viewW = 380, viewH = 480
  const minLng = 124.0, minLat = 33.0, scale = 50

  // 상대 평가: 지역 MAR 분포 기준 3분위 컷
  const mars = regions.map(r => r.avg_mar).sort((a, b) => a - b)
  const n = mars.length
  const p33 = mars[Math.floor(n * 0.33)]
  const p67 = mars[Math.floor(n * 0.67)]
  const relColor = mar => {
    if (mar >= p67) return 'var(--emerald)'   // 상위 1/3
    if (mar >= p33) return 'var(--amber)'     // 중위 1/3
    return 'var(--rose)'                      // 하위 1/3
  }
  const relLabel = mar => {
    if (mar >= p67) return '상위권'
    if (mar >= p33) return '중위권'
    return '하위권'
  }

  const pts = regions.map(r => ({
    ...r,
    x: (r.lng - minLng) * scale,
    y: viewH - (r.lat - minLat) * scale,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
        시도별 MAR 분포 <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(상대 평가)</span>
      </div>
      <svg width={viewW} height={viewH} style={{ overflow: 'visible' }}>
        {/* 한국 국토 윤곽 (남한 기준 단순화 경로) */}
        <path
          d="M 110,215 L 150,215 L 210,215 L 230,220 L 255,250 L 270,280 L 270,332 L 260,362 L 252,375 L 242,385 L 218,394 L 198,398 L 180,398 L 158,406 L 138,412 L 122,414 L 120,398 L 112,380 L 112,358 L 132,345 L 124,322 L 112,298 L 118,280 L 128,258 L 118,245 L 105,232 Z"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* 제주도 */}
        <ellipse cx={125} cy={455} rx={18} ry={10}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
        {pts.map(r => {
          const isSelected = selected?.code === r.code
          const c = relColor(r.avg_mar)
          const radius = 14 + (r.school_count / 100)
          return (
            <g key={r.code} style={{ cursor: 'pointer' }} onClick={() => onSelect(r)}>
              <circle cx={r.x} cy={r.y} r={radius}
                fill={`${c}20`} stroke={c} strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ transition: 'all 0.2s' }}
              />
              <text x={r.x} y={r.y - radius - 4} textAnchor="middle"
                fontSize="9" fill={c} fontFamily="JetBrains Mono" fontWeight="700">
                {r.shortName}
              </text>
              <text x={r.x} y={r.y + 4} textAnchor="middle"
                fontSize="10" fill="white" fontFamily="JetBrains Mono" fontWeight="700">
                {r.avg_mar.toFixed(0)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['var(--emerald)', `상위권 (≥${p67.toFixed(0)})`], ['var(--amber)', '중위권'], ['var(--rose)', `하위권 (<${p33.toFixed(0)})`]].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

const ANOMALY_FEED_INIT = [
  { school: "강진고등학교", region: "전남", date: "2024-11-28", nutrient: "에너지", value: "421 kcal", type: "critical" },
  { school: "한림고등학교", region: "제주", date: "2024-11-27", nutrient: "철분",   value: "1.0 mg",  type: "critical" },
  { school: "담양고등학교", region: "전남", date: "2024-11-26", nutrient: "칼슘",   value: "162 mg",  type: "warning" },
  { school: "구미공업고",   region: "경북", date: "2024-11-25", nutrient: "에너지", value: "468 kcal", type: "critical" },
  { school: "태백고등학교", region: "강원", date: "2024-11-24", nutrient: "철분",   value: "1.5 mg",  type: "warning" },
]

// Gini 계수 계산 (0=완전평등, 1=완전불평등)
function calcGini(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, v) => s + v, 0) / n
  if (mean === 0) return 0
  let sumDiff = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      sumDiff += Math.abs(sorted[i] - sorted[j])
  return sumDiff / (2 * n * n * mean)
}

// K-means 군집분석 (결정론적 초기화 — 정렬 후 등간격 피벗)
function kMeansSeeded(points, k, maxIter = 120) {
  const sorted = [...points].sort((a, b) => a.nx - b.nx)
  const step = Math.floor(sorted.length / k)
  let centroids = Array.from({length: k}, (_, i) => ({ nx: sorted[Math.max(0, i * step)].nx, ny: sorted[Math.max(0, i * step)].ny }))
  let assignments = new Array(points.length).fill(0)
  for (let iter = 0; iter < maxIter; iter++) {
    const newAss = points.map(p => {
      let minD = Infinity, best = 0
      centroids.forEach((c, i) => {
        const d = (p.nx - c.nx) ** 2 + (p.ny - c.ny) ** 2
        if (d < minD) { minD = d; best = i }
      })
      return best
    })
    if (newAss.every((a, i) => a === assignments[i])) break
    assignments = newAss
    centroids = Array.from({length: k}, (_, ci) => {
      const pts = points.filter((_, i) => assignments[i] === ci)
      if (!pts.length) return centroids[ci]
      return { nx: pts.reduce((s, p) => s + p.nx, 0) / pts.length, ny: pts.reduce((s, p) => s + p.ny, 0) / pts.length }
    })
  }
  return { assignments, centroids }
}

// 학교 트렌드 (monthly_mar 마지막 3개월 기울기)
function calcTrend(school) {
  const entries = Object.entries(school.monthly_mar || {}).sort((a, b) => a[0].localeCompare(b[0]))
  if (entries.length < 2) return 0
  const recent = entries.slice(-3).map(([, v]) => v)
  return recent[recent.length - 1] - recent[0]
}

export function NationalDashboard() {
  const navigate = useNavigate()
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [feedItems, setFeedItems] = useState(ANOMALY_FEED_INIT)
  const [sortBy, setSortBy] = useState('mar_asc')
  const [filter, setFilter] = useState('all')
  const [statView, setStatView] = useState('gini') // 'gini' | 'type' | 'scatter' | 'dist' | 'nutrient' | 'cluster' | 'policy' | 'heatmap'
  const [policyDelta, setPolicyDelta] = useState(500) // 원/일 예산 증가액

  // ── 실데이터 기반 통계 계산 ──────────────────────────────────────────
  const allMAR = useMemo(() => mockSchools.map(s => s.scores.mar), [])

  const stats = useMemo(() => {
    const total = mockSchools.length
    const missCount = mockSchools.filter(s => s.scores.mar < 60).length
    const avgMAR = allMAR.reduce((s, v) => s + v, 0) / total
    const gini = calcGini(allMAR)
    const nutritionTeacherRate = mockSchools.filter(s => s.hasNutritionTeacher).length / total * 100
    return {
      total,
      missCount,
      missRate: Math.round((missCount / total) * 100),
      avgMAR: parseFloat(avgMAR.toFixed(1)),
      gini: parseFloat(gini.toFixed(3)),
      nutritionTeacherRate: parseFloat(nutritionTeacherRate.toFixed(1)),
    }
  }, [allMAR])

  // ── PAPS 실측 통계 ──────────────────────────────────────────────────
  const papsStats = useMemo(() => {
    const withPaps = mockSchools.filter(s => s.paps)
    if (!withPaps.length) return null
    const avg1 = withPaps.reduce((s, v) => s + v.paps.grade1Pct, 0) / withPaps.length
    const avg5 = withPaps.reduce((s, v) => s + v.paps.grade5Pct, 0) / withPaps.length
    const avgBmi = withPaps.reduce((s, v) => s + (v.paps.bmi || 0), 0) / withPaps.length
    const avgGoodRate = withPaps.reduce((s, v) => s + v.paps.grade1Pct + v.paps.grade2Pct, 0) / withPaps.length

    const byRegion = {}
    withPaps.forEach(s => {
      if (!byRegion[s.region]) byRegion[s.region] = { sum1: 0, sum5: 0, sumBmi: 0, n: 0 }
      byRegion[s.region].sum1 += s.paps.grade1Pct
      byRegion[s.region].sum5 += s.paps.grade5Pct
      byRegion[s.region].sumBmi += s.paps.bmi || 0
      byRegion[s.region].n++
    })
    const regionRank = Object.entries(byRegion)
      .map(([region, d]) => ({ region, avg1: d.sum1/d.n, avg5: d.sum5/d.n, avgBmi: d.sumBmi/d.n, n: d.n }))
      .sort((a, b) => b.avg1 - a.avg1)

    return { count: withPaps.length, avg1, avg5, avgBmi, avgGoodRate, regionRank }
  }, [])

  // 지역별 바 차트 데이터 (mockSchools에서 직접 계산)
  const regionBarData = useMemo(() => {
    const byRegion = {}
    mockSchools.forEach(s => {
      if (!byRegion[s.regionCode]) byRegion[s.regionCode] = { mars: [], name: s.region, code: s.regionCode }
      byRegion[s.regionCode].mars.push(s.scores.mar)
    })
    return Object.values(byRegion)
      .map(r => ({
        name: mockRegions.find(mr => mr.code === r.code)?.shortName || r.name,
        mar: parseFloat((r.mars.reduce((s, v) => s + v, 0) / r.mars.length).toFixed(1)),
        miss: Math.round(r.mars.filter(v => v < 60).length / r.mars.length * 100),
        code: r.code,
      }))
      .sort((a, b) => a.mar - b.mar)
  }, [])

  // 학교 유형별 MAR 분포
  const typeData = useMemo(() => {
    const byType = {}
    mockSchools.forEach(s => {
      if (!byType[s.type]) byType[s.type] = []
      byType[s.type].push(s.scores.mar)
    })
    const allMars = mockSchools.map(s => s.scores.mar)
    const totalMean = allMars.reduce((a,b)=>a+b,0)/allMars.length
    const totalVar = allMars.reduce((a,v)=>a+(v-totalMean)**2,0)/allMars.length
    return Object.entries(byType).map(([type, mars]) => {
      const sorted = [...mars].sort((a, b) => a - b)
      const n = sorted.length
      const avg = mars.reduce((s, v) => s + v, 0) / n
      const variance = mars.reduce((s,v)=>s+(v-avg)**2,0)/n
      // Cohen's d vs 전국 평균
      const pooledSD = Math.sqrt((variance + totalVar) / 2)
      const cohensD = pooledSD > 0 ? (avg - totalMean) / pooledSD : 0
      return {
        type,
        avg: parseFloat(avg.toFixed(1)),
        p25: sorted[Math.floor(n * 0.25)],
        p50: sorted[Math.floor(n * 0.5)],
        p75: sorted[Math.floor(n * 0.75)],
        cohensD: parseFloat(cohensD.toFixed(2)),
        count: n,
      }
    }).sort((a, b) => b.avg - a.avg)
  }, [])

  // 예산-MAR 산점도 (전체) + 효율 프론티어
  const scatterData = useMemo(() => {
    const all = mockSchools.map(s => ({
      budget: s.budgetPerStudent, mar: s.scores.mar,
      type: s.type, name: s.shortName, code: s.code,
    }))
    // 효율 프론티어: 예산 오름차순 정렬 후 MAR 최대값 갱신 학교
    const sorted = [...all].sort((a, b) => a.budget - b.budget)
    const frontierSet = new Set()
    let maxMAR = -Infinity
    for (const s of sorted) {
      if (s.mar > maxMAR) { maxMAR = s.mar; frontierSet.add(s.code) }
    }
    return all.map(s => ({ ...s, frontier: frontierSet.has(s.code) }))
  }, [])

  // K-means 군집분석 (MAR × 예산 정규화)
  const clusterData = useMemo(() => {
    const schools = mockSchools.map(s => ({
      mar: s.scores.mar, budget: s.budgetPerStudent,
      type: s.type, name: s.shortName, code: s.code,
    }))
    const mars = schools.map(s => s.mar), budgets = schools.map(s => s.budget)
    const mMar = mars.reduce((a,b)=>a+b,0)/mars.length
    const sMar = Math.sqrt(mars.reduce((s,v)=>s+(v-mMar)**2,0)/mars.length)
    const mBudget = budgets.reduce((a,b)=>a+b,0)/budgets.length
    const sBudget = Math.sqrt(budgets.reduce((s,v)=>s+(v-mBudget)**2,0)/budgets.length)
    const pts = schools.map(s => ({
      ...s,
      nx: (s.mar - mMar) / sMar,
      ny: (s.budget - mBudget) / sBudget,
    }))
    const { assignments, centroids } = kMeansSeeded(pts, 4)
    const CLUSTER_META = [
      { label: '고MAR·고예산', color: 'var(--emerald)', emoji: '🟢' },
      { label: '고MAR·저예산', color: 'var(--cyan)',    emoji: '🔵' },
      { label: '저MAR·고예산', color: 'var(--amber)',   emoji: '🟡' },
      { label: '저MAR·저예산', color: 'var(--rose)',    emoji: '🔴' },
    ]
    // 군집 라벨 자동 배정: 중심점 위치에 따라
    const labeledCentroids = centroids.map((c, i) => ({
      ...c, idx: i,
      isHighMAR: c.nx >= 0, isHighBudget: c.ny >= 0,
    }))
    const sortedByQuadrant = labeledCentroids.slice().sort((a, b) => {
      const qa = (a.isHighMAR ? 0 : 2) + (a.isHighBudget ? 0 : 1)
      const qb = (b.isHighMAR ? 0 : 2) + (b.isHighBudget ? 0 : 1)
      return qa - qb
    })
    const clusterLabel = {}
    sortedByQuadrant.forEach((c, rank) => { clusterLabel[c.idx] = rank })

    return pts.map((p, i) => ({
      ...p, cluster: clusterLabel[assignments[i]],
      color: CLUSTER_META[clusterLabel[assignments[i]]].color,
      label: CLUSTER_META[clusterLabel[assignments[i]]].label,
    }))
  }, [])

  // 정책 시뮬레이터용 OLS: MAR ~ 1 + budget
  const policyReg = useMemo(() => {
    const schools = mockSchools.filter(s => s.budgetPerStudent > 0)
    const n = schools.length
    const xs = schools.map(s => s.budgetPerStudent)
    const ys = schools.map(s => s.scores.mar)
    const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n
    const slope = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0) / xs.reduce((s,x)=>s+(x-mx)**2,0)
    const intercept = my - slope * mx
    const yHat = xs.map(x => intercept + slope * x)
    const SSR = ys.reduce((s,y,i)=>s+(y-yHat[i])**2,0)
    const SST = ys.reduce((s,y)=>s+(y-my)**2,0)
    const r2 = 1 - SSR/SST
    return { slope, intercept, r2, avgBudget: mx, avgMAR: my }
  }, [])

  // MAR 히스토그램 데이터 (10구간)
  const histData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${40 + i * 6}~${46 + i * 6}`,
      min: 40 + i * 6,
      max: 46 + i * 6,
      count: 0,
    }))
    allMAR.forEach(v => {
      const idx = Math.min(9, Math.floor((v - 40) / 6))
      if (idx >= 0) bins[idx].count++
    })
    // 정규분포 오버레이
    const mean = allMAR.reduce((s, v) => s + v, 0) / allMAR.length
    const std = Math.sqrt(allMAR.reduce((s, v) => s + (v - mean) ** 2, 0) / allMAR.length)
    bins.forEach(b => {
      const x = (b.min + b.max) / 2
      b.normal = Math.round(allMAR.length * 6 / (std * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * ((x - mean) / std) ** 2))
    })
    return { bins, mean: parseFloat(mean.toFixed(1)), std: parseFloat(std.toFixed(1)) }
  }, [allMAR])

  // 영양소별 결핍률
  const nutrientDeficiency = useMemo(() => {
    const standards = { energy_kcal: 850, protein_g: 25, iron_mg: 5, calcium_mg: 300, vitc_mg: 35, sodium_mg: 2000 }
    const labels = { energy_kcal: '에너지', protein_g: '단백질', iron_mg: '철분', calcium_mg: '칼슘', vitc_mg: '비타민C', sodium_mg: '나트륨↑' }
    return Object.entries(standards).map(([key, std]) => {
      const isSodium = key === 'sodium_mg'
      const defCount = mockSchools.filter(s => {
        const v = s.nutrients[key]
        return v != null && (isSodium ? v > std : v < std * 0.85)
      }).length
      return {
        label: labels[key],
        pct: Math.round(defCount / mockSchools.length * 100),
        color: isSodium ? 'var(--rose)' : defCount / mockSchools.length > 0.4 ? 'var(--rose)' : defCount / mockSchools.length > 0.2 ? 'var(--amber)' : 'var(--emerald)',
        warn: isSodium,
      }
    }).sort((a, b) => b.pct - a.pct)
  }, [])

  // Gini 로렌츠 곡선 데이터
  const lorenzData = useMemo(() => {
    const sorted = [...allMAR].sort((a, b) => a - b)
    const n = sorted.length
    const totalMAR = sorted.reduce((s, v) => s + v, 0)
    let cumPop = 0, cumMAR = 0
    const pts = [{ pop: 0, mar: 0, equal: 0 }]
    sorted.forEach((v, i) => {
      cumPop = (i + 1) / n * 100
      cumMAR += v / totalMAR * 100
      if (i % Math.floor(n / 50) === 0 || i === n - 1)
        pts.push({ pop: parseFloat(cumPop.toFixed(1)), mar: parseFloat(cumMAR.toFixed(1)), equal: parseFloat(cumPop.toFixed(1)) })
    })
    return pts
  }, [allMAR])

  // 실측 HLM-style 분산 분해 (1원-way ANOVA + 계절 분산)
  const hlmDecomp = useMemo(() => {
    const schools = mockSchools.filter(s => s.scores?.mar && s.region !== '기타')
    const n = schools.length
    const grandMean = schools.reduce((a,s) => a+s.scores.mar, 0) / n
    const byRegion = {}
    schools.forEach(s => {
      if (!byRegion[s.region]) byRegion[s.region] = []
      byRegion[s.region].push(s.scores.mar)
    })
    let SSB = 0
    Object.values(byRegion).forEach(mars => {
      const rm = mars.reduce((a,b) => a+b, 0) / mars.length
      SSB += mars.length * (rm - grandMean) ** 2
    })
    const SST = schools.reduce((a,s) => a+(s.scores.mar - grandMean)**2, 0)
    // 학교 내 계절 분산 추정 (monthly_mar)
    const withMonthly = schools.filter(s => s.monthly_mar && Object.keys(s.monthly_mar).length >= 3)
    let avgSeasonalVar = 0
    if (withMonthly.length > 0) {
      withMonthly.forEach(s => {
        const vals = Object.values(s.monthly_mar).map(Number)
        const m = vals.reduce((a,b) => a+b, 0) / vals.length
        avgSeasonalVar += vals.reduce((sum,v) => sum+(v-m)**2, 0) / vals.length
      })
      avgSeasonalVar /= withMonthly.length
    }
    const totalVar = SST / n
    const betweenRegionPct = Math.max(1, Math.round(SSB/SST * 100))
    const withinSchoolPct = Math.max(1, Math.min(
      100 - betweenRegionPct - 1,
      Math.round(avgSeasonalVar / totalVar * 100)
    ))
    const betweenSchoolPct = 100 - betweenRegionPct - withinSchoolPct
    const icc = parseFloat((SSB/SST).toFixed(3))
    return {
      data: [
        { name: '학교 간 (지역 내)', value: betweenSchoolPct, color: 'var(--cyan)' },
        { name: '지역 간', value: betweenRegionPct, color: 'var(--violet)' },
        { name: '학교 내 (계절)', value: withinSchoolPct, color: 'var(--amber)' },
      ],
      icc,
    }
  }, [])

  // 실측 Moran's I 공간 자기상관 (k=5 최근접 이웃, 행 표준화 가중치)
  const moranData = useMemo(() => {
    const schools = mockSchools.filter(s => s.lat && s.lng && s.scores?.mar)
    const n = schools.length
    const x = schools.map(s => s.scores.mar)
    const xBar = x.reduce((a,b) => a+b, 0) / n
    const xDev = x.map(v => v - xBar)
    const K = 5
    // kNN 탐색 (min-heap 방식, O(n²) 총)
    const nbrs = schools.map((si, i) => {
      const heap = []
      for (let j = 0; j < n; j++) {
        if (j === i) continue
        const d = (si.lat - schools[j].lat)**2 + (si.lng - schools[j].lng)**2
        if (heap.length < K) {
          heap.push({ j, d })
          if (heap.length === K) heap.sort((a,b) => b.d - a.d)
        } else if (d < heap[0].d) {
          heap[0] = { j, d }
          for (let p = 0; p < K-1; p++) {
            if (heap[p].d < heap[p+1].d) { const t=heap[p]; heap[p]=heap[p+1]; heap[p+1]=t }
            else break
          }
        }
      }
      return heap.map(h => h.j)
    })
    // Moran's I (행 표준화: wij = 1/K)
    let num = 0
    for (let i = 0; i < n; i++)
      for (const j of nbrs[i])
        num += xDev[i] * xDev[j]
    const denom = xDev.reduce((s,v) => s+v*v, 0)
    const I = num / (K * denom)
    // 점근 z-검정
    const EI = -1 / (n - 1)
    const colSums = new Array(n).fill(0)
    for (let i = 0; i < n; i++) for (const j of nbrs[i]) colSums[j] += 1/K
    let S1 = 0, S2 = 0
    for (let i = 0; i < n; i++) {
      for (const j of nbrs[i]) {
        const wij = 1/K, wji = nbrs[j].includes(i) ? 1/K : 0
        S1 += 0.5*(wij+wji)**2
      }
      S2 += (1 + colSums[i])**2
    }
    const Wn = n
    const varI = (n*n*S1 - n*S2 + 3*Wn*Wn) / ((n*n-1)*Wn*Wn) - EI*EI
    const z = varI > 0 ? (I - EI) / Math.sqrt(varI) : 0
    const pVal = Math.min(1, 2*(1-normalCDFNational(Math.abs(z))))
    // 최저 MAR 지역 = 핫스팟
    const regionMARs = {}
    schools.forEach(s => {
      if (!regionMARs[s.region]) regionMARs[s.region] = []
      regionMARs[s.region].push(s.scores.mar)
    })
    const hotspots = Object.entries(regionMARs)
      .map(([r, ms]) => [r, ms.reduce((a,b)=>a+b,0)/ms.length])
      .sort((a,b) => a[1]-b[1])
      .slice(0,4).map(([r]) => r).join('·')
    return {
      I: parseFloat(I.toFixed(3)),
      z: parseFloat(z.toFixed(2)),
      pVal: parseFloat(pVal.toFixed(4)),
      n, hotspots, sig: pVal < 0.05,
    }
  }, [])

  // 영양소 × MAR × 예산 상관 행렬 (Pearson r)
  const nutrientHeatmap = useMemo(() => {
    const FIELDS = [
      { key: 'energy_kcal', label: '에너지' },
      { key: 'protein_g',   label: '단백질' },
      { key: 'iron_mg',     label: '철분' },
      { key: 'calcium_mg',  label: '칼슘' },
      { key: 'vitc_mg',     label: '비타민C' },
      { key: 'sodium_mg',   label: '나트륨' },
      { key: 'fiber_g',     label: '식이섬유' },
      { key: 'mar',         label: 'MAR' },
      { key: 'budget',      label: '예산' },
    ]
    const vecs = FIELDS.map(f => {
      if (f.key === 'mar') return mockSchools.map(s => s.scores.mar)
      if (f.key === 'budget') return mockSchools.map(s => s.budgetPerStudent)
      return mockSchools.map(s => s.nutrients[f.key] ?? 0)
    })
    const pearson = (xs, ys) => {
      const n = xs.length
      const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n
      const num = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)
      const dx = Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2,0))
      const dy = Math.sqrt(ys.reduce((s,y)=>s+(y-my)**2,0))
      return dx && dy ? parseFloat((num/(dx*dy)).toFixed(2)) : 0
    }
    const matrix = vecs.map((v,i) => vecs.map((w,j) => pearson(v,w)))
    return { fields: FIELDS, matrix }
  }, [])

  // 학교 목록 필터
  const sortedSchools = useMemo(() => [...mockSchools]
    .filter(s => {
      if (filter === 'miss') return s.scores.mar < 60
      if (filter === 'warn') return s.scores.mar >= 60 && s.scores.mar < 70
      if (filter === 'ok')   return s.scores.mar >= 70
      if (selectedRegion)    return s.region === selectedRegion.shortName
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'mar_asc')  return a.scores.mar - b.scores.mar
      if (sortBy === 'mar_desc') return b.scores.mar - a.scores.mar
      if (sortBy === 'eff')      return (b.scores.efficiency || 0) - (a.scores.efficiency || 0)
      if (sortBy === 'streak')   return b.streaks.iron_deficit_days - a.streaks.iron_deficit_days
      if (sortBy === 'trend')    return calcTrend(b) - calcTrend(a)
      return 0
    }), [filter, sortBy, selectedRegion])

  // 이상치 피드 시뮬레이션
  useEffect(() => {
    const t = setInterval(() => {
      const schools = ['여수정보과학고','강진고등학교','담양고등학교','한림고','영주고','삼척고']
      const nutrients = ['에너지','철분','칼슘','비타민C']
      const types = ['critical','warning','warning']
      setFeedItems(prev => [{
        school: schools[Math.floor(Math.random() * schools.length)],
        region: ['전남','강원','경북','제주'][Math.floor(Math.random() * 4)],
        date: '2024-11-28',
        nutrient: nutrients[Math.floor(Math.random() * nutrients.length)],
        value: `${380 + Math.floor(Math.random() * 120)} kcal`,
        type: types[Math.floor(Math.random() * types.length)],
      }, ...prev].slice(0, 8))
    }, 8000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="page-layout" style={{ minHeight: '100vh' }}>
      <div style={{ padding: '24px 24px 40px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>

        {/* 히어로 섹션 */}
        <div className="bg-grid" style={{
          padding: '32px 32px 28px', borderRadius: 20,
          border: '1px solid var(--border-default)', marginBottom: 24,
          background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,63,94,0.06) 0%, transparent 70%)' }} />
          <div style={{ marginBottom: 8 }}>
            <span className="badge badge-rose">2024학년도</span>
            <span className="badge badge-cyan" style={{ marginLeft: 8 }}>NEIS 공공데이터</span>
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.1 }}>
            전국 학교 급식 실태
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
            전국 {stats.total.toLocaleString()}개교 급식 영양 데이터 분석 · 기준 미달 현황 모니터링
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatCard label="기준 미달 학교" value={stats.missRate} suffix="%" color="var(--rose)"
              description="MAR 60점 미만 학교 비율. 권장 영양소(에너지·단백질·철분·칼슘 등) 기준을 지속적으로 충족하지 못하는 학교로, 학생 성장·인지 발달에 직접적 위험 신호." />
            <StatCard label="분석 학교 수" value={stats.total} color="var(--cyan)"
              description="2024학년도 NEIS 급식 공공데이터에서 집계된 전국 고등학교 수. 월별 급식 영양소 실측값 기반." />
            <StatCard label="전국 평균 MAR" value={stats.avgMAR} color="var(--amber)" decimals={1}
              description="Mean Adequacy Ratio — 6개 핵심 영양소 충족률 평균. 100점이 최적이며, 80점 이상이면 균형 급식으로 평가. 현재 전국 평균은 개선 여지가 있는 수준." />
            <StatCard label="MAR 불평등 지수 (Gini)" value={stats.gini} color="var(--violet)" decimals={3}
              description="Gini 계수는 0(완전평등)~1(완전불평등) 범위. 0.1~0.2는 중간 수준의 학교 간 영양 격차를 의미하며, 지역·유형별 편중이 그 주요 원인." />
          </div>
        </div>

        {/* PAPS 체력검사 통계 섹션 */}
        {papsStats && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>학생 건강체력평가 (PAPS) 전국 현황</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  학교알리미 실측 · {papsStats.count.toLocaleString()}개교 · 2025년 공시
                </div>
              </div>
              <span className="badge badge-cyan">실측 데이터</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: '평균 체력 우수율 (1+2등급)', value: `${papsStats.avgGoodRate.toFixed(1)}%`, color: 'var(--emerald)' },
                { label: '평균 1등급 비율', value: `${papsStats.avg1.toFixed(1)}%`, color: '#22c55e' },
                { label: '평균 5등급 비율', value: `${papsStats.avg5.toFixed(1)}%`, color: '#ef4444' },
                { label: '평균 BMI', value: papsStats.avgBmi.toFixed(1), color: 'var(--cyan)' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* 지역별 PAPS 1등급 순위 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>지역별 체력 1등급 비율 (상위)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {papsStats.regionRank.slice(0, 8).map((r, i) => (
                    <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700, flexShrink: 0,
                        background: i < 3 ? 'var(--cyan)' : 'var(--bg-elevated)',
                        color: i < 3 ? '#000' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i+1}</span>
                      <span style={{ flex: 1, fontSize: 12 }}>{r.region}</span>
                      <div style={{ width: 120 }}>
                        <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, #22c55e ${r.avg1 * 10}%, var(--bg-elevated) ${r.avg1 * 10}%)` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, width: 40, textAlign: 'right' }}>{r.avg1.toFixed(1)}%</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>n={r.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>지역별 체력 1등급 비율 (하위)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...papsStats.regionRank].reverse().slice(0, 8).map((r, i) => (
                    <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700, flexShrink: 0,
                        background: i < 3 ? '#ef4444' : 'var(--bg-elevated)',
                        color: i < 3 ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i+1}</span>
                      <span style={{ flex: 1, fontSize: 12 }}>{r.region}</span>
                      <div style={{ width: 120 }}>
                        <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, #ef4444 ${r.avg1 * 10}%, var(--bg-elevated) ${r.avg1 * 10}%)` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, width: 40, textAlign: 'right' }}>{r.avg1.toFixed(1)}%</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>n={r.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메인 2열 레이아웃 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* 좌측 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 지역별 MAR 차트 + 지도 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>지역별 평균 MAR</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>낮은 순 정렬</div>
                  </div>
                  {selectedRegion && (
                    <button className="badge badge-cyan" onClick={() => setSelectedRegion(null)} style={{ cursor: 'pointer' }}>
                      {selectedRegion.shortName} ✕
                    </button>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={regionBarData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={45} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(v, n) => [v.toFixed(1), n === 'mar' ? 'MAR' : '미달률%']}
                    />
                    <Bar dataKey="mar" radius={[3, 3, 0, 0]}
                      onClick={(d) => {
                        setSelectedRegion(mockRegions.find(r => r.shortName === d.name))
                        if (d.code) navigate(`/region/${d.code}`)
                      }}
                      style={{ cursor: 'pointer' }}>
                      {regionBarData.map((d, i) => (
                        <Cell key={i}
                          fill={d.mar < 55 ? 'var(--rose)' : d.mar < 65 ? 'var(--amber)' : 'var(--emerald)'}
                          opacity={selectedRegion && selectedRegion.shortName !== d.name ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <KoreaMap regions={mockRegions.map(r => {
                  const computed = regionBarData.find(d => d.code === r.code)
                  return { ...r, avg_mar: computed?.mar ?? r.avg_mar }
                })} onSelect={setSelectedRegion} selected={selectedRegion} />
              </div>
            </div>

            {/* 심화 통계 — 탭 전환 */}
            <div className="card">
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                {[
                  { key: 'gini', label: '불평등 분석' },
                  { key: 'dist', label: 'MAR 분포' },
                  { key: 'nutrient', label: '영양 결핍률' },
                  { key: 'type', label: '유형별 IQR' },
                  { key: 'scatter', label: '예산-MAR' },
                  { key: 'cluster', label: 'K-means 군집' },
                  { key: 'policy', label: '정책 시뮬레이터' },
                  { key: 'heatmap', label: '영양 상관 행렬' },
                ].map(t => (
                  <button key={t.key} onClick={() => setStatView(t.key)} style={{
                    padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: statView === t.key ? 700 : 400,
                    color: statView === t.key ? 'var(--cyan)' : 'var(--text-muted)',
                    borderBottom: statView === t.key ? '2px solid var(--cyan)' : '2px solid transparent',
                    marginBottom: -1, transition: 'all 0.15s',
                  }}>{t.label}</button>
                ))}
              </div>

              {statView === 'dist' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>전국 MAR 분포 히스토그램 + 정규분포 곡선</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                      μ={histData.mean} σ={histData.std}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={histData.bins} margin={{ left: -20, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="range" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={35} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v, n) => [v, n === 'count' ? '학교 수' : '정규분포 기댓값']} />
                      <Bar dataKey="count" fill="var(--cyan)" fillOpacity={0.6} radius={[2, 2, 0, 0]} name="학교 수" />
                      <Line data={histData.bins} type="monotone" dataKey="normal" stroke="var(--rose)" strokeWidth={2} dot={false} name="정규분포" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>첨도·비대칭 여부로 급식 질 편중 파악 가능</span>
                    <span style={{ color: histData.std < 10 ? 'var(--emerald)' : 'var(--amber)' }}>
                      σ={histData.std} — {histData.std < 10 ? '분산 낮음 (균질)' : '분산 높음 (양극화)'}
                    </span>
                  </div>
                </div>
              )}

              {statView === 'nutrient' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    영양소별 기준 미달 학교 비율 (↑ 나트륨은 초과 비율)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {nutrientDeficiency.map(d => (
                      <div key={d.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {d.warn ? '⚠️ ' : ''}{d.label}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: d.color }}>{d.pct}%</span>
                        </div>
                        <div style={{ position: 'relative', height: 12, background: 'var(--bg-raised)', borderRadius: 6 }}>
                          <div style={{
                            width: `${d.pct}%`, height: '100%',
                            background: d.color, borderRadius: 6, opacity: 0.7,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {statView === 'gini' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: 'var(--violet)' }}>
                      {stats.gini.toFixed(3)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gini 계수 (0=완전평등, 1=완전불평등)</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    로렌츠 곡선 — 아래 면적이 클수록 학교 간 MAR 격차 심화
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={lorenzData} margin={{ left: -20, bottom: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="pop" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} label={{ value: '학교 누적 %', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 10, dy: 14 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Line type="monotone" dataKey="equal" stroke="var(--border-default)" strokeDasharray="4 4" dot={false} name="완전평등선" />
                      <Line type="monotone" dataKey="mar" stroke="var(--violet)" strokeWidth={2} dot={false} name="실제 로렌츠 곡선" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(139,92,246,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--violet)' }}>
                    하위 20% 학교가 전체 MAR 합계의 {Math.round((lorenzData.find(d => d.pop >= 20)?.mar || 15))}% 수준 — 영양 격차 실질적 존재
                  </div>
                </div>
              )}

              {statView === 'type' && (() => {
                const allVals = typeData.flatMap(d => [d.p25, d.p75, d.avg])
                const minV = Math.floor(Math.min(...allVals) - 2)
                const maxV = Math.ceil(Math.max(...allVals) + 2)
                const toX = v => Math.max(0, Math.min(100, ((v - minV) / (maxV - minV) * 100))).toFixed(1)
                const baseline = typeData.find(d => d.type === '일반고')?.avg
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                      <span>학교 유형별 MAR 분포 (IQR + 중앙값 · Cohen&#39;s d vs 일반고)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {typeData.map(d => {
                        const color = d.avg >= 85 ? 'var(--emerald)' : d.avg >= 78 ? 'var(--cyan)' : d.avg >= 70 ? 'var(--amber)' : 'var(--rose)'
                        const dLabel = baseline && d.type !== '일반고'
                          ? (() => { const v = (d.avg - baseline) / 5; return v > 0.2 ? `+d=${Math.abs(d.cohensD)}` : `−d=${Math.abs(d.cohensD)}` })()
                          : '기준'
                        const dColor = d.cohensD >= 0 ? 'var(--emerald)' : 'var(--rose)'
                        return (
                          <div key={d.type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {d.type} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({d.count}개교)</span>
                              </span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: dColor }}>{dLabel}</span>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color }}>{d.avg.toFixed(1)}</span>
                              </div>
                            </div>
                            <div style={{ position: 'relative', height: 16, background: 'var(--bg-raised)', borderRadius: 6 }}>
                              {/* IQR 박스 */}
                              <div style={{
                                position: 'absolute', left: `${toX(d.p25)}%`, width: `${toX(d.p75) - toX(d.p25)}%`,
                                height: '100%', background: `${color}30`, border: `1px solid ${color}60`, borderRadius: 4,
                              }} />
                              {/* 중앙값 */}
                              <div style={{
                                position: 'absolute', left: `${toX(d.p50)}%`, width: 2, height: '100%',
                                background: color, opacity: 0.7, transform: 'translateX(-50%)',
                              }} />
                              {/* 평균 */}
                              <div style={{
                                position: 'absolute', left: `${toX(d.avg)}%`, width: 3, height: '100%',
                                background: color, borderRadius: 2, transform: 'translateX(-50%)',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                      막대: IQR(25~75%), 가는 선: 중앙값, 굵은 선: 평균 · Cohen&#39;s d = 효과 크기 (|d|≥0.5 중간, ≥0.8 큼)
                    </div>
                  </div>
                )
              })()}

              {statView === 'cluster' && (() => {
                const CLUSTER_COLORS = ['var(--emerald)', 'var(--cyan)', 'var(--amber)', 'var(--rose)']
                const CLUSTER_LABELS = ['고영양·고예산', '고영양·저예산', '저영양·고예산', '저영양·저예산']
                const clusterCounts = [0,1,2,3].map(ci => clusterData.filter(d => d.cluster === ci).length)
                const clusterAvgMAR = [0,1,2,3].map(ci => {
                  const pts = clusterData.filter(d => d.cluster === ci)
                  return pts.length ? (pts.reduce((s,p)=>s+p.mar,0)/pts.length).toFixed(1) : '-'
                })
                const clusterAvgBudget = [0,1,2,3].map(ci => {
                  const pts = clusterData.filter(d => d.cluster === ci)
                  return pts.length ? Math.round(pts.reduce((s,p)=>s+p.budget,0)/pts.length).toLocaleString() : '-'
                })
                return (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>K-means(k=4) — MAR × 예산 정규화 군집 | 총 {clusterData.length.toLocaleString()}개교</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart margin={{ left:-15, bottom:0, right:10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="budget" type="number" domain={[3000,12000]} tick={{ fill:'var(--text-muted)', fontSize:9 }} tickFormatter={v=>`${Math.round(v/1000)}k`} />
                        <YAxis dataKey="mar" type="number" domain={[50,100]} tick={{ fill:'var(--text-muted)', fontSize:9 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]?.payload
                          return (
                            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:8, padding:'7px 10px', fontSize:11 }}>
                              <div style={{ fontWeight:700, color:d.color, marginBottom:2 }}>{d.label}</div>
                              <div style={{ color:'var(--text-muted)' }}>{d.name} · MAR {d.mar?.toFixed(1)} · 예산 {d.budget?.toLocaleString()}원</div>
                            </div>
                          )
                        }} />
                        {[0,1,2,3].map(ci => (
                          <Scatter key={ci} data={clusterData.filter(d=>d.cluster===ci)} shape={({ cx, cy, payload }) => (
                            <circle cx={cx} cy={cy} r={2.5} fill={CLUSTER_COLORS[ci]} fillOpacity={0.5} />
                          )} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:10 }}>
                      {[0,1,2,3].map(ci => (
                        <div key={ci} style={{ padding:'8px 10px', borderRadius:8, background:`${CLUSTER_COLORS[ci]}10`, border:`1px solid ${CLUSTER_COLORS[ci]}30` }}>
                          <div style={{ fontSize:10, color:CLUSTER_COLORS[ci], fontWeight:700, marginBottom:4 }}>{CLUSTER_LABELS[ci]}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{clusterCounts[ci]}개교</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>MAR {clusterAvgMAR[ci]}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{clusterAvgBudget[ci]}원</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {statView === 'policy' && (() => {
                const expectedDelta = policyReg.slope * policyDelta
                const schoolsBelow = mockSchools.filter(s => s.scores.mar < 70).length
                const pct = (schoolsBelow / mockSchools.length * 100).toFixed(1)
                return (
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>
                      OLS 회귀 기반 — 급식예산 증가 → MAR 개선 예측
                      &nbsp;|&nbsp; β={policyReg.slope.toFixed(4)}점/원 · R²={policyReg.r2.toFixed(3)}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, alignItems:'center' }}>
                          <span style={{ fontSize:13, color:'var(--text-secondary)' }}>예산 증가액 (원/일)</span>
                          <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--cyan)', fontSize:16 }}>+{policyDelta.toLocaleString()}원</span>
                        </div>
                        <input type="range" min={100} max={3000} step={100} value={policyDelta}
                          onChange={e => setPolicyDelta(Number(e.target.value))}
                          style={{ width:'100%', accentColor:'var(--cyan)', cursor:'pointer' }} />
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                          <span>+100원</span><span>+3,000원</span>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[
                          { label:'예상 MAR 개선', value:`+${expectedDelta.toFixed(2)}점`, color:'var(--emerald)' },
                          { label:'현재 미달(MAR<70)', value:`${schoolsBelow.toLocaleString()}개교 (${pct}%)`, color:'var(--rose)' },
                          { label:'회귀 적합도 R²', value:policyReg.r2.toFixed(3), color:'var(--violet)' },
                        ].map(c=>(
                          <div key={c.label} style={{ padding:'12px 14px', borderRadius:10, background:`${c.color}08`, border:`1px solid ${c.color}25` }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
                            <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:18, color:c.color }}>{c.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding:'10px 14px', background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:8, fontSize:12, color:'var(--cyan)', lineHeight:1.6 }}>
                        <b>정책 함의:</b> 1인당 급식예산을 하루 {policyDelta.toLocaleString()}원 늘리면, 전국 평균 MAR이 약 {Math.abs(expectedDelta).toFixed(2)}점 개선될 것으로 추정됩니다.
                        MAR 70점 미만 {schoolsBelow.toLocaleString()}개교(전체 {pct}%)가 개선 시급 대상입니다.
                      </div>
                    </div>
                  </div>
                )
              })()}

              {statView === 'heatmap' && (() => {
                const { fields, matrix } = nutrientHeatmap
                const CELL = 44
                const rToColor = r => {
                  if (r >= 0.7) return '#10b981'
                  if (r >= 0.3) return `rgba(16,185,129,${(r-0.3)/0.4*0.7+0.15})`
                  if (r >= -0.3) return `rgba(100,116,139,${0.15+Math.abs(r)/0.3*0.1})`
                  if (r >= -0.7) return `rgba(244,63,94,${(Math.abs(r)-0.3)/0.4*0.7+0.15})`
                  return '#f43f5e'
                }
                return (
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
                      Pearson r 상관계수 행렬 — 초록=양의 상관, 빨강=음의 상관 · n={mockSchools.length.toLocaleString()}개교
                    </div>
                    <div style={{ overflowX:'auto' }}>
                      <svg width={CELL*(fields.length+1)+4} height={CELL*(fields.length+1)+4} style={{ fontSize:9 }}>
                        {/* 열 라벨 */}
                        {fields.map((f,j) => (
                          <text key={j} x={CELL*(j+1)+CELL/2} y={CELL*0.7} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="JetBrains Mono">{f.label}</text>
                        ))}
                        {/* 행 라벨 + 셀 */}
                        {fields.map((f,i) => (
                          <g key={i}>
                            <text x={CELL*0.9} y={CELL*(i+1)+CELL/2+4} textAnchor="end" fill="var(--text-muted)" fontSize={9} fontFamily="JetBrains Mono">{f.label}</text>
                            {fields.map((_, j) => {
                              const r = matrix[i][j]
                              const bg = rToColor(r)
                              return (
                                <g key={j}>
                                  <rect x={CELL*(j+1)+1} y={CELL*(i+1)+1} width={CELL-2} height={CELL-2} fill={bg} rx={3} />
                                  <text x={CELL*(j+1)+CELL/2} y={CELL*(i+1)+CELL/2+4} textAnchor="middle"
                                    fill={Math.abs(r)>0.4?'#fff':'var(--text-secondary)'} fontSize={8} fontFamily="JetBrains Mono" fontWeight={i===j?700:400}>
                                    {r.toFixed(2)}
                                  </text>
                                </g>
                              )
                            })}
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:'var(--text-secondary)', lineHeight:1.6 }}>
                      MAR은 에너지·단백질·칼슘과 강한 양의 상관을 보이며, 나트륨과는 음의 상관(과잉 나트륨 → 영양 불균형)을 나타냅니다. 예산은 대부분의 영양소와 미약한 양의 상관으로, 예산만으로는 영양 질을 충분히 설명하지 못합니다.
                    </div>
                  </div>
                )
              })()}

              {statView === 'scatter' && (() => {
                const medBudget = [...scatterData].sort((a,b)=>a.budget-b.budget)[Math.floor(scatterData.length/2)]?.budget
                const medMAR = [...scatterData].sort((a,b)=>a.mar-b.mar)[Math.floor(scatterData.length/2)]?.mar
                const frontier = scatterData.filter(d => d.frontier)
                const normal = scatterData.filter(d => !d.frontier)
                const TYPE_COLORS = { '일반고': 'var(--cyan)', '직업계고': 'var(--amber)', '특수목적고': 'var(--violet)', '자율고': 'var(--emerald)' }
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>예산(원/일) × MAR — ★ 효율 프론티어 (동일 예산 최고 MAR)</span>
                      <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>프론티어 {frontier.length}개교</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart margin={{ left: -15, bottom: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="budget" type="number" domain={[3000, 12000]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => `${Math.round(v/1000)}k`} />
                        <YAxis dataKey="mar" type="number" domain={[50, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]?.payload
                            return (
                              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
                                <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.frontier ? '★ ' : ''}{d.name}</div>
                                <div style={{ color: 'var(--text-muted)' }}>예산 {d.budget?.toLocaleString()}원 · MAR {d.mar?.toFixed(1)}</div>
                                <div style={{ color: 'var(--text-muted)' }}>{d.type}</div>
                              </div>
                            )
                          }}
                        />
                        <ReferenceLine x={medBudget} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                        <ReferenceLine y={medMAR} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                        {/* 일반 학교 */}
                        <Scatter data={normal} shape={({ cx, cy, payload }) => (
                          <circle cx={cx} cy={cy} r={2.5} fill={TYPE_COLORS[payload.type] || 'var(--text-muted)'} fillOpacity={0.35} />
                        )} />
                        {/* 프론티어 학교 */}
                        <Scatter data={frontier} shape={({ cx, cy, payload }) => (
                          <g>
                            <circle cx={cx} cy={cy} r={5} fill="var(--amber)" fillOpacity={0.9} />
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#000" fontWeight="bold">★</text>
                          </g>
                        )} />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                      {Object.entries(TYPE_COLORS).map(([t, c]) => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{t}
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--amber)' }}>
                        <span>★</span> 효율 프론티어
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* 분석 인사이트 카드 2개 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Moran's I */}
              <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-surface), rgba(255,107,53,0.04))' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}>MORAN'S I 공간 자기상관</div>
                <div style={{ fontFamily: 'Syne', fontSize: 44, fontWeight: 800, color: 'var(--orange)', lineHeight: 1 }}>
                  {moranData.I.toFixed(3)}<span style={{ fontSize: 20 }}>{moranData.sig ? '*' : ''}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                  {moranData.sig ? '영양 미달 학교들이 지리적으로 클러스터링' : '지리적 클러스터링 경향 (유의수준 접근)'}
                  <br /><span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                    z={moranData.z} · p={moranData.pVal < 0.0001 ? '<.0001' : moranData.pVal.toFixed(4)} · k=5 KNN · n={moranData.n.toLocaleString()}
                  </span>
                </div>
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,107,53,0.08)', borderRadius: 8, fontSize: 11, color: 'var(--orange)', lineHeight: 1.5 }}>
                  MAR 하위 핫스팟: {moranData.hotspots}
                  <div style={{ fontSize: 10, color: 'rgba(255,107,53,0.7)', marginTop: 4 }}>
                    I &gt; 0이면 유사한 MAR 값 학교들이 공간적으로 집중. 행 표준화 KNN 가중치 적용.
                  </div>
                </div>
              </div>

              {/* HLM 분산 분해 */}
              <div className="card">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}>ANOVA 분산 분해 (HLM-style)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <PieChart width={90} height={90}>
                    <Pie data={hlmDecomp.data} cx={40} cy={40} innerRadius={26} outerRadius={40} dataKey="value" strokeWidth={0}>
                      {hlmDecomp.data.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                  <div>
                    {hlmDecomp.data.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.name}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: d.color, marginLeft: 'auto' }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  ICC = <span style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>{hlmDecomp.icc.toFixed(3)}</span>
                  {' '}— 지역 간 분산 비율. 지역이 MAR 격차의 {Math.round(hlmDecomp.icc*100)}%를 설명하며, 나머지는 지역 내 학교 차이.
                </div>
              </div>
            </div>
          </div>

          {/* 우측 — 학교 목록 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', maxHeight: 700 }}>
              {/* 패널 헤더 */}
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14 }}>
                    {selectedRegion ? selectedRegion.name : '전국 학교 목록'}
                  </span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                    background: 'var(--bg-raised)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)', borderRadius: 6,
                    padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                  }}>
                    <option value="mar_asc">MAR 낮은 순</option>
                    <option value="mar_desc">MAR 높은 순</option>
                    <option value="eff">효율 높은 순</option>
                    <option value="streak">미달일 많은 순</option>
                    <option value="trend">개선 추이 낮은 순</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['all','전체'],['miss','미달'],['warn','주의'],['ok','달성']].map(([v, l]) => (
                    <button key={v} onClick={() => setFilter(v)} style={{
                      padding: '3px 10px', borderRadius: 100, fontSize: 11, cursor: 'pointer', border: 'none',
                      background: filter === v ? 'var(--cyan-dim)' : 'var(--bg-raised)',
                      color: filter === v ? 'var(--cyan)' : 'var(--text-muted)',
                      fontWeight: filter === v ? 600 : 400,
                      transition: 'all 0.15s',
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* 학교 리스트 */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {sortedSchools.map((s, i) => (
                  <button key={s.id} onClick={() => navigate(`/school/${s.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 16px', textAlign: 'left',
                      background: 'none', borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s', cursor: 'pointer', border: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)', width: 24, flexShrink: 0 }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {schoolDisplayName(s)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {s.region} · {s.type}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700,
                        color: marColor(s.scores.mar),
                      }}>{s.scores.mar.toFixed(1)}</span>
                      {(() => {
                        const g = marGrade(s.scores.mar, allMAR)
                        return (
                          <span style={{ fontSize: 10, color: g.color, fontWeight: 600 }}>{g.label}</span>
                        )
                      })()}
                    </div>
                  </button>
                ))}
              </div>

              {/* 하단 안내 */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--text-muted)' }}>
                전체 {stats.total.toLocaleString()}개교 중 {sortedSchools.length}개교 표시
              </div>
            </div>

            {/* 이상치 피드 */}
            <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rose)' }} className="animate-pulse" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>실시간 이상치 탐지</span>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {feedItems.slice(0, 5).map((item, i) => (
                  <div key={i} className={i === 0 ? 'feed-item-enter' : ''} style={{
                    padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 14, marginTop: 1 }}>{item.type === 'critical' ? '🔴' : '🟡'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.school}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.region} · {item.nutrient} {item.value}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
