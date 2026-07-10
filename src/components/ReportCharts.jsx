import { useMemo } from 'react'
import { mockSchools } from '../data/mockSchools.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'

const CHART_STYLE = {
  fontFamily: 'JetBrains Mono, monospace',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 14,
  padding: '24px',
}

const TITLE_STYLE = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 700,
  fontSize: 15,
  color: 'var(--text-primary)',
  marginBottom: 4,
}

const SUB_STYLE = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 20,
}

// ─────────────────────────────────────────────
// 1. MAR 분포 히스토그램
// ─────────────────────────────────────────────
export function MARDistributionChart() {
  const data = useMemo(() => {
    const bins = [
      { range: '55~60', min: 55, max: 60, count: 0, label: '위기', color: '#ef4444' },
      { range: '60~65', min: 60, max: 65, count: 0, label: '위기', color: '#f97316' },
      { range: '65~70', min: 65, max: 70, count: 0, label: '위기', color: '#f59e0b' },
      { range: '70~75', min: 70, max: 75, count: 0, label: '보통', color: '#84cc16' },
      { range: '75~80', min: 75, max: 80, count: 0, label: '보통', color: '#22c55e' },
      { range: '80~85', min: 80, max: 85, count: 0, label: '보통', color: '#10b981' },
      { range: '85~90', min: 85, max: 90, count: 0, label: '우수', color: '#06b6d4' },
      { range: '90~95', min: 90, max: 95, count: 0, label: '우수', color: '#00e5ff' },
      { range: '95+',   min: 95, max: 200, count: 0, label: '우수', color: '#a78bfa' },
    ]
    mockSchools.forEach(s => {
      if (s.region === '기타') return
      const mar = s.scores.mar
      const bin = bins.find(b => mar >= b.min && mar < b.max)
      if (bin) bin.count++
    })
    return bins
  }, [])

  const total = data.reduce((a, b) => a + b.count, 0)

  const CustomBar = (props) => {
    const { x, y, width, height, fill } = props
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} fillOpacity={0.85} />
        <rect x={x} y={y} width={width} height={4} fill={fill} rx={2} ry={2} />
      </g>
    )
  }

  return (
    <div style={CHART_STYLE}>
      <div style={TITLE_STYLE}>MAR 점수 분포</div>
      <div style={SUB_STYLE}>
        전국 {total.toLocaleString()}개교 · 영양위기(&lt;70) {data.slice(0,3).reduce((a,b)=>a+b.count,0)}교
        · 우수(≥85) {data.slice(6).reduce((a,b)=>a+b.count,0)}교
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 0 }} barCategoryGap="12%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-default)' }}
            label={{ value: 'MAR 점수 구간', position: 'insideBottom', offset: -14, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{ value: '학교 수', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, _, props) => [`${v}교 (${((v/total)*100).toFixed(1)}%)`, props.payload.label]}
            labelFormatter={(l) => `MAR ${l}점`}
          />
          <ReferenceLine x="70~75" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
          <ReferenceLine x="85~90" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
          <Bar dataKey="count" shape={<CustomBar />} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        {[
          { label: '영양 위기 (< 70)', color: '#f59e0b' },
          { label: '보통 (70~85)',      color: '#22c55e' },
          { label: '우수 (≥ 85)',       color: '#00e5ff' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 2. 예산-MAR 산점도 (r = 0.12)
// ─────────────────────────────────────────────
export function BudgetMARScatter() {
  const { points, trendLine, r, mean } = useMemo(() => {
    const valid = mockSchools.filter(s => s.region !== '기타' && s.budgetPerStudent && s.scores?.mar)

    const xs = valid.map(s => s.budgetPerStudent)
    const ys = valid.map(s => s.scores.mar)
    const n = xs.length
    const xMean = xs.reduce((a, b) => a + b, 0) / n
    const yMean = ys.reduce((a, b) => a + b, 0) / n

    let num = 0, dx2 = 0, dy2 = 0
    for (let i = 0; i < n; i++) {
      num  += (xs[i] - xMean) * (ys[i] - yMean)
      dx2  += (xs[i] - xMean) ** 2
      dy2  += (ys[i] - yMean) ** 2
    }
    const r = num / Math.sqrt(dx2 * dy2)
    const slope = num / dx2
    const intercept = yMean - slope * xMean

    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const trendLine = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ]

    const TIER_COLOR = (mar) =>
      mar < 70 ? '#ef4444' : mar < 78 ? '#f59e0b' : mar < 85 ? '#22c55e' : '#00e5ff'

    const points = valid.map(s => ({
      x: s.budgetPerStudent,
      y: s.scores.mar,
      name: s.shortName,
      color: TIER_COLOR(s.scores.mar),
    }))

    return { points, trendLine, r: r.toFixed(2), mean: yMean.toFixed(1) }
  }, [])

  return (
    <div style={CHART_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={TITLE_STYLE}>예산 vs 영양 적정도(MAR)</div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700,
          color: Math.abs(parseFloat(r)) < 0.3 ? 'var(--amber)' : 'var(--cyan)',
          background: 'var(--bg-raised)', padding: '4px 10px', borderRadius: 6,
          border: '1px solid var(--border-default)',
        }}>
          r = {r}
        </div>
      </div>
      <div style={SUB_STYLE}>
        각 점 = 학교 1개교 · 점선 = 추세선 · R² = {(parseFloat(r)**2 * 100).toFixed(1)}% (예산이 MAR 변동 설명)
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number" dataKey="x"
            domain={[3000, 7500]}
            tickFormatter={v => `${(v/1000).toFixed(1)}k`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            label={{ value: '1인당 급식비 (원/일)', position: 'insideBottom', offset: -16, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y"
            domain={[55, 98]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            label={{ value: 'MAR 점수', angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <ZAxis range={[18, 18]} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [name === 'x' ? `${v.toLocaleString()}원` : `${v}점`, name === 'x' ? '급식비' : 'MAR']}
          />
          <ReferenceLine y={parseFloat(mean)} stroke="rgba(0,229,255,0.25)" strokeDasharray="4 4"
            label={{ value: `전국 평균 ${mean}`, fill: 'rgba(0,229,255,0.6)', fontSize: 10, position: 'right' }}
          />
          <Scatter
            data={points}
            isAnimationActive={false}
            shape={(props) => {
              const { cx, cy } = props
              const d = props.payload
              return <circle cx={cx} cy={cy} r={4} fill={d.color} fillOpacity={0.55} stroke={d.color} strokeWidth={1} />
            }}
          />
          {/* 추세선 */}
          <Scatter
            data={trendLine}
            line={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1.5, strokeDasharray: '6 3' }}
            lineType="fitting"
            shape={() => null}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        {[
          { label: '위기 (MAR < 70)', color: '#ef4444' },
          { label: '보통 (70~78)',    color: '#f59e0b' },
          { label: '양호 (78~85)',    color: '#22c55e' },
          { label: '우수 (≥ 85)',     color: '#00e5ff' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 3. 영양소별 충족률 레이더 차트
// ─────────────────────────────────────────────
const RECOMMENDED = {
  energy:  650,   // kcal
  protein: 20,    // g
  iron:    3.5,   // mg
  calcium: 300,   // mg
  vitC:    25,    // mg
  sodium:  600,   // mg (상한, 낮을수록 좋음 → 반전)
  fiber:   6,     // g
}

const NUTRIENT_LABELS = {
  energy:  '에너지',
  protein: '단백질',
  iron:    '철분',
  calcium: '칼슘',
  vitC:    '비타민C',
  sodium:  '나트륨↓',
  fiber:   '식이섬유',
}

function calcNAR(nutrients) {
  return [
    { nutrient: NUTRIENT_LABELS.energy,  nar: Math.min(nutrients.energy_kcal / RECOMMENDED.energy * 100, 100) },
    { nutrient: NUTRIENT_LABELS.protein, nar: Math.min(nutrients.protein_g  / RECOMMENDED.protein * 100, 100) },
    { nutrient: NUTRIENT_LABELS.iron,    nar: Math.min(nutrients.iron_mg    / RECOMMENDED.iron    * 100, 100) },
    { nutrient: NUTRIENT_LABELS.calcium, nar: Math.min(nutrients.calcium_mg / RECOMMENDED.calcium * 100, 100) },
    { nutrient: NUTRIENT_LABELS.vitC,    nar: Math.min(nutrients.vitc_mg    / RECOMMENDED.vitC    * 100, 100) },
    { nutrient: NUTRIENT_LABELS.sodium,  nar: Math.min(RECOMMENDED.sodium   / nutrients.sodium_mg * 100, 100) },
    { nutrient: NUTRIENT_LABELS.fiber,   nar: Math.min(nutrients.fiber_g    / RECOMMENDED.fiber   * 100, 100) },
  ]
}

export function NutrientRadarChart({ schoolId }) {
  const { school, avg, marScore } = useMemo(() => {
    const valid = mockSchools.filter(s => s.region !== '기타' && s.nutrients)
    const target = schoolId
      ? valid.find(s => s.id === schoolId)
      : [...valid].sort((a, b) => a.scores.mar - b.scores.mar)[0]

    const avgNutrients = {
      energy_kcal: valid.reduce((a, s) => a + s.nutrients.energy_kcal, 0) / valid.length,
      protein_g:   valid.reduce((a, s) => a + s.nutrients.protein_g,   0) / valid.length,
      iron_mg:     valid.reduce((a, s) => a + s.nutrients.iron_mg,     0) / valid.length,
      calcium_mg:  valid.reduce((a, s) => a + s.nutrients.calcium_mg,  0) / valid.length,
      vitc_mg:     valid.reduce((a, s) => a + s.nutrients.vitc_mg,     0) / valid.length,
      sodium_mg:   valid.reduce((a, s) => a + s.nutrients.sodium_mg,   0) / valid.length,
      fiber_g:     valid.reduce((a, s) => a + s.nutrients.fiber_g,     0) / valid.length,
    }

    const schoolNAR = calcNAR(target.nutrients)
    const avgNAR    = calcNAR(avgNutrients)

    const merged = schoolNAR.map((d, i) => ({
      nutrient: d.nutrient,
      해당학교: parseFloat(d.nar.toFixed(1)),
      전국평균: parseFloat(avgNAR[i].nar.toFixed(1)),
    }))

    return { school: target, avg: merged, marScore: target.scores.mar }
  }, [schoolId])

  const isLowMAR = marScore < 75

  return (
    <div style={CHART_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={TITLE_STYLE}>영양소별 충족률 — {school.name}</div>
          <div style={SUB_STYLE}>
            MAR {marScore.toFixed(1)}점 · 권장 기준 100% 대비 · 나트륨은 낮을수록 좋음(반전)
          </div>
        </div>
        <div style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: 22,
          color: isLowMAR ? 'var(--rose)' : marScore >= 85 ? 'var(--cyan)' : 'var(--emerald)',
          background: 'var(--bg-raised)', padding: '6px 14px', borderRadius: 8,
          border: `1px solid ${isLowMAR ? 'rgba(244,63,94,0.3)' : 'var(--border-default)'}`,
          lineHeight: 1,
        }}>
          {marScore.toFixed(1)}
          <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>MAR</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={avg} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="nutrient"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90} domain={[0, 100]} tickCount={4}
            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
            tickFormatter={v => `${v}%`}
            stroke="rgba(255,255,255,0.05)"
          />
          <Radar
            name="전국평균" dataKey="전국평균"
            stroke="rgba(148,163,184,0.5)" fill="rgba(148,163,184,0.08)"
            strokeWidth={1} strokeDasharray="4 3"
            isAnimationActive={false}
          />
          <Radar
            name="해당학교" dataKey="해당학교"
            stroke={isLowMAR ? '#f43f5e' : '#00e5ff'}
            fill={isLowMAR ? 'rgba(244,63,94,0.15)' : 'rgba(0,229,255,0.12)'}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 3, fill: isLowMAR ? '#f43f5e' : '#00e5ff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
      {/* 수치 테이블 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 4 }}>
        {avg.map(d => {
          const low = d['해당학교'] < 70
          return (
            <div key={d.nutrient} style={{
              textAlign: 'center', padding: '8px 4px', borderRadius: 8,
              background: low ? 'rgba(244,63,94,0.08)' : 'var(--bg-raised)',
              border: `1px solid ${low ? 'rgba(244,63,94,0.25)' : 'var(--border-subtle)'}`,
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>{d.nutrient}</div>
              <div style={{
                fontFamily: 'Syne', fontWeight: 700, fontSize: 14,
                color: low ? 'var(--rose)' : 'var(--text-primary)',
              }}>{d['해당학교']}%</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>avg {d['전국평균']}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 4. 인과 구조 다이어그램 (개선판)
// ─────────────────────────────────────────────
export function CausalDiagram() {
  const nodes = [
    {
      id: 'income', label: '지역 재정자립도', sub: '세종 83% vs 전남 22%',
      color: '#f59e0b', x: 0, y: 0, width: 160,
    },
    {
      id: 'facility', label: '학교 시설 노후도', sub: '30년+ 노후 학교 23%',
      color: '#94a3b8', x: 0, y: 90, width: 160,
    },
    {
      id: 'supply', label: '식재료 공급망', sub: '도서벽지 조달비용 +18%',
      color: '#94a3b8', x: 0, y: 180, width: 160,
    },
    {
      id: 'teacher', label: '영양교사 배치', sub: '전국 38.4% 미배치',
      color: '#8b5cf6', x: 0, y: 270, width: 160,
    },
    {
      id: 'budget', label: '급식 예산/학생', sub: '3,919원 ~ 6,449원/일',
      color: '#f97316', x: 0, y: 360, width: 160,
    },
    {
      id: 'mar', label: 'MAR 영양 점수', sub: '58.2 ~ 96.1점 (37.9p 격차)',
      color: '#f43f5e', x: 240, y: 170, width: 180,
    },
    {
      id: 'outcome', label: '학생 건강·학업', sub: '성장 발달 / 학업 집중력',
      color: '#06b6d4', x: 500, y: 170, width: 170,
    },
  ]

  const edges = [
    { from: 'income',   to: 'mar',     strength: 'strong',  label: '' },
    { from: 'facility', to: 'mar',     strength: 'medium',  label: '' },
    { from: 'supply',   to: 'mar',     strength: 'medium',  label: '' },
    { from: 'teacher',  to: 'mar',     strength: 'medium',  label: 'd=0.19' },
    { from: 'budget',   to: 'mar',     strength: 'weak',    label: 'r=0.12' },
    { from: 'mar',      to: 'outcome', strength: 'strong',  label: '' },
  ]

  const getCenter = (node) => ({
    x: node.x + node.width / 2,
    y: node.y + 36,
  })

  const edgeColor = (s) =>
    s === 'strong' ? 'rgba(244,63,94,0.7)' :
    s === 'medium' ? 'rgba(148,163,184,0.5)' :
    'rgba(148,163,184,0.25)'

  const edgeDash = (s) =>
    s === 'weak' ? '6 4' : s === 'medium' ? '3 2' : 'none'

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <div style={{ ...CHART_STYLE, padding: '24px' }}>
      <div style={TITLE_STYLE}>영양 불평등 인과 구조</div>
      <div style={SUB_STYLE}>
        실선 굵기 = 연결 강도 · 점선 = 약한 상관 (r=0.12) · 화살표 방향 = 인과 흐름
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width="700" height="440" style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            {['strong','medium','weak'].map(s => (
              <marker key={s} id={`arrow-${s}`} markerWidth="8" markerHeight="8"
                refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={edgeColor(s)} />
              </marker>
            ))}
          </defs>

          {/* 엣지 */}
          {edges.map((e, i) => {
            const from = getCenter(nodeMap[e.from])
            const to   = getCenter(nodeMap[e.to])
            const fromRight = { x: nodeMap[e.from].x + nodeMap[e.from].width, y: from.y }
            const toLeft    = { x: nodeMap[e.to].x,   y: to.y }
            const mx = (fromRight.x + toLeft.x) / 2
            return (
              <g key={i}>
                <path
                  d={`M ${fromRight.x} ${fromRight.y} C ${mx} ${fromRight.y}, ${mx} ${toLeft.y}, ${toLeft.x} ${toLeft.y}`}
                  fill="none"
                  stroke={edgeColor(e.strength)}
                  strokeWidth={e.strength === 'strong' ? 2 : 1.5}
                  strokeDasharray={edgeDash(e.strength)}
                  markerEnd={`url(#arrow-${e.strength})`}
                />
                {e.label && (
                  <text
                    x={(fromRight.x + toLeft.x) / 2}
                    y={(fromRight.y + toLeft.y) / 2 - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--text-muted)"
                    fontFamily="JetBrains Mono"
                  >{e.label}</text>
                )}
              </g>
            )
          })}

          {/* 노드 */}
          {nodes.map(n => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width={n.width} height={72}
                rx={10} ry={10}
                fill={`${n.color}12`}
                stroke={`${n.color}50`}
                strokeWidth={1}
              />
              <rect width={n.width} height={3} rx={2} fill={n.color} fillOpacity={0.7} />
              <text x={n.width / 2} y={28} textAnchor="middle"
                fontSize={12} fontWeight={700} fill={n.color}
                fontFamily="Syne, sans-serif">{n.label}</text>
              <text x={n.width / 2} y={48} textAnchor="middle"
                fontSize={9} fill="rgba(148,163,184,0.8)"
                fontFamily="JetBrains Mono, monospace">{n.sub}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 전체 모아보기 (보고서 스크린샷용)
// ─────────────────────────────────────────────
export function ReportChartsPage() {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900, margin: '0 auto' }}>
      <MARDistributionChart />
      <BudgetMARScatter />
      <NutrientRadarChart />
      <CausalDiagram />
    </div>
  )
}
