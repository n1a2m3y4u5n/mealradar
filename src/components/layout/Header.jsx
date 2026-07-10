import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockSchools } from '../../data/mockSchools.js'
import { getAllergySettings, AllergyPanel } from './AllergyPanel.jsx'

function ClockDisplay() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const formatted = now.toLocaleString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
      {formatted}
    </div>
  )
}

export function Header() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [showPanel, setPanel]   = useState(false)
  const [allergyCount, setCount] = useState(getAllergySettings().length)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // 디바운스 검색
  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(() => {
      const q = query.toLowerCase()
      setResults(mockSchools.filter(s =>
        s.name.includes(q) || s.shortName.includes(q) || s.city.includes(q) || s.region.includes(q)
      ).slice(0, 8))
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  const pick = (school) => {
    setQuery(''); setResults([])
    navigate(`/school/${school.id}`)
  }

  const handlePanelClose = () => {
    setPanel(false)
    setCount(getAllergySettings().length)
  }

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--header-h)', zIndex: 1000,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        {/* 로고 */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}
          onClick={(e) => { e.preventDefault(); navigate('/') }}>
          <span style={{ position: 'relative', width: 8, height: 8 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--emerald)' }}
              className="animate-pulse" />
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--cyan)' }}>MEAL</span>
            <span style={{ color: 'var(--text-primary)' }}>RADAR</span>
          </span>
        </a>

        {/* 검색 */}
        <div style={{ position: 'relative', flex: '1', maxWidth: 320 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '6px 12px', transition: 'border-color 0.2s',
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M15 15l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="학교명 검색..." style={{
                background: 'none', border: 'none', outline: 'none', fontSize: 13,
                color: 'var(--text-primary)', width: '100%',
              }}
              onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); setResults([]) } }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]) }} style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {results.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
              zIndex: 100,
            }} className="animate-slideDown">
              {results.map(s => (
                <button key={s.id} onClick={() => pick(s)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px', background: 'none',
                  borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.region} · {s.city} · {s.type}</div>
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700,
                    color: s.scores.mar < 60 ? 'var(--rose)' : s.scores.mar < 70 ? 'var(--amber)' : 'var(--emerald)',
                  }}>{s.scores.mar.toFixed(1)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 스페이서 */}
        <div style={{ flex: 1 }} />

        {/* 네비게이션 링크 */}
        {[
          { label: '대시보드', path: '/' },
          { label: '계산기', path: '/tools' },
        ].map(({ label, path }) => (
          <button key={path} onClick={() => navigate(path)} style={{
            fontSize: 13, color: 'var(--text-secondary)', padding: '4px 10px',
            borderRadius: 6, transition: 'color 0.15s', background: 'none', border: 'none',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >{label}</button>
        ))}

        {/* 알레르기 설정 */}
        <button onClick={() => setPanel(!showPanel)} style={{
          position: 'relative', padding: '6px 8px', borderRadius: 8,
          background: showPanel ? 'var(--bg-raised)' : 'none',
          border: '1px solid transparent',
          transition: 'all 0.15s',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {allergyCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2, width: 14, height: 14,
              background: 'var(--rose)', borderRadius: '50%', fontSize: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontFamily: 'JetBrains Mono',
            }}>{allergyCount}</span>
          )}
        </button>

        {/* LIVE 배지 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', border: '1px solid rgba(0,229,255,0.3)',
          borderRadius: 100, background: 'rgba(0,229,255,0.06)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)' }}
            className="animate-blink" />
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em' }}>LIVE</span>
        </div>

        {/* 실시간 시계 (BUG 2 수정: 하드코딩 제거) */}
        <ClockDisplay />
      </header>

      <AllergyPanel open={showPanel} onClose={handlePanelClose} />
    </>
  )
}
