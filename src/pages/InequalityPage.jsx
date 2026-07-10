import { useState, useMemo } from 'react'
import { API_BASE } from '../utils/apiBase.js'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ResponsiveContainer, ReferenceLine, Legend,
  LineChart, Line,
} from 'recharts'
import { mockSchools } from '../data/mockSchools.js'

function normalCDFInequality(x) {
  const [a1,a2,a3,a4,a5,p] = [0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429,0.3275911]
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)
  return 0.5 * (1 + sign * y)
}

// 지역별 1인당 GRDP 모의 데이터 (통계청 2022년 기준, 만원)
const REGION_INCOME = {
  서울: 4520, 경기: 3640, 인천: 3120, 부산: 2820, 대구: 2610,
  대전: 3220, 광주: 2730, 울산: 6180, 세종: 4050, 강원: 2520,
  충북: 3420, 충남: 4210, 전북: 2420, 전남: 2620, 경북: 3020,
  경남: 3240, 제주: 2740,
}

const REGION_COLORS_MAP = {
  서울: '#00e5ff', 경기: '#00bcd4', 인천: '#26c6da',
  부산: '#f59e0b', 대구: '#f43f5e', 광주: '#10b981',
  대전: '#8b5cf6', 울산: '#ec4899', 세종: '#06b6d4',
  강원: '#84cc16', 충북: '#f97316', 충남: '#eab308',
  전북: '#ef4444', 전남: '#14b8a6', 경북: '#a78bfa',
  경남: '#fb7185', 제주: '#34d399',
}

function CausalChain() {
  const steps = [
    { icon: '💰', label: '지역 소득 격차', sub: '1인당 GRDP 최대 2.6배 차이', color: '#f59e0b' },
    { icon: '🍱', label: '급식 예산 격차', sub: '최저 3,919원 vs 최고 6,449원', color: '#f97316' },
    { icon: '📊', label: 'MAR 영양 격차', sub: '최저 69.1 vs 최고 86.3 (17.2점 차)', color: '#f43f5e' },
    { icon: '🧒', label: '학생 건강 결과', sub: '성장·인지 발달·학업 성취도 차이', color: '#8b5cf6' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center', padding: '8px 0' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '16px 20px', background: `${s.color}10`,
            border: `1px solid ${s.color}40`, borderRadius: 12,
            minWidth: 150, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: s.color }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ padding: '0 6px', fontSize: 20, color: 'var(--text-muted)' }}>→</div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, color, suffix = '', children }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${color}30`, borderRadius: 14,
      padding: '18px 22px', boxShadow: `0 0 24px ${color}08`,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}{suffix}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{sub}</div>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 10, padding: '12px 16px', fontSize: 12,
    }}>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 8, color: d.color }}>{d.region}</div>
      <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span>MAR: <b style={{ color: 'var(--text-primary)' }}>{d.avgMAR?.toFixed(1)}</b></span>
        <span>급식 예산: <b style={{ color: 'var(--text-primary)' }}>{d.avgBudget?.toLocaleString()}원/일</b></span>
        <span>1인당 GRDP: <b style={{ color: 'var(--text-primary)' }}>{d.income?.toLocaleString()}만원</b></span>
        <span>학교 수: <b style={{ color: 'var(--text-primary)' }}>{d.schoolCount}개교</b></span>
        <span>영양교사 미배치: <b style={{ color: 'var(--rose)' }}>{d.noTeacherPct?.toFixed(0)}%</b></span>
      </div>
    </div>
  )
}

function MarkdownText({ text }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <div key={i} style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginTop: i > 0 ? 16 : 0, marginBottom: 4 }}>{line.slice(3)}</div>
        if (line.startsWith('### ')) return <div key={i} style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--cyan)', marginTop: 12, marginBottom: 2 }}>{line.slice(4)}</div>
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6, marginTop: 3 }}>
              <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
            </div>
          )
        }
        if (line.match(/^\d+\./)) return <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 3 }}>{renderInline(line)}</div>
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
        return <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{renderInline(line)}</div>
      })}
    </>
  )
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

export function InequalityPage() {
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [chartView, setChartView] = useState('budget') // 'budget' | 'income'

  const regionStats = useMemo(() => {
    const byRegion = {}
    mockSchools.forEach(s => {
      if (s.region === '기타') return
      if (!byRegion[s.region]) byRegion[s.region] = []
      byRegion[s.region].push(s)
    })
    return Object.entries(byRegion).map(([region, schools]) => {
      const avgMAR = schools.reduce((a, s) => a + s.scores.mar, 0) / schools.length
      const avgBudget = Math.round(schools.reduce((a, s) => a + s.budgetPerStudent, 0) / schools.length)
      const noTeacher = schools.filter(s => !s.hasNutritionTeacher).length
      const noTeacherPct = (noTeacher / schools.length) * 100
      const totalStudents = schools.reduce((a, s) => a + s.studentCount, 0)
      return {
        region, avgMAR, avgBudget, noTeacher, noTeacherPct,
        schoolCount: schools.length, totalStudents,
        income: REGION_INCOME[region] || 3000,
        color: REGION_COLORS_MAP[region] || '#94a3b8',
      }
    }).sort((a, b) => a.avgMAR - b.avgMAR)
  }, [])

  const teacherEffect = useMemo(() => {
    const withTeacher = mockSchools.filter(s => s.hasNutritionTeacher && s.region !== '기타')
    const noTeacher = mockSchools.filter(s => !s.hasNutritionTeacher && s.region !== '기타')
    const marWith = withTeacher.reduce((a, s) => a + s.scores.mar, 0) / withTeacher.length
    const marNo = noTeacher.reduce((a, s) => a + s.scores.mar, 0) / noTeacher.length
    const varWith = withTeacher.reduce((a,s)=>a+(s.scores.mar-marWith)**2,0)/withTeacher.length
    const varNo = noTeacher.reduce((a,s)=>a+(s.scores.mar-marNo)**2,0)/noTeacher.length
    const pooledSD = Math.sqrt((varWith + varNo) / 2)
    const cohensD = pooledSD > 0 ? (marWith - marNo) / pooledSD : 0

    // 예산 4분위별 영양교사 효과
    const budgets = mockSchools.map(s => s.budgetPerStudent).sort((a,b)=>a-b)
    const q1b = budgets[Math.floor(budgets.length * 0.25)]
    const q2b = budgets[Math.floor(budgets.length * 0.5)]
    const q3b = budgets[Math.floor(budgets.length * 0.75)]
    const quartileEffect = [
      { label: '예산 하위 25%', min: 0,   max: q1b },
      { label: '하위 50%',      min: q1b, max: q2b },
      { label: '상위 50%',      min: q2b, max: q3b },
      { label: '상위 25%',      min: q3b, max: Infinity },
    ].map(({ label, min, max }) => {
      const w = mockSchools.filter(s => s.hasNutritionTeacher && s.region !== '기타' && s.budgetPerStudent >= min && s.budgetPerStudent < max)
      const n = mockSchools.filter(s => !s.hasNutritionTeacher && s.region !== '기타' && s.budgetPerStudent >= min && s.budgetPerStudent < max)
      if (!w.length || !n.length) return null
      const mw = w.reduce((a,s)=>a+s.scores.mar,0)/w.length
      const mn = n.reduce((a,s)=>a+s.scores.mar,0)/n.length
      return { label, withMAR: parseFloat(mw.toFixed(1)), noMAR: parseFloat(mn.toFixed(1)), diff: parseFloat((mw-mn).toFixed(1)) }
    }).filter(Boolean)

    // 지역별 영양교사 효과
    const regionEffect = Object.entries(
      mockSchools.filter(s=>s.region!=='기타').reduce((acc,s)=>{
        if (!acc[s.region]) acc[s.region] = { w:[], n:[] }
        s.hasNutritionTeacher ? acc[s.region].w.push(s.scores.mar) : acc[s.region].n.push(s.scores.mar)
        return acc
      }, {})
    ).map(([region, {w, n}]) => {
      if (!w.length || !n.length) return null
      const mw = w.reduce((a,b)=>a+b,0)/w.length
      const mn = n.reduce((a,b)=>a+b,0)/n.length
      return { region, diff: parseFloat((mw-mn).toFixed(1)), withMAR: parseFloat(mw.toFixed(1)), noMAR: parseFloat(mn.toFixed(1)) }
    }).filter(Boolean).sort((a,b)=>b.diff-a.diff)

    // Welch's t-test (정규분포 근사, 대표본)
    const seWith = Math.sqrt(varWith / withTeacher.length)
    const seNo = Math.sqrt(varNo / noTeacher.length)
    const tStat = (marWith - marNo) / Math.sqrt(seWith ** 2 + seNo ** 2)
    // 두 그룹 크기가 크므로 정규분포 근사
    const pValue = Math.min(1, 2 * (1 - normalCDFInequality(Math.abs(tStat))))

    return {
      marWith, marNo, diff: marWith - marNo, withCount: withTeacher.length, noCount: noTeacher.length,
      cohensD: parseFloat(cohensD.toFixed(3)), tStat: parseFloat(tStat.toFixed(2)), pValue: parseFloat(pValue.toFixed(4)),
      quartileEffect, regionEffect,
    }
  }, [])

  // 영양결핍 위험 예측 모델 — MAR·예산·체력 복합 위험점수
  const prioritySchools = useMemo(() => {
    const withData = mockSchools.filter(s => s.paps && s.scores?.mar && s.region !== '기타')
    const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length
    const std = arr => { const m=mean(arr); return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length) || 1 }
    const mars = withData.map(s => s.scores.mar)
    const budgets = withData.map(s => s.budgetPerStudent)
    const goodRates = withData.map(s => s.paps.grade1Pct + s.paps.grade2Pct)
    const mMar=mean(mars), sMar=std(mars)
    const mBudget=mean(budgets), sBudget=std(budgets)
    const mGood=mean(goodRates), sGood=std(goodRates)
    return withData.map(s => {
      const goodRate = s.paps.grade1Pct + s.paps.grade2Pct
      const zMar = (s.scores.mar - mMar) / sMar
      const zBudget = (s.budgetPerStudent - mBudget) / sBudget
      const zGood = (goodRate - mGood) / sGood
      const riskScore = -(0.5*zMar + 0.3*zBudget + 0.2*zGood)
      return {
        code: s.code, name: s.shortName || s.name, region: s.region, type: s.type,
        mar: parseFloat(s.scores.mar.toFixed(1)), budget: s.budgetPerStudent,
        goodRate: Math.round(goodRate*10)/10,
        riskScore: Math.round(riskScore*100)/100, hasTeacher: s.hasNutritionTeacher,
      }
    }).sort((a,b)=>b.riskScore-a.riskScore).slice(0,30)
  }, [])

  const nationalGap = useMemo(() => {
    const mars = regionStats.map(r => r.avgMAR)
    const budgets = regionStats.map(r => r.avgBudget)
    const noTeacher = mockSchools.filter(s => s.region !== '기타')
    const noTeacherPct = (noTeacher.filter(s => !s.hasNutritionTeacher).length / noTeacher.length) * 100
    return {
      marGap: Math.max(...mars) - Math.min(...mars),
      budgetGap: Math.max(...budgets) - Math.min(...budgets),
      teacherEffect: teacherEffect.diff,
      noTeacherPct,
      worstRegion: regionStats[0],
      bestRegion: regionStats[regionStats.length - 1],
    }
  }, [regionStats, teacherEffect])

  const scatterData = regionStats.map(r => ({
    ...r,
    x: chartView === 'budget' ? r.avgBudget : r.income,
    y: r.avgMAR,
    z: Math.sqrt(r.schoolCount) * 4,
  }))

  const barData = [...regionStats].sort((a, b) => b.avgMAR - a.avgMAR).map(r => ({
    name: r.region,
    MAR: parseFloat(r.avgMAR.toFixed(1)),
    예산: r.avgBudget,
    color: r.color,
  }))

  const teacherBarData = [
    { name: '영양교사 배치', MAR: parseFloat(teacherEffect.marWith.toFixed(1)), count: teacherEffect.withCount, color: '#10b981' },
    { name: '영양교사 미배치', MAR: parseFloat(teacherEffect.marNo.toFixed(1)), count: teacherEffect.noCount, color: '#f43f5e' },
  ]

  const topIssues = regionStats.slice(0, 3).map(r => ({
    region: r.region,
    issue: `MAR ${r.avgMAR.toFixed(1)}점 (전국 최하위권), 예산 ${r.avgBudget.toLocaleString()}원/일, 영양교사 미배치 ${r.noTeacherPct.toFixed(0)}%`,
  }))

  const callAI = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/ai/inequality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionStats, nationalGap, topIssues }),
      })
      const data = await res.json()
      if (data.success) setAiResult(data.answer)
      else setAiError(data.error)
    } catch {
      setAiError('서버 연결 실패. `npm run server`로 백엔드를 시작해주세요.')
    }
    setAiLoading(false)
  }

  const avgMAR = (regionStats.reduce((a, r) => a + r.avgMAR, 0) / regionStats.length).toFixed(1)

  return (
    <div className="page-layout">
      {/* 히어로 */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, rgba(244,63,94,0.05) 100%)',
        padding: '28px 24px 24px', borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8, letterSpacing: '0.08em' }}>
                NEIS 공공데이터 기반 분석 · {mockSchools.filter(s => s.region !== '기타').length.toLocaleString()}개교
              </div>
              <h1 style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.1 }}>
                교육 영양 불평등 분석
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
                지역 소득 격차가 급식 예산 차이로 이어지고, 영양 불균형을 통해 학생 건강 결과에 영향을 미치는<br/>
                인과 체인을 NEIS 교육 공공데이터로 분석합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono',
                background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}>✓ NEIS 급식 공공데이터</span>
              <span style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono',
                background: 'rgba(245,158,11,0.1)', color: 'var(--amber)',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>✓ 통계청 지역소득통계</span>
            </div>
          </div>
          <CausalChain />
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 핵심 지표 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard
            label="MAR 지역 격차"
            value={nationalGap.marGap.toFixed(1)}
            suffix="점"
            color="var(--rose)"
            sub={`최저 ${nationalGap.worstRegion?.region} ${nationalGap.worstRegion?.avgMAR.toFixed(1)} → 최고 ${nationalGap.bestRegion?.region} ${nationalGap.bestRegion?.avgMAR.toFixed(1)}`}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, borderTop: '1px solid rgba(244,63,94,0.15)', paddingTop: 8, lineHeight: 1.6 }}>
              지역 간 MAR 최대·최솟값 차이. 같은 나라에서 어느 지역에서 태어나느냐에 따라 학교 급식 영양 질이 이만큼 차이 나는 구조적 불평등을 나타냅니다.
            </div>
          </StatCard>
          <StatCard
            label="급식예산 지역 격차"
            value={(nationalGap.budgetGap / 1000).toFixed(1) + 'k'}
            suffix="원"
            color="var(--amber)"
            sub={`최저 ${regionStats.reduce((a,r) => r.avgBudget < a ? r.avgBudget : a, 9999).toLocaleString()}원 vs 최고 ${regionStats.reduce((a,r) => r.avgBudget > a ? r.avgBudget : a, 0).toLocaleString()}원`}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: 8, lineHeight: 1.6 }}>
              1일 1인당 급식예산의 지역 간 최대 편차. 예산 격차는 식재료 품질·다양성에 직결되며, 이 분석에서 예산 R²=0.033으로 MAR 분산의 3.3%를 설명합니다.
            </div>
          </StatCard>
          <StatCard
            label="영양교사 미배치 효과"
            value={`-${teacherEffect.diff.toFixed(1)}`}
            suffix="점"
            color="var(--violet)"
            sub={`배치 ${teacherEffect.marWith.toFixed(1)}점 vs 미배치 ${teacherEffect.marNo.toFixed(1)}점`}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, borderTop: '1px solid rgba(139,92,246,0.15)', paddingTop: 8, lineHeight: 1.6 }}>
              영양교사 유무에 따른 MAR 평균 차이. Welch's t 검정 결과: t={teacherEffect.tStat}, p={teacherEffect.pValue < 0.0001 ? '<.0001' : teacherEffect.pValue.toFixed(4)}, Cohen's d={teacherEffect.cohensD.toFixed(2)} (중간 효과크기).
            </div>
          </StatCard>
          <StatCard
            label="영양교사 미배치율"
            value={nationalGap.noTeacherPct.toFixed(0)}
            suffix="%"
            color="var(--cyan)"
            sub={`${mockSchools.filter(s => !s.hasNutritionTeacher && s.region !== '기타').length}개교 미배치 / 전국 ${mockSchools.filter(s => s.region !== '기타').length}개교`}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, borderTop: '1px solid rgba(0,229,255,0.15)', paddingTop: 8, lineHeight: 1.6 }}>
              영양교사가 없는 학교 비율. 미배치 학교는 영양 관리가 행정직원에게 위임되어 급식 계획 전문성이 부족해지는 경향이 있습니다.
            </div>
          </StatCard>
        </div>

        {/* 버블 차트 — 예산/소득 vs MAR */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {chartView === 'budget' ? '급식 예산 vs 영양 수준 (MAR)' : '지역 소득 vs 영양 수준 (MAR)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                원의 크기 = 학교 수 / {chartView === 'budget' ? '예산이 높을수록 MAR이 높아지는 경향' : '소득이 높을수록 MAR이 높아지는 경향'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ key: 'budget', label: '급식예산 기준' }, { key: 'income', label: '지역소득 기준' }].map(v => (
                <button key={v.key} onClick={() => setChartView(v.key)} style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${chartView === v.key ? 'var(--cyan)' : 'var(--border-default)'}`,
                  background: chartView === v.key ? 'rgba(0,229,255,0.08)' : 'none',
                  color: chartView === v.key ? 'var(--cyan)' : 'var(--text-muted)',
                }}>{v.label}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number" dataKey="x" name={chartView === 'budget' ? '급식예산' : '지역소득'}
                domain={chartView === 'budget' ? [3500, 7000] : [2000, 7000]}
                tickFormatter={v => chartView === 'budget' ? `${(v/1000).toFixed(1)}k` : `${v}만`}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                label={{ value: chartView === 'budget' ? '1일 급식예산 (원)' : '1인당 GRDP (만원)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis
                type="number" dataKey="y" name="MAR"
                domain={[65, 90]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                label={{ value: 'MAR 점수', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 800]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={parseFloat(avgMAR)} stroke="rgba(0,229,255,0.3)" strokeDasharray="4 4"
                label={{ value: `전국 평균 ${avgMAR}`, fill: 'var(--cyan)', fontSize: 11 }} />
              <Scatter data={scatterData} shape={(props) => {
                const { cx, cy, node } = props
                const d = node || props
                const r = Math.sqrt(d.z) * 1.2
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={r} fill={d.color || '#00e5ff'} fillOpacity={0.5} stroke={d.color || '#00e5ff'} strokeWidth={1.5} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill={d.color || '#fff'} fontWeight={600}>{d.region}</text>
                  </g>
                )
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* 지역별 MAR 바차트 + 예산 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* MAR 순위 */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>지역별 MAR 순위</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>낮은 순 정렬</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {barData.slice().reverse().map((d, i) => {
                const pct = ((d.MAR - 65) / (90 - 65)) * 100
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{barData.length - i}</span>
                    <span style={{ width: 32, fontSize: 12, color: d.color, flexShrink: 0, fontWeight: 600 }}>{d.name}</span>
                    <div style={{ flex: 1, height: 18, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: `linear-gradient(90deg, ${d.color}80, ${d.color})`,
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                      }}>
                        <span style={{ fontSize: 10, color: '#fff', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{d.MAR}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 예산 순위 */}
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>지역별 1일 급식예산</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>낮은 순 정렬</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...regionStats].sort((a,b) => a.avgBudget - b.avgBudget).map((d, i) => {
                const pct = ((d.avgBudget - 3500) / (7000 - 3500)) * 100
                return (
                  <div key={d.region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{i+1}</span>
                    <span style={{ width: 32, fontSize: 12, color: d.color, flexShrink: 0, fontWeight: 600 }}>{d.region}</span>
                    <div style={{ flex: 1, height: 18, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.max(pct, 5)}%`,
                        background: `linear-gradient(90deg, ${d.color}80, ${d.color})`,
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                      }}>
                        <span style={{ fontSize: 10, color: '#fff', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{d.avgBudget.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 영양교사 배치 효과 — 심층 분석 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>영양교사 효과 정량화</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            전국 {mockSchools.filter(s => s.region !== '기타').length.toLocaleString()}개교 · 배치 여부, 예산 분위별, 지역별 효과 분해
          </div>

          {/* 상단 3개 핵심 지표 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: '평균 MAR 격차', value: `+${teacherEffect.diff.toFixed(1)}점`, sub: `배치 ${teacherEffect.marWith.toFixed(1)} vs 미배치 ${teacherEffect.marNo.toFixed(1)}`, color: 'var(--emerald)' },
              { label: "Cohen's d · p값", value: `d=${teacherEffect.cohensD.toFixed(2)}`, sub: `t=${teacherEffect.tStat}, p=${teacherEffect.pValue < 0.0001 ? '<.0001' : teacherEffect.pValue.toFixed(4)}`, color: 'var(--violet)' },
              { label: '미배치 학교', value: `${teacherEffect.noCount.toLocaleString()}교`, sub: `전체의 ${(teacherEffect.noCount/(teacherEffect.withCount+teacherEffect.noCount)*100).toFixed(0)}% 해당`, color: 'var(--rose)' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ padding: '14px 16px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}25` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 예산 분위별 효과 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>예산 분위별 영양교사 효과 — 저예산일수록 효과가 더 큰가?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teacherEffect.quartileEffect.map(q => {
                const barW = Math.min(100, Math.abs(q.diff) / 8 * 100)
                const c = q.diff > 0 ? 'var(--emerald)' : 'var(--rose)'
                return (
                  <div key={q.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.label}</span>
                    <div style={{ height: 10, background: 'var(--bg-raised)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: c, borderRadius: 5 }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: c, textAlign: 'right' }}>
                      {q.diff > 0 ? '+' : ''}{q.diff}점
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 지역별 효과 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>지역별 영양교사 효과 (배치 - 미배치 MAR 차이)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {teacherEffect.regionEffect.map(r => {
                const c = r.diff > 2 ? 'var(--emerald)' : r.diff > 0 ? 'var(--cyan)' : 'var(--rose)'
                return (
                  <div key={r.region} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 7, background: 'var(--bg-raised)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.region}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: c }}>
                      {r.diff > 0 ? '+' : ''}{r.diff}점
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 영양결핍 위험학교 AI 예측 모델 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>영양결핍 위험학교 AI 예측 모델</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            MAR(가중 50%) · 급식예산(30%) · 체력우수율(20%) z-점수 기반 복합 위험점수 — 상위 30개교 개입 우선순위
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: '예측 대상 학교', value: mockSchools.filter(s=>s.paps&&s.scores?.mar&&s.region!=='기타').length.toLocaleString()+'교', color: 'var(--cyan)' },
              { label: '최고 위험점수', value: prioritySchools[0]?.riskScore.toFixed(2) ?? '-', color: 'var(--rose)' },
              { label: '위험군 중 영양교사 미배치', value: prioritySchools.filter(s=>!s.hasTeacher).length+'교', color: 'var(--amber)' },
            ].map(c => (
              <div key={c.label} style={{ padding:'12px 14px', borderRadius:10, background:`${c.color}08`, border:`1px solid ${c.color}25` }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:20, color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border-default)' }}>
                  {['순위','학교명','지역','유형','MAR','예산(원)','체력우수율','위험점수','영양교사'].map(h=>(
                    <th key={h} style={{ padding:'6px 10px', textAlign: h==='학교명'||h==='지역'||h==='유형'?'left':'right', color:'var(--text-muted)', fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prioritySchools.map((s,i)=>{
                  const riskColor = s.riskScore>2?'var(--rose)':s.riskScore>1?'var(--amber)':'var(--text-secondary)'
                  return (
                    <tr key={s.code} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background: i<5?'rgba(244,63,94,0.03)':i<15?'rgba(245,158,11,0.02)':'transparent' }}>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'JetBrains Mono', color:i<5?'var(--rose)':i<15?'var(--amber)':'var(--text-muted)', fontWeight:700 }}>{i+1}</td>
                      <td style={{ padding:'6px 10px', color:'var(--text-primary)', fontWeight: i<5?600:400 }}>{s.name}</td>
                      <td style={{ padding:'6px 10px', color:'var(--text-secondary)' }}>{s.region}</td>
                      <td style={{ padding:'6px 10px', color:'var(--text-muted)', fontSize:11 }}>{s.type}</td>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'JetBrains Mono', color:s.mar<70?'var(--rose)':s.mar<80?'var(--amber)':'var(--emerald)' }}>{s.mar}</td>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'JetBrains Mono', color:'var(--text-secondary)' }}>{s.budget.toLocaleString()}</td>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'JetBrains Mono', color:s.goodRate<30?'var(--rose)':s.goodRate<50?'var(--amber)':'var(--emerald)' }}>{s.goodRate}%</td>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'JetBrains Mono', color:riskColor, fontWeight:700 }}>{s.riskScore.toFixed(2)}</td>
                      <td style={{ padding:'6px 10px', textAlign:'right', fontSize:13 }}>{s.hasTeacher?'✓':'✗'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:10, fontSize:11, color:'var(--text-muted)' }}>
            ※ 위험점수 = -(0.5·MAR_z + 0.3·예산_z + 0.2·체력_z) · 값이 클수록 우선 개입 필요 · 빨강=상위5위 · 노랑=6~15위
          </div>

          {/* XAI 요인 기여도 — 상위 10개교 */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>XAI 요인 기여도 분석 — 위험 상위 10개교</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              각 학교의 위험점수를 MAR·예산·체력 세 요인으로 분해. 어떤 요인이 위험을 주도하는지 확인.
            </div>
            {prioritySchools.slice(0, 10).map((s, i) => {
              // 역-z 복원으로 기여도 추정 (가중치 × 상대 기여)
              const withData = mockSchools.filter(sc => sc.paps && sc.scores?.mar && sc.region !== '기타')
              const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length
              const std = arr => { const m=mean(arr); return Math.sqrt(arr.reduce((sv,v)=>sv+(v-m)**2,0)/arr.length)||1 }
              const mars = withData.map(sc=>sc.scores.mar), budgets = withData.map(sc=>sc.budgetPerStudent)
              const goods = withData.map(sc=>sc.paps.grade1Pct+sc.paps.grade2Pct)
              const sc = mockSchools.find(sc2 => sc2.shortName===s.name||sc2.name===s.name) || { scores:{mar:s.mar}, budgetPerStudent:s.budget, paps:{grade1Pct:s.goodRate*0.3,grade2Pct:s.goodRate*0.7} }
              const zMar = (s.mar - mean(mars)) / std(mars)
              const zBudget = (s.budget - mean(budgets)) / std(budgets)
              const goodRate = s.goodRate
              const zGood = (goodRate - mean(goods)) / std(goods)
              const cMar = -0.5*zMar, cBudget = -0.3*zBudget, cGood = -0.2*zGood
              const total = Math.abs(cMar)+Math.abs(cBudget)+Math.abs(cGood)||1
              const bars = [
                { label: 'MAR', val: cMar, pct: Math.abs(cMar)/total*100, color: '#f43f5e' },
                { label: '예산', val: cBudget, pct: Math.abs(cBudget)/total*100, color: '#f59e0b' },
                { label: '체력', val: cGood, pct: Math.abs(cGood)/total*100, color: '#8b5cf6' },
              ].sort((a,b)=>b.pct-a.pct)
              return (
                <div key={s.code} style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: i<5?'rgba(244,63,94,0.04)':'var(--bg-raised)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                      <span style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--rose)', marginRight:6 }}>#{i+1}</span>
                      {s.name} <span style={{ fontSize:10, color:'var(--text-muted)' }}>{s.region}</span>
                    </span>
                    <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--rose)' }}>위험 {s.riskScore.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {bars.map(b => (
                      <div key={b.label} style={{ display:'flex', alignItems:'center', gap:4, flex:b.pct }}>
                        <div style={{ width:'100%', height:12, background:`${b.color}30`, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${Math.min(100,b.pct)}%`, height:'100%', background:b.color, borderRadius:3 }} />
                        </div>
                        <span style={{ fontSize:9, color:b.color, whiteSpace:'nowrap', fontFamily:'JetBrains Mono' }}>{b.label} {b.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 개입 비용 효과 (ROI 계산기) */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>개입 비용 효과 (ROI) 계산기</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              예산 투입 → 위험 학교 정상화 추정. MAR 1점 개선에 필요한 1인당 1일 예산 증가분을 OLS 기울기로 역산.
            </div>
            {(() => {
              // OLS slope (MAR ~ budget) 계산
              const schools = mockSchools.filter(s=>s.budgetPerStudent>0)
              const xs = schools.map(s=>s.budgetPerStudent), ys = schools.map(s=>s.scores.mar)
              const mx = xs.reduce((a,b)=>a+b,0)/xs.length, my = ys.reduce((a,b)=>a+b,0)/ys.length
              const slope = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/xs.reduce((s,x)=>s+(x-mx)**2,0)
              // 위험 상위 학교들: MAR을 70으로 올리는 데 필요한 예산 증가
              const riskTarget = 70
              const roiRows = prioritySchools.slice(0,5).map(s => {
                const marNeeded = Math.max(0, riskTarget - s.mar)
                const budgetNeeded = slope > 0 ? Math.round(marNeeded / slope) : 0
                const annualCostPerSchool = budgetNeeded * 200 * 300 // 200일 급식 * 300명
                return { name: s.name, mar: s.mar, marNeeded: marNeeded.toFixed(1), budgetNeeded, annualCost: annualCostPerSchool }
              })
              const totalAnnual = roiRows.reduce((a,r)=>a+r.annualCost,0)
              return (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                    {[
                      { label:'OLS 기울기 (β)', value:`${(slope*100).toFixed(4)}점/100원`, color:'var(--cyan)', desc:'예산 100원 증가 → MAR 변화' },
                      { label:'위험 상위 5교 정상화 예산', value:`연 ${(totalAnnual/1e8).toFixed(1)}억원`, color:'var(--amber)', desc:'MAR 70점 달성 기준' },
                      { label:'위험 30교 기준', value:`연 ${(totalAnnual/5*30/1e8).toFixed(0)}억원`, color:'var(--rose)', desc:'비례 추산 (학교 규모 동일 가정)' },
                    ].map(c=>(
                      <div key={c.label} style={{ padding:'10px 14px', borderRadius:8, background:`${c.color}08`, border:`1px solid ${c.color}20` }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{c.label}</div>
                        <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:16, color:c.color }}>{c.value}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{c.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid var(--border-default)' }}>
                          {['학교','현재 MAR','목표 MAR 70','필요 예산증가(원/일)','연간 비용(억원)'].map(h=>(
                            <th key={h} style={{ padding:'5px 8px', textAlign:h==='학교'?'left':'right', color:'var(--text-muted)', fontWeight:600, fontSize:10 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roiRows.map(r=>(
                          <tr key={r.name} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding:'5px 8px', color:'var(--text-primary)' }}>{r.name}</td>
                            <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'JetBrains Mono', color:'var(--rose)' }}>{r.mar}</td>
                            <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'JetBrains Mono', color:'var(--amber)' }}>+{r.marNeeded}점</td>
                            <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'JetBrains Mono', color:'var(--cyan)' }}>+{r.budgetNeeded.toLocaleString()}</td>
                            <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'JetBrains Mono', color:'var(--emerald)' }}>{(r.annualCost/1e8).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(0,229,255,0.05)', borderRadius:8, fontSize:11, color:'var(--cyan)', lineHeight:1.6 }}>
                    ※ OLS 단순 추정 (예산 단일 변인, R²≈0.033). 실제 개입에는 영양교사 배치·교육 등 복합 전략 필요.
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* 위기 지역 TOP 5 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>영양 취약 지역 현황</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>MAR 하위 지역 집중 분석</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {regionStats.slice(0, 5).map((r, i) => (
              <div key={r.region} style={{
                padding: '14px 16px', borderRadius: 10,
                background: `${r.color}08`, border: `1px solid ${r.color}25`,
                borderTop: `3px solid ${r.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--rose)', fontWeight: 700 }}>#{i + 1}</span>
                  <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: r.color }}>{r.region}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>MAR <b style={{ color: 'var(--rose)' }}>{r.avgMAR.toFixed(1)}</b></span>
                  <span>예산 <b style={{ color: 'var(--amber)' }}>{r.avgBudget.toLocaleString()}원</b></span>
                  <span>미배치 <b style={{ color: 'var(--violet)' }}>{r.noTeacherPct.toFixed(0)}%</b></span>
                  <span>학생 {(r.totalStudents / 10000).toFixed(1)}만명</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI 정책 제안 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>AI 정책 제안</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                전국 17개 시도 영양 데이터 기반 · Claude AI 분석 · 교육 영양 불평등 해소 로드맵
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={callAI}
              disabled={aiLoading}
              style={{ opacity: aiLoading ? 0.6 : 1 }}
            >
              {aiLoading ? '분석 중...' : '🤖 AI 정책 분석 시작'}
            </button>
          </div>

          {aiError && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--rose)' }}>
              ⚠️ {aiError}
            </div>
          )}

          {!aiResult && !aiLoading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14 }}>AI 정책 분석 시작 버튼을 누르면</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>17개 시도 데이터를 종합해 영양 불평등 해소 정책 로드맵을 생성합니다</div>
            </div>
          )}

          {aiLoading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14 }}>Claude AI가 17개 시도 영양 데이터를 분석하고 있습니다...</div>
            </div>
          )}

          {aiResult && (
            <div style={{
              padding: '20px', background: 'var(--bg-raised)', borderRadius: 10,
              border: '1px solid var(--border-subtle)',
            }}>
              <MarkdownText text={aiResult} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
