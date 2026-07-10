import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSchoolData } from '../hooks/useSchoolData.js'
import { getAllergySettings, ALLERGENS } from '../components/layout/AllergyPanel.jsx'
import { NutrientTab }    from '../components/school/NutrientTab.jsx'
import { MealCalendar }   from '../components/features/MealCalendar.jsx'
import { SeasonalAnalysis } from '../components/features/SeasonalAnalysis.jsx'
import { SatisfactionVote } from '../components/features/SatisfactionVote.jsx'
import { AiPersona }      from '../components/features/AiPersona.jsx'
import { NutritionistAssistant } from '../components/features/NutritionistAssistant.jsx'
import { TasteRank }      from '../components/features/TasteRank.jsx'
import { ActionCard }     from '../components/action/ActionCard.jsx'
import { marColor } from '../utils/nutrition.js'
import { mockSchools } from '../data/mockSchools.js'

function MARGauge({ mar, size = 160 }) {
  const [animated, setAnimated] = useState(0)
  const r = size / 2 - 12
  const circ = 2 * Math.PI * r
  const offset = circ - (animated / 100) * circ
  const color = marColor(mar)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(mar), 200)
    return () => clearTimeout(t)
  }, [mar])

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 8px ${color}80)` }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontFamily="Syne" fontWeight="800"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {mar.toFixed(1)}
      </text>
      <text x={size/2} y={size/2 + size * 0.17} textAnchor="middle"
        fill="var(--text-muted)" fontSize="10" fontFamily="JetBrains Mono"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        MAR
      </text>
    </svg>
  )
}

const TABS = ['영양 분석', '체력 (PAPS)', '급식 달력', '계절성', '만족도', 'AI 페르소나', '맛 순위', '영양 어시스턴트', '리포트']

const GRADE_COLORS = ['#22c55e', '#86efac', '#fbbf24', '#f97316', '#ef4444']
const GRADE_LABELS = ['1등급 (우수)', '2등급 (보통)', '3등급 (일반)', '4등급 (부족)', '5등급 (매우 부족)']

function PapsTab({ school }) {
  const paps = school.paps
  if (!paps) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏃</div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>PAPS 체력검사 데이터 없음</div>
        <div style={{ fontSize: 13 }}>해당 학교의 PAPS 공시 데이터가 수집되지 않았습니다 (직업계고·특수목적고 등 미참여)</div>
      </div>
    )
  }

  const grades = [paps.grade1Pct, paps.grade2Pct, paps.grade3Pct, paps.grade4Pct, paps.grade5Pct]
  const goodRate = Math.round((paps.grade1Pct + paps.grade2Pct) * 10) / 10
  const gradeEntries = Object.entries(paps.gradeDetail || {})

  // 학년별 집계 (남녀 평균)
  const gradeGroups = {}
  for (const [key, row] of gradeEntries) {
    const g = row.grade
    if (!gradeGroups[g]) gradeGroups[g] = []
    gradeGroups[g].push(row)
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '체력 우수율 (1+2등급)', value: `${goodRate}%`, color: goodRate >= 50 ? '#22c55e' : goodRate >= 30 ? '#fbbf24' : '#ef4444' },
          { label: '1등급 비율', value: `${paps.grade1Pct}%`, color: '#22c55e' },
          { label: '평균 BMI', value: paps.bmi?.toFixed(1) || '-', color: 'var(--cyan)' },
          { label: 'PAPS 공시 연도', value: `${paps.pbanYr}년`, color: 'var(--text-muted)' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 등급 분포 막대 */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>PAPS 등급 분포</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grades.map((pct, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 130, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{GRADE_LABELS[i]}</span>
              <div style={{ flex: 1, height: 14, background: 'var(--bg-elevated)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: GRADE_COLORS[i], borderRadius: 7, transition: 'width 0.8s ease' }} />
              </div>
              <span style={{ width: 48, textAlign: 'right', fontSize: 13, fontWeight: 600, color: GRADE_COLORS[i], flexShrink: 0 }}>
                {pct?.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 학년별 상세 */}
      {Object.keys(gradeGroups).length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>학년별 체력 세부 현황</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {['학년/성별', '심폐지구력', '유연성(앉아윗몸앞으로굽히기)', '근력(악력/윗몸일으키기)', '순발력(제자리멀리뛰기)', 'BMI', '1등급%', '5등급%', '참여수'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === '학년/성별' ? 'left' : 'right', fontWeight: 500, borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeEntries.map(([key, row]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text-primary)' }}>{key}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.cardio_shuttle ?? '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.flex_sit ?? '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.muscle_grip ?? row.muscle_situp ?? '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.power_jump ?? '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--cyan)' }}>{row.bmi?.toFixed(1) ?? '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{row.grade1_pct?.toFixed(1) ?? '-'}%</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#ef4444' }}>{row.grade5_pct?.toFixed(1) ?? '-'}%</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>{row.tested ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function SchoolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { school, meals, dataSource, loadingRealMeals } = useSchoolData(id)
  const [activeTab, setActiveTab] = useState(0)
  const [myAllergens] = useState(getAllergySettings)

  if (!school) {
    return (
      <div className="page-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, marginBottom: 8 }}>학교를 찾을 수 없습니다</div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>대시보드로 돌아가기</button>
        </div>
      </div>
    )
  }

  const allergyAlert = myAllergens.filter(id => school.allergens_today?.includes(id))

  // 신규 기능 2: 전국/지역 순위 계산
  const allMARs = [...mockSchools].sort((a, b) => a.scores.mar - b.scores.mar)
  const regionSchools = mockSchools.filter(s => s.regionCode === school.regionCode).sort((a, b) => a.scores.mar - b.scores.mar)
  const nationalRank = allMARs.findIndex(s => s.id === school.id) + 1
  const regionalRank = regionSchools.findIndex(s => s.id === school.id) + 1
  const nationalPct = Math.round((nationalRank / allMARs.length) * 100)

  // 신규 기능 5: 최근 메뉴 표시
  const todayMeals = meals.filter(m => m.date === meals[meals.length - 1]?.date)
  const todayMenu = todayMeals[0]?.menu || []

  return (
    <div className="page-layout">
      {/* 알레르기 배너 */}
      {allergyAlert.length > 0 && (
        <div style={{
          position: 'sticky', top: 'var(--header-h)', zIndex: 900,
          background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)',
          borderLeft: '4px solid var(--rose)', padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: 'var(--glow-rose)',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--rose)' }}>오늘 급식 알레르기 경보 </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {allergyAlert.map(id => `${ALLERGENS[id]?.name}(${id})`).join(', ')}가 포함되어 있습니다
            </span>
          </div>
        </div>
      )}

      {/* 히어로 섹션 */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, rgba(244,63,94,0.04) 100%)',
        padding: '28px 24px 0', borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* 브레드크럼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            <button onClick={() => navigate('/')} style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>전국</button>
            <span>›</span>
            <button onClick={() => navigate(`/region/${school.regionCode}`)} style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>{school.region}</button>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)' }}>{school.shortName}</span>
            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'JetBrains Mono',
              background: dataSource === 'neis' ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.1)',
              color: dataSource === 'neis' ? 'var(--emerald)' : 'var(--text-muted)',
              border: `1px solid ${dataSource === 'neis' ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.2)'}`,
            }}>
              {loadingRealMeals ? '⟳ NEIS 로딩' : dataSource === 'neis' ? '✓ NEIS 실데이터' : '더미 데이터'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 24 }}>
            {/* 학교 정보 */}
            <div>
              <h1 style={{ fontFamily: 'Syne', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.1 }}>
                {school.name}
              </h1>
              {/* 신규 기능 2: 순위 배지 */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px', background: 'rgba(0,229,255,0.1)',
                  border: '1px solid rgba(0,229,255,0.3)', borderRadius: 6,
                  fontSize: 12, color: 'var(--cyan)', fontFamily: 'JetBrains Mono',
                }}>
                  전국 {nationalRank}위 / {allMARs.length}개교 (하위 {nationalPct}%)
                </span>
                <span style={{
                  padding: '4px 10px', background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6,
                  fontSize: 12, color: 'var(--amber)', fontFamily: 'JetBrains Mono',
                }}>
                  {school.region} {regionalRank}위 / {regionSchools.length}개교
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                {school.region} {school.city} · {school.type} · 학생 {school.studentCount.toLocaleString()}명
              </p>

              {/* 경보 태그 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {school.streaks.iron_deficit_days > 0 && (
                  <span className="badge badge-rose">
                    ⚡ 철분 미달 {school.streaks.iron_deficit_days}일 연속
                  </span>
                )}
                {school.streaks.calorie_deficit_days > 0 && (
                  <span className="badge badge-amber">
                    🔥 칼로리 미달 {school.streaks.calorie_deficit_days}일
                  </span>
                )}
                {!school.hasNutritionTeacher && (
                  <span className="badge badge-violet">영양교사 미배치</span>
                )}
                <span className="badge badge-cyan">
                  예산 {school.budgetPerStudent.toLocaleString()}원/일
                </span>
              </div>
            </div>

            {/* MAR 게이지 */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <MARGauge mar={school.scores.mar} size={160} />
            </div>
          </div>

          {/* 신규 기능 5: 최근 메뉴 표시 */}
          {todayMenu.length > 0 && (
            <div style={{
              padding: '10px 0 14px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginRight: 8 }}>최근 메뉴</span>
              {todayMenu.map(item => (
                <span key={item} style={{ marginRight: 12, fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={`tab-underline ${activeTab === i ? 'active' : ''}`}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: activeTab === i ? 600 : 400,
                  color: activeTab === i ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.15s',
                }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div key={activeTab} className="tab-content-enter" style={{ padding: '24px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>
        {activeTab === 0 && <NutrientTab school={school} meals={meals} />}
        {activeTab === 1 && <PapsTab school={school} />}
        {activeTab === 2 && <MealCalendar meals={meals} myAllergens={myAllergens} />}
        {activeTab === 3 && <SeasonalAnalysis school={school} meals={meals} />}
        {activeTab === 4 && <SatisfactionVote school={school} />}
        {activeTab === 5 && <AiPersona school={school} meals={meals} recentMenus={meals.slice(-30).map(m => m.menu)} />}
        {activeTab === 6 && <TasteRank school={school} meals={meals} />}
        {activeTab === 7 && <NutritionistAssistant school={school} meals={meals} />}
        {activeTab === 8 && <ActionCard school={school} />}
      </div>
    </div>
  )
}
