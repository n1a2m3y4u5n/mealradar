import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SchoolMap } from '../components/map/SchoolMap.jsx'
import { mockSchools } from '../data/mockSchools.js'
import { mockRegions } from '../data/mockRegions.js'
import { marColor } from '../utils/nutrition.js'
import { schoolDisplayName } from '../utils/formatters.js'

// 전국 분포 기반 4분위 기준
const _sorted = [...mockSchools].map(s => s.scores.mar).sort((a, b) => a - b)
const _n = _sorted.length
const P25 = _sorted[Math.floor(_n * 0.25)]
const P50 = _sorted[Math.floor(_n * 0.50)]
const P75 = _sorted[Math.floor(_n * 0.75)]

function marToHex(mar) {
  if (mar >= P75) return '#10b981'  // 상위 25%
  if (mar >= P50) return '#00e5ff'  // 상위 50%
  if (mar >= P25) return '#f59e0b'  // 하위 50%
  return '#f43f5e'                  // 하위 25%
}

function MARGaugeMini({ mar, size = 80 }) {
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  const offset = circ - (mar / 100) * circ
  const color = marToHex(mar)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.2} fontFamily="Syne" fontWeight="800"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {mar.toFixed(1)}
      </text>
    </svg>
  )
}

export function MapView() {
  const navigate = useNavigate()
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [viewMode, setViewMode] = useState('schools')
  const [filterRegion, setFilterRegion] = useState('all')
  const [filterGrade, setFilterGrade] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const regions = useMemo(() => {
    const unique = [...new Set(mockSchools.map(s => s.region))]
    return unique.sort()
  }, [])

  const filteredSchools = useMemo(() => {
    let list = mockSchools
    if (filterRegion !== 'all') list = list.filter(s => s.region === filterRegion)
    if (filterGrade === 'miss') list = list.filter(s => s.scores.mar < P25)
    if (filterGrade === 'warn') list = list.filter(s => s.scores.mar >= P25 && s.scores.mar < P50)
    if (filterGrade === 'ok')   list = list.filter(s => s.scores.mar >= P50 && s.scores.mar < P75)
    if (filterGrade === 'good') list = list.filter(s => s.scores.mar >= P75)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.name.includes(searchQuery) || s.shortName.includes(searchQuery) ||
        s.city.includes(searchQuery) || s.region.includes(searchQuery)
      )
    }
    return list.sort((a, b) => a.scores.mar - b.scores.mar)
  }, [filterRegion, filterGrade, searchQuery])

  const handleSelectSchool = (school) => {
    setSelectedSchool(school)
  }

  return (
    <div style={{ height: 'calc(100vh - 52px)', position: 'relative', display: 'flex', overflow: 'hidden' }}>

      {/* 좌측 패널 — 학교 목록 */}
      <div style={{
        width: 300, height: '100%', flexShrink: 0,
        background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(8px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', zIndex: 500,
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, marginBottom: 10, color: '#e2e8f0' }}>
            학교 지도
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              {filteredSchools.length}개교
            </span>
          </div>

          {/* 검색 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 10px', marginBottom: 10,
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="학교명 검색..."
              style={{
                background: 'none', border: 'none', outline: 'none', fontSize: 12,
                color: '#e2e8f0', width: '100%',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
            )}
          </div>

          {/* MAR 등급 필터 */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {[['all', '전체'], ['miss', `하위25%`], ['warn', `하위50%`], ['ok', `상위50%`], ['good', `상위25%`]].map(([v, l]) => (
              <button key={v} onClick={() => setFilterGrade(v)} style={{
                padding: '3px 8px', borderRadius: 100, fontSize: 10, cursor: 'pointer', border: 'none',
                background: filterGrade === v ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: filterGrade === v ? 'var(--cyan)' : 'var(--text-muted)',
                fontWeight: filterGrade === v ? 600 : 400,
              }}>{l}</button>
            ))}
          </div>

          {/* 지역 필터 */}
          <select
            value={filterRegion}
            onChange={e => setFilterRegion(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer',
            }}
          >
            <option value="all">전체 지역</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 뷰 모드 토글 */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
          {[['schools', '🏫 학교'], ['regions', '🗺 지역']].map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none',
              background: viewMode === v ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: viewMode === v ? 'var(--cyan)' : 'var(--text-muted)',
              fontWeight: viewMode === v ? 600 : 400,
            }}>{l}</button>
          ))}
        </div>

        {/* 학교 리스트 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredSchools.map((s, i) => {
            const color = marToHex(s.scores.mar)
            const isSelected = selectedSchool?.id === s.id
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSchool(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: isSelected ? 'rgba(0,229,255,0.06)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', border: 'none',
                  borderLeft: isSelected ? '3px solid var(--cyan)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'none' }}
              >
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--text-muted)', width: 20, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {schoolDisplayName(s)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.region} · {s.type}</div>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                  {s.scores.mar.toFixed(1)}
                </span>
              </button>
            )
          })}
          {filteredSchools.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              검색 결과 없음
            </div>
          )}
        </div>
      </div>

      {/* 지도 영역 */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <SchoolMap
          schools={filteredSchools}
          onSelectSchool={handleSelectSchool}
          viewMode={viewMode}
        />
      </div>

      {/* 우측 슬라이드인 패널 — 선택된 학교 상세 미리보기 */}
      <div style={{
        position: 'absolute', right: 0, top: 0, width: 320, height: '100%', zIndex: 600,
        background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        transform: selectedSchool ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {selectedSchool && (
          <>
            {/* 닫기 버튼 */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>학교 미리보기</span>
              <button onClick={() => setSelectedSchool(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16,
              }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* 학교명 + MAR 게이지 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <MARGaugeMini mar={selectedSchool.scores.mar} size={80} />
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.3 }}>
                    {selectedSchool.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedSchool.region} · {selectedSchool.city}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selectedSchool.type} · {selectedSchool.studentCount.toLocaleString()}명</div>
                </div>
              </div>

              {/* 태그 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(0,229,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.25)' }}>
                  예산 {selectedSchool.budgetPerStudent.toLocaleString()}원
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10,
                  background: selectedSchool.hasNutritionTeacher ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                  color: selectedSchool.hasNutritionTeacher ? 'var(--emerald)' : 'var(--rose)',
                  border: `1px solid ${selectedSchool.hasNutritionTeacher ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
                }}>
                  영양교사 {selectedSchool.hasNutritionTeacher ? '有' : '無'}
                </span>
              </div>

              {/* NAR 바 3개 */}
              {[
                { label: '에너지', val: selectedSchool.nutrients.energy_kcal, std: 850, unit: 'kcal' },
                { label: '철 분', val: selectedSchool.nutrients.iron_mg, std: 5, unit: 'mg' },
                { label: '칼 슘', val: selectedSchool.nutrients.calcium_mg, std: 300, unit: 'mg' },
              ].map(n => {
                const pct = Math.min(100, Math.round((n.val / n.std) * 100))
                const colorHex = pct < 60 ? '#f43f5e' : pct < 80 ? '#f59e0b' : '#10b981'
                const colorVar = pct < 60 ? 'var(--rose)' : pct < 80 ? 'var(--amber)' : 'var(--emerald)'
                return (
                  <div key={n.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{n.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', color: colorVar, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: `linear-gradient(90deg, ${colorHex}80, ${colorHex})`,
                      }} />
                    </div>
                  </div>
                )
              })}

              {/* 전국 순위 */}
              {(() => {
                const allSorted = [...mockSchools].sort((a, b) => a.scores.mar - b.scores.mar)
                const rank = allSorted.findIndex(s => s.id === selectedSchool.id) + 1
                const pct = Math.round((rank / allSorted.length) * 100)
                return (
                  <div style={{
                    padding: '10px 12px', background: 'rgba(0,229,255,0.06)',
                    border: '1px solid rgba(0,229,255,0.15)', borderRadius: 8, fontSize: 12,
                    color: 'var(--text-secondary)', marginTop: 4, marginBottom: 16,
                    fontFamily: 'JetBrains Mono',
                  }}>
                    전국 {rank}위 / {allSorted.length}개교 (하위 {pct}%)
                  </div>
                )
              })()}

              <button onClick={() => navigate(`/school/${selectedSchool.id}`)} style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: '1px solid rgba(0,229,255,0.4)',
                background: 'rgba(0,229,255,0.08)', color: 'var(--cyan)',
                cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 13,
              }}>
                전체 상세 보기 →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
