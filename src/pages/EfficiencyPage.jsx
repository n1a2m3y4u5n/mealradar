import { CostEfficiency } from '../components/features/CostEfficiency.jsx'

export function EfficiencyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 2 }}>
            EFFICIENCY
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>급식비 효율 분석</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            1인당 급식비 대비 영양 달성률(MAR) 효율을 전국 50개 학교 기준으로 비교 분석합니다.
          </p>
        </div>
        <CostEfficiency />
      </div>
    </div>
  )
}
