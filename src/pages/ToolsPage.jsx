import { NutritionCalculator } from '../components/features/NutritionCalculator.jsx'

export function ToolsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 2 }}>
            TOOLS
          </div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>분석 도구</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>학교·학년·성별별 맞춤 영양 기준 분석</p>
        </div>
        <NutritionCalculator />
      </div>
    </div>
  )
}
