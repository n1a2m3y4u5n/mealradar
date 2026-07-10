import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { mockVotesBySchool, mockVotesSummary } from '../../data/mockVotes.js'

const LS_KEY = (schoolId) => `mealradar_vote_${schoolId}_${new Date().toISOString().split('T')[0]}`

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          className={`star-btn ${n <= (hover || value) ? 'filled' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{ background: 'none', border: 'none' }}
        >★</button>
      ))}
    </div>
  )
}

function Confetti({ active }) {
  if (!active) return null
  const colors = ['var(--cyan)','var(--amber)','var(--rose)','var(--emerald)','var(--violet)']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="confetti-particle" style={{
          left: `${10 + (i * 5) % 90}%`,
          top: '40%',
          background: colors[i % colors.length],
          animationDelay: `${i * 30}ms`,
          transform: `rotate(${i * 20}deg)`,
        }} />
      ))}
    </div>
  )
}

export function SatisfactionVote({ school }) {
  const today = new Date().toISOString().split('T')[0]
  const [voted, setVoted] = useState(() => !!localStorage.getItem(LS_KEY(school.id)))
  const [taste,    setTaste]    = useState(0)
  const [quantity, setQuantity] = useState(0)
  const [variety,  setVariety]  = useState(0)
  const [comment,  setComment]  = useState('')
  const [showConfetti, setConfetti] = useState(false)
  const [localVote, setLocalVote] = useState(null)

  const summary = mockVotesSummary[school.id] || { taste_avg: 3.2, quantity_avg: 2.8, variety_avg: 2.7, total_votes: 500, trend: 0 }
  // BUG 3 수정: 데이터 없는 학교는 monthly_mar 기반으로 voteHistory 생성
  const voteHistory = mockVotesBySchool[school.id]
    ? Object.values(mockVotesBySchool[school.id]).slice(-30).map(d => ({
        date: d.date.slice(5),
        avg: ((d.votes.taste.reduce((s,v,i)=>s+(i+1)*v,0)/Math.max(d.votes.taste.reduce((a,b)=>a+b,0),1)) +
              (d.votes.quantity.reduce((s,v,i)=>s+(i+1)*v,0)/Math.max(d.votes.quantity.reduce((a,b)=>a+b,0),1)))/2,
      }))
    : (() => {
        const months = Object.entries(school.monthly_mar || {})
        if (!months.length) return []
        return months.map(([month, mar]) => ({
          date: month.slice(5),
          avg: parseFloat(((mar / 100) * 5).toFixed(1)),
        }))
      })()

  const canSubmit = taste > 0 && quantity > 0 && variety > 0

  const submit = () => {
    if (!canSubmit) return
    const vote = { taste, quantity, variety, comment, date: today }
    localStorage.setItem(LS_KEY(school.id), JSON.stringify(vote))
    setLocalVote(vote)
    setVoted(true)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1000)
  }

  const overallAvg = ((summary.taste_avg + summary.quantity_avg + summary.variety_avg) / 3).toFixed(1)
  const keywords   = school.vote?.top_keywords || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 투표 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ position: 'relative', overflow: 'visible' }}>
          <Confetti active={showConfetti} />
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>오늘 급식 평가</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>익명으로 제출됩니다</div>

          {!voted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['맛이 어땠나요?', taste, setTaste], ['양은 충분했나요?', quantity, setQuantity], ['다양했나요?', variety, setVariety]].map(([label, val, setter]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
                  <StarRating value={val} onChange={setter} />
                </div>
              ))}
              <div>
                <input value={comment} onChange={e => setComment(e.target.value.slice(0, 50))}
                  placeholder="한줄 코멘트 (선택, 50자)"
                  style={{
                    width: '100%', padding: '8px 12px', background: 'var(--bg-raised)',
                    border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13,
                    color: 'var(--text-primary)',
                  }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>{comment.length}/50</div>
              </div>
              <button className="btn btn-primary" onClick={submit} disabled={!canSubmit} style={{
                width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : 0.5,
              }}>
                익명으로 제출
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>오늘의 평가 완료!</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>내일 다시 평가할 수 있습니다</div>
              {localVote && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13 }}>
                  <span>맛 {'★'.repeat(localVote.taste)}</span>
                  <span>양 {'★'.repeat(localVote.quantity)}</span>
                  <span>다양성 {'★'.repeat(localVote.variety)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 누적 결과 요약 */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>누적 만족도</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 40, fontWeight: 800, color: parseFloat(overallAvg) >= 4 ? 'var(--emerald)' : parseFloat(overallAvg) >= 3 ? 'var(--amber)' : 'var(--rose)', marginBottom: 4 }}>
            {overallAvg}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            총 {summary.total_votes.toLocaleString()}명 투표
            <span style={{ marginLeft: 8, color: summary.trend > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
              {summary.trend > 0 ? '▲' : '▼'} {Math.abs(summary.trend).toFixed(1)}
            </span>
          </div>
          {[['맛', summary.taste_avg], ['양', summary.quantity_avg], ['다양성', summary.variety_avg]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 13, width: 40, color: 'var(--text-secondary)' }}>{l}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(v/5)*100}%`, height: '100%', background: 'var(--amber)', borderRadius: 4 }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--amber)', fontWeight: 700, width: 28 }}>{v.toFixed(1)}</span>
            </div>
          ))}

          {/* 영양 vs 만족도 괴리 */}
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(124,58,237,0.08)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600, marginBottom: 4 }}>영양 vs 만족도 괴리</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              영양 MAR <span style={{ color: 'var(--rose)', fontFamily: 'JetBrains Mono' }}>{school.scores.mar.toFixed(1)}</span>점
              (하위 {Math.round((1 - school.scores.mar/100) * 80 + 5)}%) vs
              만족도 <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{overallAvg}</span>/5 — 양념·조리법이 영양 부족을 가리고 있을 수 있습니다
            </div>
          </div>
        </div>
      </div>

      {/* 시계열 + 키워드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>만족도 추이 (최근 30일)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={voteHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={4} />
              <YAxis domain={[1, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
              <Line dataKey="avg" stroke="var(--amber)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>주요 키워드</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {keywords.map((kw, i) => (
              <span key={kw} style={{
                padding: '4px 12px', borderRadius: 100,
                background: i === 0 ? 'rgba(244,63,94,0.12)' : 'var(--bg-raised)',
                border: `1px solid ${i === 0 ? 'rgba(244,63,94,0.3)' : 'var(--border-default)'}`,
                color: i === 0 ? 'var(--rose)' : 'var(--text-secondary)',
                fontSize: 13 - i,
                fontWeight: i < 2 ? 600 : 400,
              }}>{kw}</span>
            ))}
            {['맛 개선 필요', '영양 부족', '다양성 요청'].map((kw, i) => (
              <span key={kw} style={{
                padding: '3px 10px', borderRadius: 100, background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12,
              }}>{kw}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
