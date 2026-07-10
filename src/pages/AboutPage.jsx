export function AboutPage() {
  const methods = [
    'MAR', 'NAR', 'INQ', 'NRF', 'DDS',
    'STL', 'Isolation Forest', "Moran's I", 'HLM', 'DiD',
    'Kaplan-Meier', 'Bayesian Hierarchical', 'Fixed Effects',
  ]

  const dataSources = [
    { name: 'NEIS 공공데이터', desc: '교육부 학교급식 영양 데이터', color: 'var(--cyan)' },
    { name: '학교알리미', desc: '학교 기본정보 및 예산 현황', color: 'var(--amber)' },
    { name: 'aT 농수산물', desc: '식재료 단가 및 시장 데이터', color: 'var(--emerald)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* 타이틀 */}
      <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>MealRadar</div>
      <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>전국 학교급식 영양 모니터링 플랫폼</div>

      {/* 목적 섹션 */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>프로젝트 목적</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          MealRadar는 전국 초·중·고 학교급식의 영양 실태를 데이터 기반으로 모니터링하고,
          지역·예산·학교 유형별 영양 격차의 원인을 통계적으로 분석하는 플랫폼입니다.
          MAR(영양소 적정비율), STL 시계열 분해, Kaplan-Meier 생존 분석, DiD 준실험 설계 등
          다양한 통계 기법을 통해 급식 개선을 위한 정책 근거를 제시합니다.
        </div>
      </div>

      {/* 데이터 출처 */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>데이터 출처</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {dataSources.map(ds => (
            <div key={ds.name} style={{
              flex: '1 1 200px', background: 'var(--bg-raised)', borderRadius: 12,
              border: `1px solid ${ds.color}30`, padding: '16px 20px',
            }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: ds.color, marginBottom: 6 }}>{ds.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ds.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 분석 방법론 */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>분석 방법론</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {methods.map(m => (
            <span key={m} style={{
              padding: '6px 14px', borderRadius: 100,
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
              fontSize: 12, color: 'var(--cyan)', fontFamily: 'JetBrains Mono',
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* 법적 근거 */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>법적 근거</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            '학교급식법 제11조 (급식의 영양관리)',
            '학교급식법 시행규칙 제5조 (영양관리기준)',
            '공공데이터의 제공 및 이용 활성화에 관한 법률',
            '개인정보 보호법 (학교 단위 집계 데이터만 사용)',
          ].map(law => (
            <div key={law} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--violet)', flexShrink: 0 }} />
              {law}
            </div>
          ))}
        </div>
      </div>

      {/* 면책 조항 */}
      <div style={{
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--amber)', marginBottom: 8 }}>면책 조항</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          본 플랫폼에 표시되는 데이터는 공공데이터 포털 및 교육부 NEIS 시스템의 공개 정보를 기반으로 합니다.
          개별 학교의 실제 급식 품질과 다를 수 있으며, 교육 정책 의사결정에는 원본 데이터를 직접 확인하시기 바랍니다.
          본 서비스는 정보 제공 목적으로만 운영됩니다.
        </div>
      </div>

      {/* GitHub 버튼 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13,
          transition: 'all 0.2s',
        }}>
          GitHub 저장소
        </a>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          color: 'var(--text-muted)', fontSize: 12, fontFamily: 'JetBrains Mono',
        }}>
          v1.0.0 · 2024 MealRadar
        </div>
      </div>
    </div>
  )
}
