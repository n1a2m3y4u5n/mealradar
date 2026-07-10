/**
 * NEIS API로 전국 고교 1년치 급식 영양 데이터 배치 수집
 * 학교당 1 API 호출 (pSize=200, 최근 1년)
 * 3개 키 라운드로빈 → 하루 3000건 처리 가능
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const NEIS_KEYS = [
  '3f24c3dc382741bbbc163fc82473623c',
  '90bef23c145e47349e3c5e186f56b336',
  'd143fea5002e4fc8a580a4ae3b322b67',
  '0405582e2e9d4840b4ae1aa8fc4a0e39',
]
let keyIdx = 0
const nextKey = () => { const k = NEIS_KEYS[keyIdx % NEIS_KEYS.length]; keyIdx++; return k }

const DELAY_MS = 120  // 초당 ~8req (키 3개 합산 여유있게)
const NEIS_BASE = 'https://open.neis.go.kr/hub'

// 최근 1년 날짜 범위
const today = new Date()
const from  = new Date(today); from.setFullYear(from.getFullYear() - 1)
const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'')
const FROM_YMD = fmt(from)
const TO_YMD   = fmt(today)

// mockSchools.js 파싱
let src = fs.readFileSync(path.join(__dirname, '../../src/data/mockSchools.js'), 'utf-8')
src = src.replace(/^export const mockSchools = /, '').replace(/;\s*$/, '')
const schools = JSON.parse(src)

// 체크포인트: 이미 수집된 결과 로드 (중단 후 재시작 지원)
const OUT_PATH = path.join(__dirname, '../data/neisNutrition.json')
const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')) : {}
console.log(`기존 수집: ${Object.keys(existing).length}개`)

// ── 영양정보 파싱 ────────────────────────────────────────────────────
function parseNtrInfo(ntrInfo) {
  if (!ntrInfo) return {}
  const result = {}
  ntrInfo.split('<br/>').forEach(item => {
    const [key, val] = item.split(' : ')
    if (!key || !val) return
    const v = parseFloat(val)
    if (isNaN(v)) return
    if (key.includes('단백질'))                      result.protein_g   = v
    if (key.includes('비타민C'))                     result.vitc_mg     = v
    if (key.includes('칼슘'))                        result.calcium_mg  = v
    if (key.includes('철') && !key.includes('나'))   result.iron_mg     = v
    if (key.includes('나트륨'))                      result.sodium_mg   = v
    if (key.includes('식이섬유') || key.includes('섬유')) result.fiber_g = v
  })
  return result
}

function parseCalInfo(calInfo) {
  if (!calInfo) return null
  const m = calInfo.match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

// ── 학교 1개 수집 ────────────────────────────────────────────────────
async function fetchSchool(atptCode, schoolCode) {
  const url = `${NEIS_BASE}/mealServiceDietInfo?` + new URLSearchParams({
    KEY: nextKey(),
    Type: 'json',
    ATPT_OFCDC_SC_CODE: atptCode,
    SD_SCHUL_CODE: schoolCode,
    MMEAL_SC_CODE: '2',  // 중식
    MLSV_FROM_YMD: FROM_YMD,
    MLSV_TO_YMD: TO_YMD,
    pSize: '200',
  })

  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const data = await resp.json()

  const result = data?.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT
  if (result?.CODE !== 'INFO-000') return null  // 데이터 없음

  const rows = data.mealServiceDietInfo?.[1]?.row || []
  if (!rows.length) return null

  // 날짜별 영양소 수집
  const meals = rows.map(r => ({
    energy: parseCalInfo(r.CAL_INFO),
    ...parseNtrInfo(r.NTR_INFO),
  })).filter(m => m.energy && m.energy > 0)

  if (!meals.length) return null

  // 학교 평균 산출
  const avg = key => {
    const vals = meals.map(m => m[key]).filter(v => v != null && !isNaN(v))
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
  }

  return {
    mealCount: meals.length,
    energy_kcal: avg('energy'),
    protein_g:   avg('protein_g'),
    iron_mg:     avg('iron_mg'),
    calcium_mg:  avg('calcium_mg'),
    vitc_mg:     avg('vitc_mg'),
    sodium_mg:   avg('sodium_mg'),
    fiber_g:     avg('fiber_g'),
  }
}

// ── 메인 ────────────────────────────────────────────────────────────
async function main() {
  // atptCode(시도교육청코드)가 필요 — mockSchools의 regionCode 필드 활용
  // regionCode: B10=서울, C10=부산, D10=대구, E10=인천, F10=광주, G10=대전,
  //             H10=울산, I10=세종, J10=경기, K10=충북, M10=충남, N10=전남,
  //             P10=경북, R10=경남, S10=제주, T10=강원, V10=전북
  const REGION_TO_ATPT = {
    B10: 'B10', C10: 'C10', D10: 'D10', E10: 'E10', F10: 'F10',
    G10: 'G10', H10: 'H10', I10: 'I10', J10: 'J10', K10: 'K10',
    M10: 'M10', N10: 'N10', P10: 'P10', R10: 'R10', S10: 'S10',
    T10: 'T10', V10: 'V10',
  }

  const todo = schools.filter(s =>
    s.code && s.regionCode && REGION_TO_ATPT[s.regionCode] && !existing[s.code]
  )

  console.log(`수집 대상: ${todo.length}개 / 전체: ${schools.length}개`)
  console.log(`기간: ${FROM_YMD} ~ ${TO_YMD}`)
  console.log(`예상 소요: ~${Math.ceil(todo.length * DELAY_MS / 60000)}분\n`)

  let done = 0, success = 0, fail = 0

  for (const school of todo) {
    const atptCode = REGION_TO_ATPT[school.regionCode]

    try {
      const result = await fetchSchool(atptCode, school.code)
      if (result) {
        existing[school.code] = { name: school.name, ...result }
        success++
      } else {
        existing[school.code] = null  // 데이터 없음으로 마킹 (재시도 방지)
        fail++
      }
    } catch {
      fail++
    }

    done++
    if (done % 50 === 0) {
      // 체크포인트 저장
      fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))
      process.stdout.write(`\r  [${done}/${todo.length}] 성공 ${success} / 데이터없음 ${fail}`)
    }
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  // 최종 저장
  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))

  const validCount = Object.values(existing).filter(v => v != null).length
  console.log(`\n\n수집 완료: 영양데이터 있음 ${validCount}개 / 없음 ${Object.keys(existing).length - validCount}개`)
  console.log(`저장: ${OUT_PATH}`)
}

main().catch(console.error)
