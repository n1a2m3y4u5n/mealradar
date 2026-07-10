import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../../utils/apiBase.js'

const QUICK_QUESTIONS = [
  { label: '철분 부족 해결법', q: '이 학교의 철분 INQ가 낮은데, 예산 범위 내에서 철분을 효과적으로 보충할 수 있는 메뉴 변경 방안을 알려주세요.' },
  { label: '칼슘 강화 방법', q: '칼슘 섭취량을 높이기 위해 급식 메뉴에 어떤 식재료를 추가하거나 교체하면 좋을까요? 구체적인 메뉴명으로 알려주세요.' },
  { label: '나트륨 절감 전략', q: '학생 기호도를 유지하면서 나트륨을 줄이는 현실적인 조리법과 식재료 대체 방안을 알려주세요.' },
  { label: '이번 주 메뉴 평가', q: '최근 5일 급식 메뉴를 보고 영양 균형 측면에서 강점과 개선이 필요한 부분을 분석해주세요.' },
  { label: '단백질 확보 방안', q: '저예산으로 단백질 NAR을 높일 수 있는 식품 조합 전략을 알려주세요. 콩류, 계란, 두부 등 대안 포함.' },
  { label: 'MAR 개선 로드맵', q: `현재 MAR 점수를 기준으로 6개월 내 5점 이상 올리려면 어떤 순서로 어떤 영양소를 집중 개선해야 할까요?` },
]

export function NutritionistAssistant({ school, meals }) {
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  const ask = async (question) => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: q }
    setHistory(h => [...h, userMsg])

    try {
      const res = await fetch(`${API_BASE}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school, meals, question: q, history }),
      })
      const data = await res.json()
      if (data.success) {
        setHistory(h => [...h, { role: 'assistant', content: data.answer }])
      } else {
        setHistory(h => [...h, { role: 'assistant', content: `⚠️ 오류: ${data.error}` }])
      }
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: '서버 연결 실패. `npm run server`로 백엔드를 시작해주세요.' }])
    }
    setLoading(false)
  }

  const reset = () => setHistory([])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>영양교사 AI 어시스턴트</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {school.name} 데이터 기반 · Claude AI · 급식 개선 전문 코파일럿
          </p>
        </div>
        {history.length > 0 && (
          <button onClick={reset} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
          }}>대화 초기화</button>
        )}
      </div>

      {/* 빠른 질문 */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'JetBrains Mono' }}>QUICK QUESTIONS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_QUESTIONS.map(({ label, q }) => (
            <button key={label} onClick={() => ask(q)} disabled={loading} style={{
              padding: '6px 14px', borderRadius: 100,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-raised)', color: 'var(--text-secondary)',
              fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 대화창 */}
      <div style={{
        minHeight: 300, maxHeight: 480, overflowY: 'auto',
        background: 'var(--bg-raised)', borderRadius: 12,
        border: '1px solid var(--border-default)', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {history.length === 0 && !loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍🍳</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>영양교사 AI 어시스턴트</div>
            <div style={{ fontSize: 12 }}>위 빠른 질문을 누르거나 직접 질문을 입력하세요</div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--cyan)' : 'rgba(139,92,246,0.3)',
              border: msg.role === 'assistant' ? '1px solid rgba(139,92,246,0.5)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px', borderRadius: 10,
              background: msg.role === 'user' ? 'rgba(0,229,255,0.08)' : 'var(--bg-surface)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(0,229,255,0.2)' : 'var(--border-subtle)'}`,
              fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}>
              <MarkdownText text={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <span className="thinking-dots">분석 중</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        display: 'flex', gap: 10,
        background: 'var(--bg-raised)', borderRadius: 12,
        border: '1px solid var(--border-default)', padding: '10px 14px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
          placeholder="영양 개선, 메뉴 제안, 예산 최적화 등 자유롭게 질문하세요..."
          disabled={loading}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--text-primary)',
          }}
        />
        <button onClick={() => ask(input)} disabled={loading || !input.trim()} style={{
          padding: '6px 16px', borderRadius: 8,
          background: loading || !input.trim() ? 'var(--bg-surface)' : 'var(--cyan)',
          color: loading || !input.trim() ? 'var(--text-muted)' : '#0f172a',
          border: 'none', fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}>전송</button>
      </div>
    </div>
  )
}

// 마크다운 볼드/이탤릭 최소 렌더링
function MarkdownText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        // 헤더
        if (line.startsWith('### ')) return <div key={i} style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--cyan)', marginTop: i > 0 ? 8 : 0 }}>{line.slice(4)}</div>
        if (line.startsWith('## '))  return <div key={i} style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginTop: i > 0 ? 10 : 0 }}>{line.slice(3)}</div>
        // 불릿
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>▸</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
        return <div key={i}>{renderInline(line)}</div>
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
