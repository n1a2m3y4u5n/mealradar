/**
 * 실제 NEIS 급식 영양소 ↔ PAPS 체력 상관관계 분석
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 데이터 로드
let src = fs.readFileSync(path.join(__dirname, '../../src/data/mockSchools.js'), 'utf-8')
src = src.replace(/^export const mockSchools = /, '').replace(/;\s*$/, '')
const schools = JSON.parse(src)

const neisData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/neisNutrition.json'), 'utf-8'))

// NEIS + PAPS 모두 있는 학교만
const valid = schools.filter(s =>
  s.code &&
  neisData[s.code] != null &&
  s.paps?.fitnessScore != null &&
  s.paps?.bmi != null
)
console.log(`분석 대상: ${valid.length}개 (NEIS✓ + PAPS✓)`)
console.log(`  - NEIS만: ${schools.filter(s=>s.code&&neisData[s.code]!=null).length}개`)
console.log(`  - PAPS만: ${schools.filter(s=>s.paps?.fitnessScore!=null).length}개`)
console.log()

// ── 피어슨 상관계수 ─────────────────────────────────────────────────
function pearson(xs, ys) {
  const n = xs.length
  if (n < 10) return null
  const mx = xs.reduce((a,b)=>a+b,0)/n
  const my = ys.reduce((a,b)=>a+b,0)/n
  let num=0, dx=0, dy=0
  for (let i=0;i<n;i++) {
    const ex=xs[i]-mx, ey=ys[i]-my
    num+=ex*ey; dx+=ex*ex; dy+=ey*ey
  }
  return (dx===0||dy===0) ? null : num/Math.sqrt(dx*dy)
}

function get(s, key) {
  if (key.startsWith('neis.'))  return neisData[s.code]?.[key.slice(5)]
  if (key.startsWith('paps.'))  return s.paps?.[key.slice(5)]
  return s[key]
}

function pairs(data, xKey, yKey) {
  const xs=[], ys=[]
  for (const s of data) {
    const x=get(s,xKey), y=get(s,yKey)
    if (x!=null && y!=null && isFinite(x) && isFinite(y)) { xs.push(x); ys.push(y) }
  }
  return {xs, ys, n:xs.length}
}

const NUTRITION_VARS = [
  { key: 'neis.energy_kcal', label: '에너지(kcal)' },
  { key: 'neis.protein_g',   label: '단백질(g)' },
  { key: 'neis.iron_mg',     label: '철분(mg)' },
  { key: 'neis.calcium_mg',  label: '칼슘(mg)' },
  { key: 'neis.vitc_mg',     label: '비타민C(mg)' },
  { key: 'neis.sodium_mg',   label: '나트륨(mg)' },
  { key: 'neis.fiber_g',     label: '식이섬유(g)' },
  { key: 'budgetPerStudent', label: '1인 급식비(원)' },
]
const PAPS_VARS = [
  { key: 'paps.fitnessScore', label: '1등급%' },
  { key: 'paps.grade5Pct',   label: '5등급%' },
  { key: 'paps.bmi',         label: 'BMI' },
]

function formatR(r) {
  if (r==null) return '    N/A'
  const s = r.toFixed(3)
  if (Math.abs(r)>=0.5) return `★${s}`
  if (Math.abs(r)>=0.3) return `·${s}`
  return ` ${s}`
}

function printTable(data, title) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  ${title}  (n=${data.length})`)
  console.log('═'.repeat(70))
  console.log(`${'영양 변수'.padEnd(18)} ${'1등급%'.padStart(8)} ${'5등급%'.padStart(8)} ${'BMI'.padStart(8)}  n`)
  console.log('─'.repeat(70))
  for (const nv of NUTRITION_VARS) {
    const cors = PAPS_VARS.map(pv => {
      const {xs,ys,n} = pairs(data, nv.key, pv.key)
      return {r: pearson(xs,ys), n}
    })
    const cols = cors.map(c => formatR(c.r).padStart(8)).join(' ')
    console.log(`${nv.label.padEnd(18)} ${cols}  ${cors[0].n}`)
  }
  console.log('─'.repeat(70))
  console.log('★ |r|≥0.5 강상관  · |r|≥0.3 중상관  (-)=역상관')
}

// ── 전체 ─────────────────────────────────────────────────────────────
printTable(valid, '전체 (고등학교)')

// ── 학교 유형별 ───────────────────────────────────────────────────────
for (const type of ['일반고', '직업계고', '자율고', '특목고']) {
  const sub = valid.filter(s => s.type === type)
  if (sub.length >= 30) printTable(sub, type)
}

// ── 지역별 ───────────────────────────────────────────────────────────
const regions = [...new Set(valid.map(s=>s.region))]
console.log('\n\n★ 지역별 평균 (n≥20인 지역)\n')
console.log(`${'지역'.padEnd(8)} ${'n'.padStart(4)} ${'에너지'.padStart(7)} ${'칼슘'.padStart(6)} ${'철분'.padStart(6)} ${'1등급%'.padStart(7)} ${'BMI'.padStart(6)}`)
console.log('─'.repeat(50))
for (const r of regions.sort()) {
  const sub = valid.filter(s=>s.region===r)
  if (sub.length < 20) continue
  const avg = key => {
    const vals = sub.map(s=>get(s,key)).filter(v=>v!=null&&isFinite(v))
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '-'
  }
  console.log(`${r.padEnd(8)} ${String(sub.length).padStart(4)} ${avg('neis.energy_kcal').padStart(7)} ${avg('neis.calcium_mg').padStart(6)} ${avg('neis.iron_mg').padStart(6)} ${avg('paps.fitnessScore').padStart(7)} ${avg('paps.bmi').padStart(6)}`)
}

// ── 급식비 분위 ───────────────────────────────────────────────────────
console.log('\n\n★ 1인 급식비 분위별\n')
const withB = valid.filter(s=>s.budgetPerStudent>0).sort((a,b)=>a.budgetPerStudent-b.budgetPerStudent)
const q = Math.floor(withB.length/4)
const qlabels = ['Q1 최저','Q2','Q3','Q4 최고']
for (let i=0;i<4;i++) {
  const g = withB.slice(i*q, i===3 ? withB.length : (i+1)*q)
  const avg = key => { const v=g.map(s=>get(s,key)).filter(v=>v!=null&&isFinite(v)); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):'-' }
  console.log(`  ${qlabels[i].padEnd(8)} 급식비 ${avg('budgetPerStudent')}원  에너지 ${avg('neis.energy_kcal')}kcal  칼슘 ${avg('neis.calcium_mg')}mg  1등급% ${avg('paps.fitnessScore')}  BMI ${avg('paps.bmi')}  (n=${g.length})`)
}

// ── 주요 발견 ─────────────────────────────────────────────────────────
console.log('\n\n★ 주요 발견 (|r| ≥ 0.1)\n')
const findings = []
for (const nv of NUTRITION_VARS) {
  for (const pv of PAPS_VARS) {
    const {xs,ys,n} = pairs(valid, nv.key, pv.key)
    const r = pearson(xs,ys)
    if (r!=null && Math.abs(r)>=0.1) findings.push({nutLabel:nv.label, papsLabel:pv.label, r, n})
  }
}
findings.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r))
for (const f of findings) {
  const bar = '█'.repeat(Math.round(Math.abs(f.r)*20))
  const dir = f.r>0?'↑(정상관)':'↓(역상관)'
  console.log(`  ${f.nutLabel.padEnd(14)} ↔ ${f.papsLabel.padEnd(8)}  r=${f.r.toFixed(3)} ${dir}  ${bar}  (n=${f.n})`)
}

console.log('\n분석 완료\n')
