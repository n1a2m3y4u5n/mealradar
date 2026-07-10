/**
 * papsData.json + mockSchools.js 매칭 → paps 필드 추가
 * 매칭 방식: 학교명 일치 (exact match 우선, 없으면 접두사/접미사 보정)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// mockSchools.js 파싱 (export const 형식)
const mockPath = path.join(__dirname, '../../src/data/mockSchools.js')
let mockSrc = fs.readFileSync(mockPath, 'utf-8')
// trailing comma 허용하는 JSON 파싱
const jsonStr = mockSrc
  .replace(/^export const mockSchools = /, '')
  .replace(/;\s*$/, '')
const mockSchools = JSON.parse(jsonStr)

// paps 데이터 로드
const papsData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../data/papsData.json'), 'utf-8'
))
const papsNameIndex = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../data/papsNameIndex.json'), 'utf-8'
))

// schulCode → paps 맵
const papsByCode = {}
for (const s of papsData) {
  papsByCode[s.schulCode] = s
}

// 학교명 정규화 (검색용)
function normalize(name) {
  return name.replace(/\s+/g, '').replace(/학교$/, '')
}

// paps 데이터에서 학년 평균 요약 계산
function summarize(papsSchool) {
  const gradeEntries = Object.values(papsSchool.grades)
  if (!gradeEntries.length) return null

  const avg = (key) => {
    const vals = gradeEntries.map(g => g[key]).filter(v => v != null && v !== '' && !isNaN(Number(v)))
    if (!vals.length) return null
    return Math.round((vals.reduce((a, b) => a + Number(b), 0) / vals.length) * 10) / 10
  }

  return {
    pbanYr: papsSchool.pbanYr,
    // 등급 분포 평균 (%)
    grade1Pct: avg('grade1_pct'),  // 상위 20% (80~100점)
    grade2Pct: avg('grade2_pct'),
    grade3Pct: avg('grade3_pct'),
    grade4Pct: avg('grade4_pct'),
    grade5Pct: avg('grade5_pct'),  // 하위 20% (0~19점)
    // 체력 측정 평균
    bmi: avg('bmi'),
    cardioShuttle: avg('cardio_shuttle'),
    powerJump: avg('power_jump'),
    // 종합 점수: 1등급 비율 (높을수록 좋음)
    fitnessScore: avg('grade1_pct'),
    // 원본 상세 데이터 (학년별)
    gradeDetail: papsSchool.grades,
  }
}

// 매칭 시도
let matched = 0
let unmatched = 0
const unmatchedNames = []

for (const school of mockSchools) {
  const name = school.name  // 예: "가락고등학교"

  // 1) 정확 매칭
  let schulCode = papsNameIndex[name]

  // 2) 지역명 접두사 추가 시도 (서울, 부산 등)
  if (!schulCode && school.region) {
    const withRegion = school.region + name
    schulCode = papsNameIndex[withRegion]
  }

  // 3) 정규화 매칭 (공백 제거)
  if (!schulCode) {
    const normTarget = normalize(name)
    for (const [papsName, code] of Object.entries(papsNameIndex)) {
      if (normalize(papsName) === normTarget) {
        schulCode = code
        break
      }
    }
  }

  // 4) 지역명 접두사 제거 매칭 (인천운남고 → 운남고, 서울중앙고 → 중앙고)
  const SIDO_PREFIXES = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','충북','충남','전남','경북','경남','제주','강원','전북']
  if (!schulCode) {
    for (const prefix of SIDO_PREFIXES) {
      if (name.startsWith(prefix)) {
        const stripped = name.slice(prefix.length)
        schulCode = papsNameIndex[stripped]
        if (schulCode) break
      }
    }
  }

  if (schulCode && papsByCode[schulCode]) {
    const summary = summarize(papsByCode[schulCode])
    if (summary) {
      school.paps = summary
      matched++
    } else {
      unmatched++
      unmatchedNames.push(name)
    }
  } else {
    unmatched++
    unmatchedNames.push(name)
  }
}

console.log(`매칭 완료: ${matched}개 성공 / ${unmatched}개 미매칭`)
console.log(`미매칭 샘플:`, unmatchedNames.slice(0, 10))

// mockSchools.js 덮어쓰기
const output = `export const mockSchools = ${JSON.stringify(mockSchools, null, 2)};\n`
fs.writeFileSync(mockPath, output, 'utf-8')
console.log(`mockSchools.js 저장 완료 (${Math.round(fs.statSync(mockPath).size / 1024)}KB)`)
