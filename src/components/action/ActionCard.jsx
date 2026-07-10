import { useState } from 'react'
import { fmtDate } from '../../utils/formatters.js'

const REGION_EDU_OFFICES = {
  '전남': '전라남도교육청',  '서울': '서울특별시교육청',
  '경기': '경기도교육청',    '강원': '강원특별자치도교육청',
  '충남': '충청남도교육청',  '경북': '경상북도교육청',
  '제주': '제주특별자치도교육청', '부산': '부산광역시교육청',
}

function generateReport(school) {
  const grade = (() => {
    const all = [49,52,53,54,55,57,58,59,60,61,63,64,65,66,67,68,70,71,72,73,74,75,76,78,79,80,81,82,84]
    const rank = all.filter(m => m < school.scores.mar).length
    return Math.round((1 - rank/all.length) * 100)
  })()

  const topAnomaly = school.anomalies?.[0]
  const office = REGION_EDU_OFFICES[school.region] || `${school.region}교육청`

  return `수 신: ${office} 교육감 귀중
발 신: ${school.name} 재학생 일동
제 목: 학교급식 영양 기준 개선 요청서
작성일: ${new Date().toLocaleDateString('ko-KR')}

1. 요청 배경

학교급식법 제9조(급식의 영양관리기준)에 따르면 학교장은 학생의 건강 증진 및
균형 잡힌 식생활 교육을 위해 교육부령으로 정하는 영양관리기준을 준수하여야 하며,
교육감은 학교의 급식 운영에 관한 지도·감독을 하도록 명시되어 있습니다.

그러나 NEIS 공공데이터 분석 결과, 본교(${school.name})는 2024학년도 기준으로:
- 평균 MAR(Mean Adequacy Ratio): ${school.scores.mar.toFixed(1)}점 (전국 하위 ${grade}% 수준)
- 철분 기준 연속 미달: ${school.streaks.iron_deficit_days}일
- 열량 기준 미달: ${school.streaks.calorie_deficit_days}일 기록

특히 ${topAnomaly ? `${fmtDate(topAnomaly.date)}에는 열량이 ${topAnomaly.value}kcal에 불과해 권장 기준(850~1050kcal)의 절반 수준으로 떨어지는 극단적 이상치가 탐지되었습니다.` : '철분 및 칼슘이 권장 기준을 지속적으로 하회하고 있습니다.'}

2. 구체적 개선 요구사항

① 영양교사 즉각 배치${!school.hasNutritionTeacher ? ' (현재 미배치 상태)' : ''}
   - 학교급식법 시행령 제5조: 일정 규모 이상 학교 영양교사 배치 의무
② 1인당 급식비 현실화
   - 현재 ${school.budgetPerStudent.toLocaleString()}원/일 → 영양 기준 달성 가능 수준으로 인상 요청
③ 철분·칼슘 강화 식단 편성
   - 주 3회 이상 시금치·두부·멸치 등 미량영양소 강화 식재료 사용
④ 정기적 영양 모니터링 및 학부모 공개

3. 근거 데이터

본 요청서는 교육부 NEIS 공공데이터 API를 통해 수집된 ${school.name}의
2024년 3월~11월 급식 영양 데이터를 머신러닝(Isolation Forest) 이상치 탐지
알고리즘으로 분석한 결과에 기반합니다.

첨부: 영양 분석 리포트 (MealRadar 생성)`
}

export function ActionCard({ school }) {
  const [copied, setCopied] = useState(false)
  const reportText = generateReport(school)

  const copy = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const print = () => window.print()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>개선 요청서 자동 생성</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            실제 데이터 기반 · 학교급식법 조항 자동 인용
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={copy}>
            {copied ? '✓ 복사됨' : '클립보드 복사'}
          </button>
          <button className="btn btn-primary no-print" onClick={print}>
            PDF 출력
          </button>
          <a href="https://minwon.moe.go.kr" target="_blank" rel="noopener noreferrer"
            className="btn" style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
            교육부 민원 바로가기 ↗
          </a>
        </div>
      </div>

      {/* 리포트 미리보기 */}
      <div style={{
        background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--border-default)',
        maxHeight: 500, overflowY: 'auto',
      }}>
        <div style={{
          padding: '24px 28px', fontFamily: 'Noto Sans KR, sans-serif',
          fontSize: 13.5, lineHeight: 2.0, color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
        }}>
          {reportText}
        </div>
      </div>

      {/* 법적 근거 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { title: '학교급식법 제9조', desc: '영양관리기준 준수 의무 — 학교장은 교육부령으로 정하는 영양관리기준을 준수해야 함' },
          { title: '동법 시행령 제5조', desc: '영양교사 배치 기준 — 일정 규모 이상 학교에 영양교사 배치 의무' },
          { title: '동법 제13조',      desc: '보호자의 급식 모니터링 권리 — 학부모는 급식 운영 전반에 참여 요구 가능' },
        ].map(({ title, desc }) => (
          <div key={title} style={{
            padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 10,
            border: '1px solid var(--border-default)', borderLeft: '3px solid var(--cyan)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--cyan)', fontWeight: 700, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
        ⚠️ 본 요청서는 공공데이터 기반 참고 자료이며 실제 제출 전 내용을 검토하시기 바랍니다.
      </div>
    </div>
  )
}
