import { useState } from 'react'
import { API_BASE } from '../../utils/apiBase.js'

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const RANK_EMOJIS = ['🥇', '🥈', '🥉']

export function TasteRank({ school, meals }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(10)

  const targetMeals = meals.slice(-period)

  const analyze = async () => {
    if (targetMeals.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/api/ai/taste-rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName: school.name, meals: targetMeals }),
      })
      const data = await res.json()
      if (data.success) setResult(data.data)
      else setError(data.error)
    } catch {
      setError('서버 연결 실패. `npm run server`로 백엔드를 시작해주세요.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>급식 맛 순위</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Claude AI가 학생 관점에서 최근 급식을 맛·구성·선호도 기준으로 랭킹
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => setPeriod(n)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${period === n ? 'var(--cyan)' : 'var(--border-default)'}`,
                background: period === n ? 'rgba(0,229,255,0.08)' : 'none',
                color: period === n ? 'var(--cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}>최근 {n}끼</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={analyze} disabled={loading || targetMeals.length === 0}
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? '분석 중...' : '🏆 랭킹 분석'}
          </button>
        </div>
      </div>

      {/* 분석 대상 메뉴 미리보기 */}
      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>
          분석 대상 {targetMeals.length}끼
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {targetMeals.slice(-5).map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{m.date}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{(m.menu || []).join(' · ')}</span>
            </div>
          ))}
          {targetMeals.length > 5 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>외 {targetMeals.length - 5}끼 더...</div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--rose)' }}>
          ⚠️ {error}
        </div>
      )}

      {!result && !loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍱</div>
          <div style={{ fontSize: 14 }}>랭킹 분석 버튼을 눌러주세요</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>학생 선호도 기준으로 급식 순위를 매깁니다</div>
        </div>
      )}

      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Claude AI가 {targetMeals.length}끼 급식 분석 중...</div>
        </div>
      )}

      {result && (
        <>
          {/* 요약 배너 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          }}>
            <div className="card" style={{ borderLeft: '3px solid var(--emerald)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'JetBrains Mono' }}>BEST COMBO</div>
              <div style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 600, lineHeight: 1.5 }}>{result.bestCombo}</div>
            </div>
            <div className="card" style={{ borderLeft: '3px solid var(--rose)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'JetBrains Mono' }}>WORST MENU</div>
              <div style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600, lineHeight: 1.5 }}>{result.worstMenu}</div>
            </div>
          </div>

          {/* TOP 3 포디움 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {(result.rankings || []).slice(0, 3).map((item, i) => (
              <div key={i} className="card" style={{
                borderTop: `3px solid ${RANK_COLORS[i]}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{RANK_EMOJIS[i]}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>{item.date}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {(item.menu || []).map((m, j) => (
                    <span key={j} style={{
                      padding: '2px 8px', borderRadius: 100, fontSize: 11,
                      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                    }}>{m}</span>
                  ))}
                </div>
                <div style={{
                  fontSize: 12, color: RANK_COLORS[i] === '#FFD700' ? '#b8960c' : RANK_COLORS[i] === '#C0C0C0' ? '#94a3b8' : '#a07540',
                  fontWeight: 600, marginBottom: 8,
                }}>{item.highlight}</div>
                <div style={{
                  padding: '8px 10px', background: 'var(--bg-raised)', borderRadius: 8,
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                }}>
                  {item.studentReaction}
                </div>
                {/* 점수 배지 */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 42, height: 42, borderRadius: '50%',
                  background: `${RANK_COLORS[i]}20`,
                  border: `2px solid ${RANK_COLORS[i]}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 14,
                  color: RANK_COLORS[i] === '#FFD700' ? '#d4a017' : RANK_COLORS[i],
                }}>
                  {item.score}
                </div>
              </div>
            ))}
          </div>

          {/* 전체 순위 테이블 */}
          {result.rankings && result.rankings.length > 3 && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>전체 순위</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {result.rankings.map((item, i) => {
                  const isTop3 = i < 3
                  const isBottom = i === result.rankings.length - 1
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 12px', borderRadius: 8,
                      background: isTop3 ? `${RANK_COLORS[i]}08` : 'none',
                      borderBottom: i < result.rankings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800,
                        color: isTop3 ? RANK_COLORS[i] : isBottom ? 'var(--rose)' : 'var(--text-muted)',
                        width: 28, textAlign: 'center', flexShrink: 0,
                      }}>
                        {isTop3 ? RANK_EMOJIS[i] : `${i + 1}`}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)', width: 70, flexShrink: 0 }}>{item.date}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(item.menu || []).join(' · ')}
                        </div>
                        {item.pros && item.pros.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            ✓ {item.pros.join(' / ')}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700,
                        color: item.score >= 80 ? 'var(--emerald)' : item.score >= 60 ? 'var(--amber)' : 'var(--rose)',
                        flexShrink: 0,
                      }}>
                        {item.score}점
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
