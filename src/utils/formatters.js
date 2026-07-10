// 숫자 포맷
export function fmtNumber(n, decimals = 0) {
  if (n == null) return '-'
  return Number(n).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtPercent(n, decimals = 1) {
  if (n == null) return '-'
  return `${Number(n).toFixed(decimals)}%`
}

export function fmtCurrency(n) {
  if (n == null) return '-'
  return `${fmtNumber(n)}원`
}

// 날짜 포맷
export function fmtDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function fmtDateYMD(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function fmtMonthLabel(monthKey) {
  // "2024-09" → "9월"
  const parts = monthKey.split('-')
  return `${parseInt(parts[1])}월`
}

// MAR 절대+상대 혼합 등급
// allMAR: 전국 MAR 배열 (선택). 없으면 절대 등급만 반환
export function marGrade(mar, allMAR = null) {
  const PASS_THRESHOLD = 60 // 절대 기준

  if (mar < PASS_THRESHOLD) {
    const gap = (PASS_THRESHOLD - mar).toFixed(1)
    return {
      label: '기준미달',
      grade: 'F',
      pass: false,
      color: 'var(--rose)',
      sub: `기준 대비 -${gap}점`,
    }
  }

  if (!allMAR || allMAR.length === 0) {
    return { label: '기준통과', grade: 'P', pass: true, color: 'var(--emerald)', sub: '' }
  }

  const passing = allMAR.filter(v => v >= PASS_THRESHOLD).sort((a, b) => a - b)
  const rank = passing.filter(v => v <= mar).length
  const pct = Math.round((rank / passing.length) * 100)

  let label, grade, color
  if (pct >= 80) { label = '상위 20%'; grade = 'A'; color = 'var(--emerald)' }
  else if (pct >= 60) { label = '상위 40%'; grade = 'B'; color = 'var(--lime)' }
  else if (pct >= 40) { label = '중간'; grade = 'C'; color = 'var(--cyan)' }
  else if (pct >= 20) { label = '하위 40%'; grade = 'D'; color = 'var(--amber)' }
  else { label = '하위 20%'; grade = 'D-'; color = 'var(--orange)' }

  return { label, grade, pass: true, color, sub: `통과학교 중 상위 ${100 - pct + 1}%`, percentile: pct }
}

// 영양소 단위 포맷
export function fmtNutrient(value, unit) {
  if (value == null) return '-'
  const v = parseFloat(value)
  if (unit === 'kcal') return `${Math.round(v)} kcal`
  if (unit === 'mg')   return `${v.toFixed(1)} mg`
  if (unit === 'g')    return `${v.toFixed(1)} g`
  return `${v}`
}

// 효율 지수 등급
export function efficiencyLabel(eff) {
  if (eff >= 18) return { label: '최우수', color: 'var(--emerald)' }
  if (eff >= 15) return { label: '우수',   color: 'var(--lime)' }
  if (eff >= 12) return { label: '보통',   color: 'var(--amber)' }
  return { label: '저효율', color: 'var(--rose)' }
}

// 클러스터 타입 레이블
export function clusterLabel(type) {
  const map = {
    HH: { label: '미달 집중', color: 'var(--rose)', desc: '미달 학교가 밀집된 지역' },
    HL: { label: '산발적',   color: 'var(--orange)', desc: '미달 학교 산발 지역' },
    LH: { label: '고립 미달', color: 'var(--amber)', desc: '달성 지역 내 미달 학교' },
    LL: { label: '달성 집중', color: 'var(--emerald)', desc: '달성 학교가 밀집된 지역' },
    NS: { label: '비유의',   color: 'var(--text-muted)', desc: '통계적 유의성 없음' },
  }
  return map[type] || map.NS
}

// 계절 한글
export function seasonKo(s) {
  const map = { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }
  return map[s] || s
}

// 학교 유형 배지
export function schoolTypeBadge(type) {
  const map = {
    '일반고':  'badge-cyan',
    '직업계고': 'badge-violet',
    '자사고':  'badge-amber',
    '특목고':  'badge-rose',
  }
  return map[type] || 'badge-cyan'
}

// 동명 학교 구분용 displayName
// 같은 shortName을 가진 학교가 여럿일 때 "세명고 (포항)" 형태로 반환
import { mockSchools } from '../data/mockSchools.js'
const _dupShortNames = (() => {
  const cnt = {}
  mockSchools.forEach(s => { cnt[s.shortName] = (cnt[s.shortName] || 0) + 1 })
  return new Set(Object.entries(cnt).filter(([, v]) => v > 1).map(([k]) => k))
})()

export function schoolDisplayName(school) {
  if (!school) return ''
  if (_dupShortNames.has(school.shortName)) return `${school.shortName} (${school.city})`
  return school.shortName
}

// 오늘 날짜 YYYYMMDD
export function todayYMD() {
  const d = new Date()
  return fmtDateYMD(d)
}

// 날짜 범위 생성 (평일만)
export function getWeekdays(startDate, endDate) {
  const days = []
  const current = new Date(startDate)
  const end     = new Date(endDate)
  while (current <= end) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      days.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
  }
  return days
}
