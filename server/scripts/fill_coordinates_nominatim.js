#!/usr/bin/env node
// Nominatim (OSM)으로 남은 학교 좌표 채우기
// 실행: node server/scripts/fill_coordinates_nominatim.js

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHOOLS_PATH = join(__dirname, '../../src/data/mockSchools.js')

async function geocode(name, city) {
  const q = encodeURIComponent(`${name} ${city}`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=kr`
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'MealRadar/1.0 (school-geocoder)' },
      signal: AbortSignal.timeout(6000),
    })
    const data = await resp.json()
    if (data.length > 0 && data[0].type === 'school') {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    // type이 school이 아니어도 첫 번째 결과 사용 (학교명이 명확할 때)
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const raw = readFileSync(SCHOOLS_PATH, 'utf8')
  const match = raw.match(/export const mockSchools = (\[[\s\S]*\])/)
  if (!match) { console.error('mockSchools parse 실패'); process.exit(1) }
  const schools = eval(match[1])

  const noCoord = schools.filter(s => !s.lat || !s.lng)
  console.log(`좌표 없는 학교: ${noCoord.length}개`)
  console.log(`Nominatim 1req/s 제한 → 예상 소요: ~${Math.ceil(noCoord.length / 60)}분`)

  let filled = 0, failed = 0

  for (let i = 0; i < noCoord.length; i++) {
    const s = noCoord[i]
    const result = await geocode(s.name, s.region)
    if (result) {
      s.lat = result.lat
      s.lng = result.lng
      filled++
      if (filled % 20 === 0) process.stdout.write(`  [${i+1}/${noCoord.length}] ✓ ${filled}개 완료\n`)
    } else {
      failed++
    }
    // Nominatim 정책: 최대 1 req/s
    await new Promise(r => setTimeout(r, 1100))
  }

  console.log(`\n완료: ${filled}개 채움 / ${failed}개 실패`)

  const newContent = raw.replace(
    /export const mockSchools = \[[\s\S]*\]/,
    'export const mockSchools = ' + JSON.stringify(schools, null, 2)
  )
  writeFileSync(SCHOOLS_PATH, newContent, 'utf8')
  console.log('mockSchools.js 저장 완료')
}

main().catch(console.error)
