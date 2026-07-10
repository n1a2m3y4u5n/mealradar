import { useRef, useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { mockSchools } from '../../data/mockSchools.js'
import { mockBudget } from '../../data/mockBudget.js'
import { linearRegression, pearsonCorr } from '../../utils/statistics.js'
import { fmtCurrency, marGrade } from '../../utils/formatters.js'

const REGION_COLORS = {
  '전남': '#10b981', '서울': '#00e5ff', '경기': '#a78bfa',
  '강원': '#f59e0b', '충남': '#f43f5e', '경북': '#fb923c',
  '제주': '#34d399', '부산': '#818cf8',
}

function ScatterPlot({ data, width = 580, height = 380 }) {
  const svgRef = useRef(null)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 30, bottom: 50, left: 60 }
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const xExt = d3.extent(data, d => d.budget)
    const yExt = d3.extent(data, d => d.mar)
    const padding = { x: (xExt[1] - xExt[0]) * 0.05, y: (yExt[1] - yExt[0]) * 0.05 }

    const x = d3.scaleLinear().domain([xExt[0] - padding.x, xExt[1] + padding.x]).range([0, w])
    const y = d3.scaleLinear().domain([yExt[0] - padding.y, yExt[1] + padding.y]).range([h, 0])
    const rScale = d3.scaleSqrt().domain(d3.extent(data, d => d.students)).range([5, 18])

    // Grid
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-w).tickFormat(''))
      .selectAll('line').attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-dasharray', '3,3')
    g.select('.grid .domain').remove()

    // Axes
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${(d/1000).toFixed(0)}천원`))
      .selectAll('text').attr('fill', 'rgba(255,255,255,0.4)').attr('font-size', 10)
    g.select('.domain').attr('stroke', 'rgba(255,255,255,0.1)')

    g.append('g')
      .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}`))
      .selectAll('text').attr('fill', 'rgba(255,255,255,0.4)').attr('font-size', 10)

    // Axis labels
    g.append('text').attr('x', w/2).attr('y', h + 40).attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.3)').attr('font-size', 11).text('1인당 급식비 (원/일)')
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -h/2).attr('y', -44)
      .attr('text-anchor', 'middle').attr('fill', 'rgba(255,255,255,0.3)').attr('font-size', 11).text('평균 MAR')

    // Regression line
    const reg = linearRegression(data.map(d => d.budget), data.map(d => d.mar))
    const x0 = xExt[0] - padding.x, x1 = xExt[1] + padding.x
    g.append('line')
      .attr('x1', x(x0)).attr('y1', y(reg.slope * x0 + reg.intercept))
      .attr('x2', x(x1)).attr('y2', y(reg.slope * x1 + reg.intercept))
      .attr('stroke', 'rgba(0,229,255,0.4)').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')

    // Quadrant lines (median)
    const medX = d3.median(data, d => d.budget)
    const medY = d3.median(data, d => d.mar)
    g.append('line').attr('x1', x(medX)).attr('y1', 0).attr('x2', x(medX)).attr('y2', h)
      .attr('stroke', 'rgba(255,255,255,0.07)').attr('stroke-dasharray', '4,4')
    g.append('line').attr('x1', 0).attr('y1', y(medY)).attr('x2', w).attr('y2', y(medY))
      .attr('stroke', 'rgba(255,255,255,0.07)').attr('stroke-dasharray', '4,4')

    // Bubbles
    const circles = g.selectAll('.bubble').data(data).enter()
      .append('circle').attr('class', 'bubble')
      .attr('cx', d => x(d.budget))
      .attr('cy', d => y(d.mar))
      .attr('r', d => rScale(d.students))
      .attr('fill', d => `${REGION_COLORS[d.region] || '#aaa'}99`)
      .attr('stroke', d => REGION_COLORS[d.region] || '#aaa')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', d => `${REGION_COLORS[d.region] || '#aaa'}dd`)
          .attr('stroke-width', 2.5)
        setHovered({ x: event.offsetX, y: event.offsetY, data: d })
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('fill', d => `${REGION_COLORS[d.region] || '#aaa'}99`)
          .attr('stroke-width', 1.5)
        setHovered(null)
      })

  }, [data, width, height])

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} width={width} height={height} />
      {hovered && (
        <div style={{
          position: 'absolute', left: hovered.x + 12, top: hovered.y - 10,
          background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          borderRadius: 8, padding: '10px 12px', fontSize: 12, pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 10, minWidth: 160,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{hovered.data.name}</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{hovered.data.region} · {hovered.data.students.toLocaleString()}명</div>
          <div style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>급식비 {hovered.data.budget.toLocaleString()}원</div>
          <div style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>MAR {hovered.data.mar.toFixed(1)}</div>
          <div style={{ color: 'var(--emerald)', fontFamily: 'JetBrains Mono' }}>효율 {hovered.data.efficiency.toFixed(2)}</div>
        </div>
      )}
    </div>
  )
}

export function CostEfficiency() {
  const [sortBy, setSortBy] = useState('efficiency')
  const [filterRegion, setFilterRegion] = useState('전체')

  const regions = ['전체', ...Object.keys(REGION_COLORS)]

  const data = useMemo(() => mockSchools.map(s => {
    const b = mockBudget.find(bd => bd.id === s.id)
    return {
      id: s.id, name: s.shortName || s.name, region: s.region,
      budget: s.budgetPerStudent, mar: s.scores.mar,
      students: s.studentCount, efficiency: s.scores.efficiency || 0,
      hasTeacher: s.hasNutritionTeacher,
    }
  }), [])

  const filtered = useMemo(() =>
    filterRegion === '전체' ? data : data.filter(d => d.region === filterRegion)
  , [data, filterRegion])

  const corr = useMemo(() => pearsonCorr(data.map(d => d.budget), data.map(d => d.mar)), [data])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'efficiency') return b.efficiency - a.efficiency
    if (sortBy === 'mar') return b.mar - a.mar
    if (sortBy === 'budget') return b.budget - a.budget
    return 0
  }), [filtered, sortBy])

  const top5    = [...data].sort((a, b) => b.efficiency - a.efficiency).slice(0, 5)
  const bottom5 = [...data].sort((a, b) => a.efficiency - b.efficiency).slice(0, 5)

  const avgBudget = Math.round(data.reduce((s, d) => s + d.budget, 0) / data.length)
  const avgMAR    = (data.reduce((s, d) => s + d.mar, 0) / data.length).toFixed(1)
  const avgEff    = (data.reduce((s, d) => s + d.efficiency, 0) / data.length).toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 요약 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: '전국 평균 급식비', value: `${avgBudget.toLocaleString()}원`, sub: '1인 1일 기준', color: 'var(--amber)' },
          { label: '전국 평균 MAR',   value: avgMAR,    sub: '영양 적정성 지수',   color: 'var(--cyan)'   },
          { label: '평균 효율 지수',  value: avgEff,    sub: 'MAR ÷ 급식비 지수', color: 'var(--emerald)'},
          { label: '급식비↔MAR 상관', value: corr.toFixed(3), sub: 'Pearson r',   color: corr > 0.3 ? 'var(--emerald)' : 'var(--rose)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 산점도 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>급식비 vs MAR 산점도</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              버블 크기 = 학생 수 · 점선 = 회귀선 · r = {corr.toFixed(3)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {region}
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <ScatterPlot data={filtered} />
        </div>
      </div>

      {/* TOP/BOTTOM 5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--emerald)' }}>
            🏆 효율 TOP 5
          </div>
          {top5.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 800, color: 'var(--emerald)', width: 24 }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.region} · {s.budget.toLocaleString()}원</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--emerald)' }}>
                  {s.efficiency.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MAR {s.mar.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--rose)' }}>
            ⚠️ 효율 하위 5
          </div>
          {bottom5.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 800, color: 'var(--rose)', width: 24 }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.region} · {s.budget.toLocaleString()}원</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--rose)' }}>
                  {s.efficiency.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MAR {s.mar.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전체 학교 테이블 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>전체 학교 효율 분석 ({filtered.length}개교)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
              <option value="efficiency">효율 순</option>
              <option value="mar">MAR 순</option>
              <option value="budget">급식비 순</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['학교명', '지역', '급식비', 'MAR', '효율 지수', '효율 바', '영양교사'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const maxEff = Math.max(...sorted.map(d => d.efficiency))
                const effPct = (s.efficiency / maxEff) * 100
                const effColor = s.efficiency > avgEff * 1.1 ? 'var(--emerald)' : s.efficiency < avgEff * 0.9 ? 'var(--rose)' : 'var(--amber)'
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, background: `${REGION_COLORS[s.region] || '#aaa'}20`, color: REGION_COLORS[s.region] || 'var(--text-muted)', border: `1px solid ${REGION_COLORS[s.region] || '#aaa'}40` }}>{s.region}</span>
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono', color: 'var(--amber)' }}>{s.budget.toLocaleString()}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono', color: 'var(--cyan)' }}>{s.mar.toFixed(1)}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono', fontWeight: 700, color: effColor }}>{s.efficiency.toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', minWidth: 100 }}>
                      <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${effPct}%`, height: '100%', background: effColor, borderRadius: 3 }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ fontSize: 12, color: s.hasTeacher ? 'var(--emerald)' : 'var(--rose)' }}>
                        {s.hasTeacher ? '✓ 배치' : '✗ 미배치'}
                      </span>
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
