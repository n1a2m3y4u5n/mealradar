import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, LineChart, Line, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import * as d3 from 'd3'
import { mockSchools } from '../data/mockSchools.js'
import { mockRegions } from '../data/mockRegions.js'
import { budgetHistory, treatmentGroup, controlGroup } from '../data/mockBudget.js'

function generateKMData() {
  const weeks = Array.from({ length: 19 }, (_, i) => i)
  const high = weeks.map(w => ({ week: w, surv: Math.max(0.05, 1 - Math.pow(w / 18, 1.8) * 0.9) }))
  const low = weeks.map(w => ({ week: w, surv: Math.max(0.02, 1 - Math.pow(w / 6, 1.2) * Math.min(1, w / 3)) }))
  return { high, low }
}

export function RegionDashboard() {
  const { regionCode } = useParams()
  const navigate = useNavigate()
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [filterGrade, setFilterGrade] = useState('all')
  const svgRef = useRef(null)

  const region = mockRegions.find(r => r.code === regionCode)
  const schools = mockSchools.filter(s => s.regionCode === regionCode)

  const filteredSchools = useMemo(() => {
    let list = [...schools].sort((a, b) => a.scores.mar - b.scores.mar)
    if (filterGrade === 'miss') return list.filter(s => s.scores.mar < 60)
    if (filterGrade === 'warn') return list.filter(s => s.scores.mar >= 60 && s.scores.mar < 75)
    if (filterGrade === 'ok') return list.filter(s => s.scores.mar >= 75)
    return list
  }, [schools, filterGrade])

  const avgMAR = schools.length
    ? parseFloat((schools.reduce((s, sch) => s + sch.scores.mar, 0) / schools.length).toFixed(1))
    : 0
  const missRate = schools.length
    ? Math.round((schools.filter(s => s.scores.mar < 60).length / schools.length) * 100)
    : 0

  const barData = filteredSchools.map(s => ({
    name: s.shortName,
    mar: parseFloat(s.scores.mar.toFixed(1)),
    school: s,
  }))

  const didData = useMemo(() => {
    const treatSet = new Set(treatmentGroup)
    const ctrlSet = new Set(controlGroup)
    const treatSchools = mockSchools.filter(s => treatSet.has(s.id))
    const ctrlSchools = mockSchools.filter(s => ctrlSet.has(s.id))

    return [2022, 2023, 2024].map(year => {
      const getAvgMAR = (schoolList) => {
        const base = schoolList.reduce((s, sch) => s + sch.scores.mar, 0) / Math.max(schoolList.length, 1)
        const offset = year === 2022 ? -8.4 : year === 2023 ? -2.1 : 0
        return parseFloat((base + offset).toFixed(1))
      }
      return {
        year: String(year),
        treatment: getAvgMAR(treatSchools),
        control: getAvgMAR(ctrlSchools),
      }
    })
  }, [])

  // D3 KM chart
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const margin = { top: 20, right: 30, bottom: 40, left: 50 }
    const W = (svgRef.current.clientWidth || 400) - margin.left - margin.right
    const H = 180
    const g = svg
      .attr('height', H + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const { high, low } = generateKMData()
    const x = d3.scaleLinear().domain([0, 18]).range([0, W])
    const y = d3.scaleLinear().domain([0, 1]).range([H, 0])

    g.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(9))
      .selectAll('text')
      .attr('fill', 'rgba(255,255,255,0.4)')
      .attr('font-size', 10)

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .selectAll('text')
      .attr('fill', 'rgba(255,255,255,0.4)')
      .attr('font-size', 10)

    // axis line colors
    g.selectAll('.domain').attr('stroke', 'rgba(255,255,255,0.2)')
    g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.2)')

    g.append('text')
      .attr('x', W / 2).attr('y', H + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.3)')
      .attr('font-size', 11)
      .text('학기 시작 후 경과 주')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -H / 2).attr('y', -38)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.3)')
      .attr('font-size', 11)
      .text('달성 유지 확률')

    const area = d3.area()
      .x(d => x(d.week))
      .y0(d => y(d.surv))
      .y1((d, i) => y(high[i].surv))
      .curve(d3.curveStepAfter)

    g.append('path')
      .datum(low)
      .attr('d', area)
      .attr('fill', 'rgba(244,63,94,0.08)')

    const line = d3.line().x(d => x(d.week)).y(d => y(d.surv)).curve(d3.curveStepAfter)

    g.append('path')
      .datum(high)
      .attr('d', line(high))
      .attr('fill', 'none')
      .attr('stroke', 'var(--emerald)')
      .attr('stroke-width', 2)

    g.append('path')
      .datum(low)
      .attr('d', line(low))
      .attr('fill', 'none')
      .attr('stroke', 'var(--rose)')
      .attr('stroke-width', 2)

    ;[{ data: high, color: 'var(--emerald)' }, { data: low, color: 'var(--rose)' }].forEach(({ data, color }) => {
      ;[4, 8, 12, 16].forEach(w => {
        const pt = data.find(d => d.week === w)
        if (!pt) return
        g.append('line')
          .attr('x1', x(w)).attr('y1', y(pt.surv) - 5)
          .attr('x2', x(w)).attr('y2', y(pt.surv) + 5)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
      })
    })
  }, [regionCode])

  const barColor = (mar) => mar < 60 ? 'var(--rose)' : mar < 75 ? 'var(--amber)' : 'var(--emerald)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', padding: '24px 24px 48px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* 브레드크럼 + 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/')}>전국</span>
            {' > '}{region?.name || regionCode}
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
            {region?.name || regionCode} 급식 분석
          </h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: '평균 MAR', value: `${avgMAR}점`, color: 'var(--cyan)' },
              { label: '미달 비율', value: `${missRate}%`, color: 'var(--rose)' },
              { label: '학교 수', value: `${schools.length}개교`, color: 'var(--amber)' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'var(--bg-surface)', border: `1px solid ${c.color}30`,
                borderRadius: 12, padding: '14px 20px', minWidth: 120,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>{c.label}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3패널 레이아웃 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedSchool ? '280px 1fr 300px' : '280px 1fr',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* 좌측 — 학교 목록 */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>학교 목록</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['all', '전체'], ['miss', '미달'], ['warn', '주의'], ['ok', '달성']].map(([v, l]) => (
                  <button key={v} onClick={() => setFilterGrade(v)} style={{
                    padding: '3px 10px', borderRadius: 100, fontSize: 11, cursor: 'pointer', border: 'none',
                    background: filterGrade === v ? 'rgba(0,229,255,0.15)' : 'var(--bg-raised)',
                    color: filterGrade === v ? 'var(--cyan)' : 'var(--text-muted)',
                    fontWeight: filterGrade === v ? 600 : 400,
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {filteredSchools.map((s, i) => (
                <button key={s.id}
                  onClick={() => setSelectedSchool(selectedSchool?.id === s.id ? null : s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px', textAlign: 'left',
                    background: selectedSchool?.id === s.id ? 'rgba(0,229,255,0.08)' : 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', border: 'none', borderLeft: selectedSchool?.id === s.id ? '3px solid var(--cyan)' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', width: 22, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.shortName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.type}</div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: barColor(s.scores.mar), flexShrink: 0 }}>
                    {s.scores.mar.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 중앙 — 차트 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 학교별 MAR 수평 막대 */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 20 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>학교별 MAR 순위</div>
              <ResponsiveContainer width="100%" height={Math.max(300, filteredSchools.length * 28)}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                    formatter={(v) => [`${v}점`, 'MAR']}
                  />
                  <ReferenceLine x={75} stroke="var(--cyan)" strokeDasharray="4 4" label={{ value: '기준', fill: 'var(--cyan)', fontSize: 10 }} />
                  <Bar dataKey="mar" radius={[0, 3, 3, 0]}
                    onClick={(data) => {
                      if (data && data.school) setSelectedSchool(selectedSchool?.id === data.school.id ? null : data.school)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {barData.map((d, i) => (
                      <Cell key={i} fill={barColor(d.mar)} opacity={selectedSchool && selectedSchool.id !== d.school.id ? 0.4 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* DiD 패널 */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 20 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>이중차분법 (DiD) 분석</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>예산 증가 학교(처치군) vs 유지 학교(통제군) MAR 변화</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ΔDiD 추정치</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: 'var(--cyan)' }}>+8.4점</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>95% CI [5.1, 11.7]</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>처치군</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: 'var(--emerald)' }}>{treatmentGroup.length}개교</div>
                </div>
                <div style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>통제군</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' }}>{controlGroup.length}개교</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={didData} margin={{ left: -10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }} formatter={(v) => [`${v}점`]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  <Line dataKey="treatment" name="처치군" stroke="var(--cyan)" strokeWidth={2} dot={{ fill: 'var(--cyan)', r: 4 }} />
                  <Line dataKey="control" name="통제군" stroke="rgba(148,163,184,0.6)" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: 'rgba(148,163,184,0.6)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Kaplan-Meier 패널 */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 20 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Kaplan-Meier 생존 분석</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>영양 기준 달성 유지 확률 — 예산 수준별</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 3, background: 'var(--emerald)', display: 'inline-block', borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>고예산 (≥5500원)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 3, background: 'var(--rose)', display: 'inline-block', borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>저예산 (&lt;4000원)</span>
                </div>
              </div>
              <svg ref={svgRef} width="100%" style={{ display: 'block' }} />
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>고예산 중앙생존시간</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: 'var(--emerald)' }}>14주</div>
                </div>
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>저예산 중앙생존시간</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: 'var(--rose)' }}>6주</div>
                </div>
                <div style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hazard Ratio</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>HR 3.2</div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 — 학교 프리뷰 패널 */}
          {selectedSchool && (
            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 20, animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {selectedSchool.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSchool.city}</div>
                  </div>
                  <button onClick={() => setSelectedSchool(null)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16,
                  }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11,
                    background: 'rgba(0,229,255,0.1)', color: 'var(--cyan)',
                    border: '1px solid rgba(0,229,255,0.3)',
                  }}>{selectedSchool.type}</span>
                  {selectedSchool.hasNutritionTeacher && (
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11,
                      background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}>영양교사 有</span>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 52, fontWeight: 800, color: barColor(selectedSchool.scores.mar), lineHeight: 1 }}>
                    {selectedSchool.scores.mar.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>MAR 점수</div>
                </div>

                {/* NAR 바 3개 */}
                {[
                  { label: '에너지', val: selectedSchool.nutrients.energy_kcal, std: 850, unit: 'kcal' },
                  { label: '철 분', val: selectedSchool.nutrients.iron_mg, std: 5, unit: 'mg' },
                  { label: '칼 슘', val: selectedSchool.nutrients.calcium_mg, std: 300, unit: 'mg' },
                ].map(n => {
                  const pct = Math.min(100, Math.round((n.val / n.std) * 100))
                  const c = pct < 60 ? 'var(--rose)' : pct < 80 ? 'var(--amber)' : 'var(--emerald)'
                  return (
                    <div key={n.label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{n.label}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: c, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}

                <button onClick={() => navigate(`/school/${selectedSchool.id}`)} style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--cyan)',
                  background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)', cursor: 'pointer',
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 13, marginTop: 8,
                }}>
                  상세 보기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
