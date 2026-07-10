// 교육부 고등학생 1끼 영양 권장 기준
export const STANDARDS = {
  energy_kcal: { min: 850,  max: 1050, unit: 'kcal', label: '에너지' },
  protein_g:   { min: 25,   max: null, unit: 'g',    label: '단백질' },
  iron_mg:     { min: 5,    max: null, unit: 'mg',   label: '철분' },
  calcium_mg:  { min: 300,  max: null, unit: 'mg',   label: '칼슘' },
  vitc_mg:     { min: 35,   max: null, unit: 'mg',   label: '비타민C' },
  sodium_mg:   { min: null, max: 2000, unit: 'mg',   label: '나트륨' },
  fiber_g:     { min: 6,    max: null, unit: 'g',    label: '식이섬유' },
}

// 성별/학년별 권장 섭취량 조정 계수
export const GENDER_ADJUST = {
  male:   { energy_kcal: 1.0, protein_g: 1.1, iron_mg: 1.0, calcium_mg: 1.0, vitc_mg: 1.0 },
  female: { energy_kcal: 0.88, protein_g: 0.9, iron_mg: 1.3, calcium_mg: 1.0, vitc_mg: 1.0 },
}

export const GRADE_ADJUST = {
  1: 1.0,
  2: 1.02,
  3: 0.98,
}

// NAR: 영양소 적정 비율 (0~1, 1 이상은 1로 클리핑) - MAR 계산용
export function calcNAR(actual, standard) {
  if (!standard.min) return 1.0
  const nar = actual / standard.min
  return Math.min(nar, 1.0)
}

// NAR 표시용: 100% 초과도 그대로 반환
export function calcNARRaw(actual, standard) {
  if (!standard.min) return null
  return actual / standard.min
}

// MAR: 평균 영양소 적정 비율 × 100
export function calcMAR(nutrients) {
  const keys = ['energy_kcal', 'protein_g', 'iron_mg', 'calcium_mg', 'vitc_mg']
  const nars = keys.map(k => {
    const std = STANDARDS[k]
    if (!std) return 1
    return calcNAR(nutrients[k] || 0, std)
  })
  return (nars.reduce((a, b) => a + b, 0) / nars.length) * 100
}

// INQ: 영양 질 지수 (nutrientDensity / energyDensity)
export function calcINQ(nutrientActual, nutrientStandard, energyActual, energyStandard = 850) {
  const nd = nutrientActual / nutrientStandard
  const ed = energyActual / energyStandard
  if (ed === 0) return 0
  return nd / ed
}

// NRF: Nutrient Rich Foods Index (합산 INQ에서 나트륨 패널티 제외)
export function calcNRF(nutrients) {
  const e = nutrients.energy_kcal || 1
  const positive = [
    calcINQ(nutrients.protein_g || 0, 25, e),
    calcINQ(nutrients.iron_mg || 0, 5, e),
    calcINQ(nutrients.calcium_mg || 0, 300, e),
    calcINQ(nutrients.vitc_mg || 0, 35, e),
    calcINQ(nutrients.fiber_g || 0, 6, e),
  ]
  const naNa = (nutrients.sodium_mg || 0) / 2000
  const penalty = Math.max(0, naNa - 1) * 0.5
  return (positive.reduce((a, b) => a + b, 0) / positive.length) * 100 - penalty * 10
}

// DDS: 식이 다양성 점수 (식품군 개수 기반, 0~5)
const FOOD_GROUPS = {
  grain:   ['밥', '면', '빵', '떡', '쌀', '보리', '잡곡', '현미'],
  protein: ['고기', '육', '닭', '돼지', '소고기', '생선', '어', '두부', '콩', '달걀', '계란', '새우', '게'],
  veggie:  ['나물', '무침', '채소', '시금치', '콩나물', '배추', '브로콜리', '당근', '호박', '버섯', '상추', '열무'],
  dairy:   ['우유', '치즈', '요구르트', '요거트'],
  fruit:   ['과일', '사과', '배', '바나나', '귤', '오렌지', '포도'],
}

export function calcDDS(menuItems) {
  const found = new Set()
  menuItems.forEach(item => {
    for (const [group, keywords] of Object.entries(FOOD_GROUPS)) {
      if (keywords.some(kw => item.includes(kw))) found.add(group)
    }
  })
  return found.size
}

// 효율 지수 = MAR × 10 / (예산 / 100)
export function calcEfficiency(mar, budgetPerStudent) {
  if (!budgetPerStudent) return 0
  return (mar * 10) / (budgetPerStudent / 100)
}

// 이상치 판별 (Z-score)
export function detectAnomaly(value, mean, std) {
  if (std === 0) return { zscore: 0, isAnomaly: false }
  const zscore = Math.abs((value - mean) / std)
  return { zscore: parseFloat(zscore.toFixed(2)), isAnomaly: zscore > 2.5 }
}

// 계절 판별
export function getSeason(month) {
  if ([3, 4, 5].includes(month))  return 'spring'
  if ([6, 7, 8].includes(month))  return 'summer'
  if ([9, 10, 11].includes(month)) return 'fall'
  return 'winter'
}

export const SEASON_LABELS = {
  spring: { ko: '봄', icon: '🌸', months: [3, 4, 5] },
  summer: { ko: '여름', icon: '☀️', months: [6, 7, 8] },
  fall:   { ko: '가을', icon: '🍂', months: [9, 10, 11] },
  winter: { ko: '겨울', icon: '❄️', months: [12, 1, 2] },
}

// MAR → 색상 등급
export function marColor(mar) {
  if (mar < 55) return 'var(--rose)'
  if (mar < 70) return 'var(--amber)'
  return 'var(--emerald)'
}

// MAR → 배지 클래스
export function marBadgeClass(mar) {
  if (mar < 55) return 'badge-rose'
  if (mar < 70) return 'badge-amber'
  return 'badge-emerald'
}

// 영양소 한글명
export const NUTRIENT_LABELS = {
  energy_kcal: '에너지',
  protein_g:   '단백질',
  iron_mg:     '철분',
  calcium_mg:  '칼슘',
  vitc_mg:     '비타민C',
  sodium_mg:   '나트륨',
  fiber_g:     '식이섬유',
}

// 결핍 보충 식품 가이드
export const SUPPLEMENT_GUIDE = {
  iron_mg: [
    { food: '시금치나물 1접시', amount: 2.7, unit: 'mg' },
    { food: '두부 반모(150g)', amount: 2.4, unit: 'mg' },
    { food: '소고기 불고기 1인분', amount: 3.2, unit: 'mg' },
  ],
  calcium_mg: [
    { food: '우유 1잔(200ml)', amount: 220, unit: 'mg' },
    { food: '멸치볶음 1접시', amount: 180, unit: 'mg' },
    { food: '두부 한모(300g)', amount: 240, unit: 'mg' },
  ],
  vitc_mg: [
    { food: '오렌지 1개', amount: 48, unit: 'mg' },
    { food: '브로콜리 1컵', amount: 51, unit: 'mg' },
    { food: '피망볶음 1접시', amount: 60, unit: 'mg' },
  ],
  protein_g: [
    { food: '계란 2개', amount: 12, unit: 'g' },
    { food: '닭가슴살 100g', amount: 23, unit: 'g' },
    { food: '두유 1팩(190ml)', amount: 7, unit: 'g' },
  ],
}
