/**
 * 학교알리미 apiType=52 — 졸업생 진로 현황 수집
 * TOTAL1~TOTAL8 컬럼 의미 (학교알리미 공시 기준):
 *   1: 대학교   2: 전문대학   3: 해외대학
 *   4: 취업     5: 군입대     6: 기타진학
 *   7: 미상     8: 기타
 * TOT_SUM: 졸업생 수,  TOT_SUM_RATE: 진학+취업 합산률
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_KEY = process.env.SCHOOLINFO_API_KEY || ''
const PBAN_YR = 2024  // 2025 공시 미완 → 2024
const DELAY_MS = 100

const SIDO_SGG = {
  '11': ['11110','11140','11170','11200','11215','11230','11260','11290','11305','11320','11350','11380','11410','11440','11470','11500','11530','11545','11560','11590','11620','11650','11680','11710','11740'],
  '26': ['26110','26140','26170','26200','26230','26260','26290','26320','26350','26380','26410','26440','26470','26500','26530','26710','26720'],
  '27': ['27110','27140','27170','27200','27230','27260','27290','27710','27720'],
  '28': ['28110','28140','28177','28185','28200','28237','28245','28260','28710','28720'],
  '29': ['29110','29140','29155','29170','29200','29710'],
  '30': ['30110','30140','30170','30200','30230','30710'],
  '31': ['31110','31140','31170','31200','31710'],
  '36': ['36110'],
  '41': ['41110','41130','41150','41170','41190','41210','41220','41250','41270','41280','41290','41310','41360','41370','41390','41410','41430','41450','41460','41480','41500','41550','41570','41590','41610','41630','41650','41670','41710','41720','41730','41820','41830'],
  '43': ['43110','43130','43150','43720','43730','43740','43745','43750','43760','43770','43800','43820','43830'],
  '44': ['44130','44150','44180','44200','44210','44230','44250','44270','44710','44720','44730','44750','44760','44770','44790','44800','44810'],
  '46': ['46110','46130','46150','46170','46710','46720','46730','46740','46750','46760','46770','46780','46790','46800','46810','46820','46830','46840','46860','46880','46890','46900','46910'],
  '47': ['47110','47130','47150','47170','47190','47210','47220','47230','47250','47280','47290','47720','47730','47740','47745','47750','47760','47770','47780','47790','47820','47830','47840','47850','47900','47920','47930'],
  '48': ['48120','48170','48220','48240','48250','48270','48310','48330','48360','48380','48390','48410','48420','48440','48720','48730','48740','48820','48840','48850','48860','48870','48880'],
  '50': ['50110','50130','50230'],
  '51': ['51110','51130','51150','51170','51190','51210','51230','51720','51730','51740','51750','51760','51770','51780','51820','51830','51840','51850'],
  '52': ['52110','52130','52140','52180','52190','52210','52230','52710','52720','52730','52740','52750','52760','52770','52780','52790','52800'],
}

const OUT_PATH = path.join(__dirname, '../data/graduationData.json')
const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8')) : {}
console.log(`기존: ${Object.keys(existing).length}개`)

async function fetch_sgg(sidoCode, sggCode) {
  const params = new URLSearchParams({
    apiKey: API_KEY, apiType: '52', pbanYr: String(PBAN_YR),
    sidoCode, sggCode, schulKndCode: '04',
  })
  const resp = await fetch('https://www.schoolinfo.go.kr/openApi.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(8000),
  })
  const d = await resp.json()
  if (d.resultCode !== 'success') return []
  return d.list || []
}

async function main() {
  const combos = []
  for (const [sido, sggs] of Object.entries(SIDO_SGG)) {
    for (const sgg of sggs) combos.push({ sido, sgg })
  }

  // 이미 수집된 sggCode 스킵
  const doneSgg = new Set(
    Object.values(existing).filter(Boolean).map(v => v._sgg).filter(Boolean)
  )
  const todo = combos.filter(c => !doneSgg.has(c.sgg))
  console.log(`수집 대상: ${todo.length}개 시군구`)

  let done = 0
  for (const { sido, sgg } of todo) {
    try {
      const rows = await fetch_sgg(sido, sgg)
      for (const r of rows) {
        const tot = parseInt(r.TOT_SUM) || 0
        if (tot === 0) continue
        existing[r.SCHUL_CODE] = {
          _sgg: sgg,
          schulNm: r.SCHUL_NM,
          hsKnd: r.HS_KND_SC_NM,
          graduates: tot,
          // 진학률
          univ_rate:    parseFloat(r.TOTAL_RATE1) || 0,  // 대학교
          college_rate: parseFloat(r.TOTAL_RATE2) || 0,  // 전문대
          overseas_rate:parseFloat(r.TOTAL_RATE3) || 0,  // 해외대
          work_rate:    parseFloat(r.TOTAL_RATE4) || 0,  // 취업
          total_rate:   parseFloat(r.TOT_SUM_RATE) || 0, // 진학+취업 합산
          // 4년제 대학 + 전문대 합산
          higher_edu_rate: (parseFloat(r.TOTAL_RATE1) || 0) + (parseFloat(r.TOTAL_RATE2) || 0),
        }
      }
    } catch { /* 무시 */ }

    done++
    if (done % 30 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))
      process.stdout.write(`\r  [${done}/${todo.length}] 학교 ${Object.keys(existing).length}개`)
    }
    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))
  const valid = Object.values(existing).filter(Boolean)
  console.log(`\n완료: ${valid.length}개 학교`)
  console.log(`저장: ${OUT_PATH}`)
}

main().catch(console.error)
