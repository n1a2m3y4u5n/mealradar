import { useState, useEffect, useRef } from 'react'

export const ALLERGENS = {
  1:  { name: "난류",     icon: "🥚", color: "#fbbf24" },
  2:  { name: "우유",     icon: "🥛", color: "#e2e8f0" },
  3:  { name: "메밀",     icon: "🌾", color: "#92400e" },
  4:  { name: "땅콩",     icon: "🥜", color: "#d97706" },
  5:  { name: "대두",     icon: "🫘", color: "#65a30d" },
  6:  { name: "밀",       icon: "🌾", color: "#f59e0b" },
  7:  { name: "고등어",   icon: "🐟", color: "#0284c7" },
  8:  { name: "게",       icon: "🦀", color: "#dc2626" },
  9:  { name: "새우",     icon: "🦐", color: "#f97316" },
  10: { name: "돼지고기", icon: "🐷", color: "#f43f5e" },
  11: { name: "복숭아",   icon: "🍑", color: "#fb7185" },
  12: { name: "토마토",   icon: "🍅", color: "#dc2626" },
  13: { name: "아황산류", icon: "⚗️", color: "#7c3aed" },
  14: { name: "호두",     icon: "🌰", color: "#92400e" },
  15: { name: "닭고기",   icon: "🐔", color: "#fbbf24" },
  16: { name: "쇠고기",   icon: "🐄", color: "#b45309" },
  17: { name: "오징어",   icon: "🦑", color: "#6b7280" },
  18: { name: "조개류",   icon: "🦪", color: "#0891b2" },
}

const LS_KEY = 'mealradar_allergens'

export function getAllergySettings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

export function AllergyPanel({ open, onClose }) {
  const [selected, setSelected] = useState(getAllergySettings)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(selected))
    onClose()
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', top: 'var(--header-h)', left: 0, right: 0, zIndex: 999,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div ref={panelRef} className="animate-slideDown" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderTop: 'none', borderRadius: '0 0 16px 16px',
        padding: '20px 24px 24px',
        width: 420, maxHeight: '80vh', overflowY: 'auto',
        marginRight: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>내 알레르기 설정</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              해당 항목 선택 시 급식에서 자동 경보
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8
        }}>
          {Object.entries(ALLERGENS).map(([id, a]) => {
            const isSelected = selected.includes(Number(id))
            return (
              <button key={id} onClick={() => toggle(Number(id))} style={{
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                border: isSelected ? `2px solid var(--rose)` : '2px solid var(--border-default)',
                background: isSelected ? 'rgba(244,63,94,0.1)' : 'var(--bg-raised)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.15s ease',
              }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <span style={{ fontSize: 11, color: isSelected ? 'var(--rose)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>
                  {a.name}
                </span>
                <span style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono',
                  color: isSelected ? 'var(--rose)' : 'var(--text-muted)'
                }}>#{id}</span>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={save}>
            저장
          </button>
          <button className="btn btn-ghost" onClick={() => setSelected([])}>
            전체 해제
          </button>
        </div>

        {selected.length > 0 && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(244,63,94,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--rose)' }}>
            {selected.map(id => ALLERGENS[id]?.icon).join(' ')} {selected.length}개 항목 선택됨
          </div>
        )}
      </div>
    </div>
  )
}
