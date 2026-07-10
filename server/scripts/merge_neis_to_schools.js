/**
 * NEIS 실 영양 데이터 → mockSchools.js nutrients/scores 교체
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const STANDARDS = {
  energy_kcal: 850, protein_g: 25, iron_mg: 5, calcium_mg: 300, vitc_mg: 35,
}

function calcMAR(n) {
  const keys = Object.keys(STANDARDS)
  const nars = keys.map(k => Math.min((n[k] || 0) / STANDARDS[k], 1.0))
  return Math.round((nars.reduce((a, b) => a + b, 0) / nars.length) * 1000) / 10
}

function calcNRF(n) {
  const e = n.energy_kcal || 1
  const inqs = ['protein_g','iron_mg','calcium_mg','vitc_mg']
    .map(k => ((n[k] || 0) / STANDARDS[k]) / (e / STANDARDS.energy_kcal))
  return Math.round(inqs.reduce((a, b) => a + b, 0) / inqs.length * 100) / 10
}

function calcINQ(actual, std, energy, eStd = 850) {
  const nd = actual / std
  const ed = energy / eStd
  return ed ? Math.round(nd / ed * 100) / 100 : 0
}

const src = fs.readFileSync(path.join(__dirname, '../../src/data/mockSchools.js'), 'utf-8')
const json = src.replace(/^export const mockSchools = /, '').replace(/;\s*$/, '')
const schools = JSON.parse(json)

const neis = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/neisNutrition.json'), 'utf-8'))

let updated = 0
for (const s of schools) {
  const n = neis[s.code]
  if (!n) continue

  const nutrients = {
    energy_kcal: n.energy_kcal ?? s.nutrients?.energy_kcal,
    protein_g:   n.protein_g   ?? s.nutrients?.protein_g,
    iron_mg:     n.iron_mg     ?? s.nutrients?.iron_mg,
    calcium_mg:  n.calcium_mg  ?? s.nutrients?.calcium_mg,
    vitc_mg:     n.vitc_mg     ?? s.nutrients?.vitc_mg,
    sodium_mg:   n.sodium_mg   ?? s.nutrients?.sodium_mg,
    fiber_g:     n.fiber_g     ?? s.nutrients?.fiber_g,
  }
  // null 제거
  for (const k of Object.keys(nutrients)) {
    if (nutrients[k] == null) delete nutrients[k]
  }

  const e = nutrients.energy_kcal || 850
  const mar = calcMAR(nutrients)
  s.nutrients = nutrients
  s.scores = {
    ...s.scores,
    mar,
    nrf:          calcNRF(nutrients),
    inq_iron:     calcINQ(nutrients.iron_mg || 0, 5, e),
    inq_calcium:  calcINQ(nutrients.calcium_mg || 0, 300, e),
    inq_energy:   Math.round((e / 850) * 100) / 100,
    efficiency:   Math.round(mar * 10 / (s.budgetPerStudent / 100) * 100) / 100,
  }
  updated++
}

const out = `export const mockSchools = ${JSON.stringify(schools, null, 2)};\n`
fs.writeFileSync(path.join(__dirname, '../../src/data/mockSchools.js'), out)
console.log(`업데이트: ${updated}개 / 전체: ${schools.length}개`)
console.log(`저장 완료`)
