import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockSchools } from '../data/mockSchools.js'
import { mockRegions } from '../data/mockRegions.js'
import { schoolDisplayName } from '../utils/formatters.js'

// 전국 MAR 4분위 기준
const _sorted = [...mockSchools].map(s => s.scores.mar).sort((a, b) => a - b)
const _n = _sorted.length
const P25 = _sorted[Math.floor(_n * 0.25)]
const P75 = _sorted[Math.floor(_n * 0.75)]

function marColor(mar) {
  if (mar >= P75) return 'var(--emerald)'
  if (mar >= P25) return 'var(--amber)'
  return 'var(--rose)'
}
function marLabel(mar) {
  if (mar >= P75) return '상위권'
  if (mar >= P25) return '중위권'
  return '하위권'
}

export function CityView() {
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [sortBy, setSortBy]           = useState('mar_asc')
  const [filterRegion, setFilterRegion] = useState('all')
  const [expanded, setExpanded]       = useState(null) // 펼쳐진 시군구명

  const provinces = useMemo(() => [...new Set(mockSchools.map(s => s.region))].sort(), [])

  const cityStats = useMemo(() => {
    const map = {}
    mockSchools.forEach(s => {
      if (!map[s.city]) map[s.city] = { city: s.city, region: s.region, regionCode: s.regionCode, schools: [] }
      map[s.city].schools.push(s)
    })
    return Object.values(map).map(d => {
      const mars = d.schools.map(s => s.scores.mar)
      const avg  = parseFloat((mars.reduce((a, b) => a + b, 0) / mars.length).toFixed(1))
      const miss = mars.filter(v => v < 60).length
      const s2   = [...mars].sort((a, b) => a - b)
      return {
        ...d,
        avg,
        missCount: miss,
        missRate: Math.round(miss / mars.length * 100),
        count: mars.length,
        p25: s2[Math.floor(mars.length * 0.25)],
        p75: s2[Math.floor(mars.length * 0.75)],
      }
    })
  }, [])

  const filtered = useMemo(() => {
    let list = cityStats
    if (filterRegion !== 'all') list = list.filter(d => d.region === filterRegion)
    if (search.trim()) {
      const q = search.trim()
      list = list.filter(d => d.city.includes(q) || d.region.includes(q))
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'mar_asc')  return a.avg - b.avg
      if (sortBy === 'mar_desc') return b.avg - a.avg
      if (sortBy === 'miss')     return b.missRate - a.missRate
      if (sortBy === 'count')    return b.count - a.count
      return 0
    })
  }, [cityStats, filterRegion, search, sortBy])

  const toggle = (city) => setExpanded(prev => prev === city ? null : city)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 2 }}>
            REGION / CITY
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>시군구별 급식 현황</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            전국 {filtered.length}개 시군구 · 클릭하면 학교 목록 펼쳐짐
          </p>
        </div>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '7px 12px', flex: '1', maxWidth: 260,
          }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M15 15l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="시군구 검색..."
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }} />
            {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
          </div>

          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '7px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            <option value="all">전체 시도</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '7px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            <option value="mar_asc">MAR 낮은 순</option>
            <option value="mar_desc">MAR 높은 순</option>
            <option value="miss">미달률 높은 순</option>
            <option value="count">학교 수 많은 순</option>
          </select>
        </div>

        {/* 테이블 헤더 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 90px 60px 70px 70px 130px 24px',
          padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono', borderBottom: '1px solid var(--border-default)',
        }}>
          <span>시군구 / 시도</span>
          <span style={{ textAlign: 'right' }}>평균 MAR</span>
          <span style={{ textAlign: 'right' }}>학교 수</span>
          <span style={{ textAlign: 'right' }}>미달률</span>
          <span style={{ textAlign: 'center' }}>등급</span>
          <span style={{ paddingLeft: 12 }}>IQR 범위</span>
          <span />
        </div>

        {/* 리스트 */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          {filtered.map((d, i) => {
            const color = marColor(d.avg)
            const isOpen = expanded === d.city
            const citySchools = [...d.schools].sort((a, b) => a.scores.mar - b.scores.mar)

            return (
              <div key={d.city}>
                {/* 시군구 행 */}
                <button
                  onClick={() => toggle(d.city)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 60px 70px 70px 130px 24px',
                    width: '100%', padding: '12px 16px', background: isOpen ? 'rgba(0,229,255,0.04)' : 'none',
                    border: 'none', borderBottom: isOpen ? 'none' : '1px solid var(--border-subtle)',
                    borderLeft: isOpen ? '3px solid var(--cyan)' : '3px solid transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg-raised)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', width: 22, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.city}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{d.region}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color }}>{d.avg.toFixed(1)}</span>
                  </div>

                  <div style={{ textAlign: 'right', alignSelf: 'center', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {d.count}개
                  </div>

                  <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600,
                      color: d.missRate > 10 ? 'var(--rose)' : d.missRate > 5 ? 'var(--amber)' : 'var(--text-muted)' }}>
                      {d.missRate}%
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', alignSelf: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: color + '18', color, border: `1px solid ${color}40` }}>
                      {marLabel(d.avg)}
                    </span>
                  </div>

                  <div style={{ alignSelf: 'center', paddingLeft: 12 }}>
                    <div style={{ position: 'relative', height: 8, background: 'var(--bg-raised)', borderRadius: 4 }}>
                      {(() => {
                        const min = 40, max = 100
                        const left = ((d.p25 - min) / (max - min) * 100).toFixed(1)
                        const width = (((d.p75 - d.p25) / (max - min)) * 100).toFixed(1)
                        const mid = (((d.avg - min) / (max - min)) * 100).toFixed(1)
                        return (
                          <>
                            <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', background: `${color}40`, borderRadius: 4 }} />
                            <div style={{ position: 'absolute', left: `${mid}%`, width: 2, height: '100%', background: color, borderRadius: 1, transform: 'translateX(-50%)' }} />
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div style={{ alignSelf: 'center', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                    {isOpen ? '▲' : '▼'}
                  </div>
                </button>

                {/* 펼쳐진 학교 목록 */}
                {isOpen && (
                  <div style={{
                    background: 'rgba(0,229,255,0.02)',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderLeft: '3px solid var(--cyan)',
                  }}>
                    <div style={{ padding: '8px 16px 4px 56px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'flex', gap: 20 }}>
                      <span>{d.city} 소속 {citySchools.length}개교</span>
                      <span style={{ color: 'var(--cyan)', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/region/${d.regionCode}`) }}>
                        {d.region} 전체 보기 →
                      </span>
                    </div>
                    {citySchools.map(s => {
                      const c = marColor(s.scores.mar)
                      return (
                        <button key={s.id}
                          onClick={(e) => { e.stopPropagation(); navigate(`/school/${s.id}`) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '8px 16px 8px 56px',
                            background: 'none', border: 'none', borderTop: '1px solid var(--border-subtle)',
                            cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{schoolDisplayName(s)}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{s.type}</span>
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: c, flexShrink: 0 }}>
                            {s.scores.mar.toFixed(1)}
                          </span>
                          <span style={{ fontSize: 10, color: c, fontWeight: 600, width: 42, textAlign: 'right', flexShrink: 0 }}>
                            {marLabel(s.scores.mar)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4, flexShrink: 0 }}>→</span>
                        </button>
                      )
                    })}
                    <div style={{ height: 6 }} />
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>검색 결과 없음</div>
          )}
        </div>
      </div>
    </div>
  )
}
