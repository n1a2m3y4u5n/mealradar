import { mockSchools } from './mockSchools.js'
import { calcEfficiency } from '../utils/nutrition.js'

// 학교별 예산 상세 데이터
export const mockBudget = mockSchools.map(s => ({
  school_id: s.id,
  school_name: s.name,
  region: s.region,
  budget_per_student_per_day: s.budgetPerStudent,
  student_count: s.studentCount,
  annual_total: Math.round(s.budgetPerStudent * s.studentCount * 190 / 10000), // 만원
  efficiency: parseFloat(calcEfficiency(s.scores.mar, s.budgetPerStudent).toFixed(2)),
  mar: s.scores.mar,
  government_subsidy_rate: s.type === '직업계고' ? 0.85 : s.type === '특목고' || s.type === '자사고' ? 0.60 : 0.72,
  parent_contribution_rate: s.type === '직업계고' ? 0.15 : s.type === '특목고' || s.type === '자사고' ? 0.40 : 0.28,
  nutrition_cost_pct: 0.62 + (Math.sin(s.id.charCodeAt(2)) * 0.04),  // 식재료비 비율
  labor_cost_pct:     0.28 + (Math.cos(s.id.charCodeAt(3)) * 0.02),  // 인건비 비율
  overhead_pct:       0.10,
}))

// ─── budgetHistory / DiD 그룹 ──────────────────────────────────────
function _budgetRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}
const _br = _budgetRand(777)

export const budgetHistory = mockSchools.map(s => {
  const b2024 = s.budgetPerStudent
  const b2023 = Math.round(b2024 - 80 - _br() * 200)
  const b2022 = Math.round(b2023 - 60 - _br() * 180)
  return {
    school_id: s.id,
    history: [
      { year: 2022, budget_per_student: b2022, budget_total: b2022 * s.studentCount * 200 },
      { year: 2023, budget_per_student: b2023, budget_total: b2023 * s.studentCount * 200 },
      { year: 2024, budget_per_student: b2024, budget_total: b2024 * s.studentCount * 200 },
    ],
  }
})

export const treatmentGroup = budgetHistory
  .filter(b => b.history[2].budget_per_student >= b.history[1].budget_per_student * 1.10)
  .map(b => b.school_id)

export const controlGroup = budgetHistory
  .filter(b => {
    const r = b.history[2].budget_per_student / b.history[1].budget_per_student
    return r >= 0.98 && r < 1.03
  })
  .map(b => b.school_id)
  .slice(0, 60)

// 전국 예산 통계
export const budgetStats = {
  national_avg: Math.round(mockBudget.reduce((s, b) => s + b.budget_per_student_per_day, 0) / mockBudget.length),
  min: Math.min(...mockBudget.map(b => b.budget_per_student_per_day)),
  max: Math.max(...mockBudget.map(b => b.budget_per_student_per_day)),
  top10_threshold: (() => {
    const sorted = [...mockBudget].sort((a, b) => b.efficiency - a.efficiency)
    return sorted[9]?.efficiency || 14
  })(),
  bottom10_threshold: (() => {
    const sorted = [...mockBudget].sort((a, b) => a.efficiency - b.efficiency)
    return sorted[9]?.efficiency || 11
  })(),
}
