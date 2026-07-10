/**
 * 학교알리미 PAPS(학생건강체력평가) 데이터 수집 스크립트
 * POST /openApi.do, apiType=90
 * 시도×시군구×학교급 조합으로 전체 수집
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_KEY = 'ce5233d8c61d450197ffb827548cfac5'
const API_URL = 'https://www.schoolinfo.go.kr/openApi.do'
const PBAN_YR = 2025
const DELAY_MS = 300 // 초당 ~3req

// 시도코드 → 시군구코드 목록 (fill_coordinates.js에서 가져온 SGG_MAP 기반)
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

const SCHUL_KINDS = ['02', '03', '04'] // 초, 중, 고

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPaps(sidoCode, sggCode, schulKndCode) {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    apiType: '90',
    pbanYr: String(PBAN_YR),
    sidoCode,
    sggCode,
    schulKndCode,
  })
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(10000),
  })
  const data = await resp.json()
  if (data.resultCode !== 'success') return []
  return data.list || []
}

async function main() {
  const allRecords = [] // 원본 행 전체 (grade×gender 단위)
  const bySchool = {}  // SCHUL_CODE → 집계 결과

  const combos = []
  for (const [sido, sggs] of Object.entries(SIDO_SGG)) {
    for (const sgg of sggs) {
      for (const knd of SCHUL_KINDS) {
        combos.push({ sido, sgg, knd })
      }
    }
  }

  console.log(`총 ${combos.length}개 조합 요청 시작 (예상 ${Math.ceil(combos.length * DELAY_MS / 60000)}분)`)

  let done = 0
  let totalRecords = 0

  for (const { sido, sgg, knd } of combos) {
    try {
      const rows = await fetchPaps(sido, sgg, knd)
      totalRecords += rows.length

      for (const r of rows) {
        const code = r.SCHUL_CODE
        if (!bySchool[code]) {
          bySchool[code] = {
            schulCode: code,       // S010... 형식 (학교알리미 코드)
            schulNm: r.SCHUL_NM,
            schulKnd: r.SCHUL_KND_SC_CODE,
            region: r.ADRCD_NM,
            pbanYr: PBAN_YR,
            grades: {},
          }
        }
        const key = `${r.GRADE}_${r.SXDS_CODE}`
        bySchool[code].grades[key] = {
          grade: r.GRADE,
          sex: r.SXDS_CODE,
          // 심폐지구력
          cardio_shuttle: r.CPM_STMN_SHRUN_NMVL,
          cardio_run: r.MIN_SEC_LNRUN_TM2,
          // 유연성
          flex_sit: r.FLBT_BKRCH_NMVL,
          // 근력
          muscle_pushup: r.MUSED_PUS_NTS,
          muscle_situp: r.MUSED_CLUP_NTS,
          muscle_grip: r.MUSED_GRIP_NMVL,
          // 순발력
          power_50m: r.RFLX_FIF_METE_RAC_NMVL,
          power_jump: r.RFLX_SLJ_NMVL,
          // 비만
          bmi: r.BDFAT_BMI_NMVL,
          // 등급 분포
          grade1_pct: parseFloat(r.PER_1) || 0,
          grade2_pct: parseFloat(r.PER_2) || 0,
          grade3_pct: parseFloat(r.PER_3) || 0,
          grade4_pct: parseFloat(r.PER_4) || 0,
          grade5_pct: parseFloat(r.PER_5) || 0,
          tested: r.RATE_SUM,
        }
      }
    } catch (e) {
      // 무시 — 해당 조합 데이터 없음
    }

    done++
    if (done % 50 === 0) {
      process.stdout.write(`\r  [${done}/${combos.length}] 학교 ${Object.keys(bySchool).length}개 수집`)
    }
    await sleep(DELAY_MS)
  }

  console.log(`\n수집 완료: 학교 ${Object.keys(bySchool).length}개, 원본 행 ${totalRecords}개`)

  // mockSchools.js와 매칭: SCHUL_CODE(S01...) → mockSchools의 code 필드(7자리 숫자)
  // mockSchools code는 NEIS SD_SCHUL_CODE 형식이므로 별도 매핑 필요
  // paps 데이터를 이름 기준으로도 검색 가능하도록 저장
  const outData = Object.values(bySchool)
  const outPath = path.join(__dirname, '../data/papsData.json')
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2), 'utf-8')
  console.log(`저장: ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)}KB)`)

  // 학교명 → schulCode 인덱스도 저장 (매칭용)
  const nameIndex = {}
  for (const s of outData) {
    nameIndex[s.schulNm] = s.schulCode
  }
  const idxPath = path.join(__dirname, '../data/papsNameIndex.json')
  fs.writeFileSync(idxPath, JSON.stringify(nameIndex, null, 2), 'utf-8')
  console.log(`이름 인덱스: ${idxPath} (${Object.keys(nameIndex).length}개)`)
}

main().catch(console.error)
