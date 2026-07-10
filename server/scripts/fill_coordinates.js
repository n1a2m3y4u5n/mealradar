#!/usr/bin/env node
// 학교알리미 API로 누락된 학교 좌표 채우기
// 실행: node server/scripts/fill_coordinates.js

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHOOLS_PATH = join(__dirname, '../../src/data/mockSchools.js')
const API_KEY = process.env.SCHOOLINFO_API_KEY || 'ce5233d8c61d450197ffb827548cfac5'

// NEIS regionCode → schoolinfo sidoCode
const SIDO_MAP = {
  B10: '11', C10: '21', D10: '22', E10: '23', F10: '24',
  G10: '25', H10: '26', I10: '29', J10: '31', K10: '42',
  M10: '43', N10: '44', P10: '45', Q10: '46', R10: '47',
  S10: '48', T10: '50', V10: '29',
}

// 시군구 코드 (schoolinfo sggCode)
const SGG_MAP = {
  // 서울(11)
  '종로구':'11110','중구_서울':'11140','용산구':'11170','성동구':'11200','광진구':'11215',
  '동대문구':'11230','중랑구':'11260','성북구':'11290','강북구':'11305','도봉구':'11320',
  '노원구':'11350','은평구':'11380','서대문구':'11410','마포구':'11440','양천구':'11470',
  '강서구_서울':'11500','구로구':'11530','금천구':'11545','영등포구':'11560','동작구':'11590',
  '관악구':'11620','서초구':'11650','강남구':'11680','송파구':'11710','강동구':'11740',
  // 부산(21)
  '중구_부산':'21010','서구_부산':'21020','동구_부산':'21030','영도구':'21040','부산진구':'21050',
  '동래구':'21060','남구_부산':'21070','북구_부산':'21080','해운대구':'21090','사하구':'21100',
  '금정구':'21110','강서구_부산':'21120','연제구':'21130','수영구':'21140','사상구':'21150',
  '기장군':'21310',
  // 대구(22)
  '중구_대구':'22010','동구_대구':'22020','서구_대구':'22030','남구_대구':'22040','북구_대구':'22050',
  '수성구':'22060','달서구':'22070','달성군':'22310','군위군':'22320',
  // 인천(23)
  '중구_인천':'23010','동구_인천':'23020','미추홀구':'23040','연수구':'23050','남동구':'23060',
  '부평구':'23070','계양구':'23080','서구_인천':'23090','강화군':'23310','옹진군':'23320',
  // 광주(24)
  '동구_광주':'24010','서구_광주':'24020','남구_광주':'24030','북구_광주':'24040','광산구':'24050',
  // 대전(25)
  '동구_대전':'25010','중구_대전':'25020','서구_대전':'25030','유성구':'25040','대덕구':'25050',
  // 울산(26)
  '중구_울산':'26010','남구_울산':'26020','동구_울산':'26030','북구_울산':'26040','울주군':'26310',
  // 세종(29)
  '세종':'29010','세종시':'29010',
  // 경기(31)
  '수원시장안구':'31010','수원시권선구':'31020','수원시팔달구':'31030','수원시영통구':'31040',
  '성남시수정구':'31050','성남시중원구':'31060','성남시분당구':'31070','의정부시':'31080',
  '안양시만안구':'31090','안양시동안구':'31100','부천시':'31110',
  '광명시':'31120','평택시':'31130','동두천시':'31140',
  '안산시상록구':'31150','안산시단원구':'31160',
  '고양시덕양구':'31170','고양시일산동구':'31180','고양시일산서구':'31190',
  '과천시':'31200','구리시':'31210','남양주시':'31220','오산시':'31230','시흥시':'31240',
  '군포시':'31250','의왕시':'31260','하남시':'31270',
  '용인시처인구':'31280','용인시기흥구':'31290','용인시수지구':'31300',
  '파주시':'31310','이천시':'31320','안성시':'31330','김포시':'31340','화성시':'31350',
  '광주시':'31360','양주시':'31370','포천시':'31380','여주시':'31390',
  '연천군':'31410','가평군':'31420','양평군':'31430',
  // 강원(42)
  '춘천시':'42110','원주시':'42130','강릉시':'42150','동해시':'42170','태백시':'42190',
  '속초시':'42210','삼척시':'42230','홍천군':'42720','횡성군':'42730','영월군':'42750',
  '평창군':'42760','정선군':'42770','철원군':'42780','화천군':'42790','양구군':'42800',
  '인제군':'42810','고성군_강원':'42820','양양군':'42830',
  // 충북(43)
  '청주시상당구':'43110','청주시서원구':'43111','청주시흥덕구':'43112','청주시청원구':'43113',
  '충주시':'43130','제천시':'43150','보은군':'43720','옥천군':'43730','영동군':'43740',
  '증평군':'43745','진천군':'43750','괴산군':'43760','음성군':'43770','단양군':'43800',
  '청주시':'43110',
  // 충남(44)
  '천안시동남구':'44130','천안시서북구':'44131','공주시':'44150','보령시':'44180',
  '아산시':'44200','서산시':'44210','논산시':'44230','계룡시':'44250','당진시':'44270',
  '금산군':'44710','부여군':'44760','서천군':'44770','청양군':'44790','홍성군':'44800',
  '예산군':'44810','태안군':'44825',
  // 전북(45)
  '전주시완산구':'45110','전주시덕진구':'45111','군산시':'45130','익산시':'45140',
  '정읍시':'45180','남원시':'45190','김제시':'45210',
  '완주군':'45710','진안군':'45720','무주군':'45730','장수군':'45740','임실군':'45750',
  '순창군':'45770','고창군':'45790','부안군':'45800',
  // 전남(46)
  '목포시':'46110','여수시':'46130','순천시':'46150','나주시':'46170','광양시':'46230',
  '담양군':'46710','곡성군':'46720','구례군':'46730','고흥군':'46770','보성군':'46780',
  '화순군':'46790','장흥군':'46800','강진군':'46810','해남군':'46820','영암군':'46830',
  '무안군':'46840','함평군':'46860','영광군':'46870','장성군':'46880','완도군':'46890',
  '진도군':'46900','신안군':'46910',
  // 경북(47)
  '포항시남구':'47110','포항시북구':'47111','경주시':'47130','김천시':'47150',
  '안동시':'47170','구미시':'47190','영주시':'47210','영천시':'47230','상주시':'47250',
  '문경시':'47280','경산시':'47290','군위군_경북':'47720','의성군':'47730','청송군':'47740',
  '영양군':'47750','영덕군':'47760','청도군':'47770','고령군':'47780','성주군':'47790',
  '칠곡군':'47800','예천군':'47820','봉화군':'47830','울진군':'47840','울릉군':'47850',
  '포항시':'47110',
  // 경남(48)
  '창원시의창구':'48120','창원시성산구':'48121','창원시마산합포구':'48122',
  '창원시마산회원구':'48123','창원시진해구':'48124',
  '진주시':'48170','통영시':'48220','사천시':'48240','김해시':'48250','밀양시':'48270',
  '거제시':'48310','양산시':'48330',
  '의령군':'48720','함안군':'48730','창녕군':'48740','고성군_경남':'48750',
  '남해군':'48770','하동군':'48780','산청군':'48790','함양군':'48800','거창군':'48810',
  '합천군':'48820',
  // 제주(50)
  '제주시':'50110','서귀포시':'50130',
}

// regionCode + cityName → sggCode 해석 (지역별 동명 구 구분)
const REGION_CITY_SGG = {
  B10: { '중구':'11140','서구':null,'동구':null,'남구':null,'북구':null,'강서구':'11500' },
  C10: { '중구':'21010','서구':'21020','동구':'21030','남구':'21070','북구':'21080','강서구':'21120' },
  D10: { '중구':'22010','서구':'22030','동구':'22020','남구':'22040','북구':'22050' },
  E10: { '중구':'23010','동구':'23020','서구':'23090' },
  F10: { '동구':'24010','서구':'24020','남구':'24030','북구':'24040' },
  G10: { '동구':'25010','중구':'25020','서구':'25030' },
  H10: { '중구':'26010','남구':'26020','동구':'26030','북구':'26040' },
}

function getSggCode(regionCode, cityName) {
  const sidoCode = SIDO_MAP[regionCode]
  if (!sidoCode) return null

  // 동명 구 구분 (서울 강서구 vs 부산 강서구 등)
  const overrides = REGION_CITY_SGG[regionCode]
  if (overrides && overrides[cityName] !== undefined) return overrides[cityName]

  // 직접 매핑 시도 (고유 지명)
  if (SGG_MAP[cityName]) return SGG_MAP[cityName]

  // sidoCode 접두어 결합 시도 (시군구 이름 변형)
  for (const [key, code] of Object.entries(SGG_MAP)) {
    const baseName = key.replace(/_.*/, '') // _서울 등 접미사 제거
    if (baseName === cityName && code.startsWith(sidoCode)) return code
  }

  return null
}

async function fetchSchools(sidoCode, sggCode, schulKndCode = '04') {
  const url = `https://www.schoolinfo.go.kr/openApi.do?apiKey=${API_KEY}&apiType=0&sidoCode=${sidoCode}&sggCode=${sggCode}&schulKndCode=${schulKndCode}`
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await resp.json()
    if (data.resultCode !== 'success') return []
    return data.list || []
  } catch {
    return []
  }
}

async function main() {
  // mockSchools 읽기
  const raw = readFileSync(SCHOOLS_PATH, 'utf8')
  const match = raw.match(/export const mockSchools = (\[[\s\S]*\])/)
  if (!match) { console.error('mockSchools parse 실패'); process.exit(1) }
  const schools = eval(match[1])

  const noCoord = schools.filter(s => !s.lat || !s.lng)
  console.log(`좌표 없는 학교: ${noCoord.length}개`)

  // 고유 (regionCode, city) 쌍 목록
  const targets = [...new Set(noCoord.map(s => `${s.regionCode}|${s.city}`))]
  console.log(`조회할 지역+구 조합: ${targets.length}개`)

  // 지역+구 → 학교목록 캐시
  const coordLookup = new Map() // `schoolName|regionCode` → {lat, lng}
  let apiCalls = 0, found = 0, notFound = 0

  for (const target of targets) {
    const [regionCode, city] = target.split('|')
    const sidoCode = SIDO_MAP[regionCode]
    if (!sidoCode) { console.log(`  sidoCode 없음: ${regionCode}`); notFound++; continue }

    const sggCode = getSggCode(regionCode, city)
    if (!sggCode) { console.log(`  sggCode 없음: ${regionCode} ${city}`); notFound++; continue }

    process.stdout.write(`  [${++apiCalls}] ${regionCode}(${sidoCode}) ${city}(${sggCode})... `)

    const list = await fetchSchools(sidoCode, sggCode, '04')
    if (list.length) {
      list.forEach(s => {
        if (s.SCHUL_NM && s.LTTUD && s.LGTUD) {
          coordLookup.set(`${s.SCHUL_NM}|${regionCode}`, {
            lat: parseFloat(s.LTTUD),
            lng: parseFloat(s.LGTUD),
          })
        }
      })
      console.log(`✓ ${list.length}개교`)
      found++
    } else {
      console.log('✗ 결과없음')
      notFound++
    }

    await new Promise(r => setTimeout(r, 150)) // rate limit
  }

  console.log(`\n좌표 조회 완료: ${found}/${targets.length} 지역, ${coordLookup.size}개교 매핑`)

  // mockSchools 업데이트
  let filled = 0, stillMissing = 0
  schools.forEach(s => {
    if (s.lat && s.lng) return
    const key = `${s.name}|${s.regionCode}`
    const coord = coordLookup.get(key)
    if (coord) {
      s.lat = coord.lat
      s.lng = coord.lng
      filled++
    } else {
      stillMissing++
    }
  })

  console.log(`\n좌표 추가: ${filled}개 / 여전히 누락: ${stillMissing}개`)

  // 중복 제거 (동일 이름+동일 좌표)
  const seen = new Map()
  const deduped = schools.filter(s => {
    const key = `${s.name}|${s.lat?.toFixed(4)}|${s.lng?.toFixed(4)}`
    if (seen.has(key)) return false
    seen.set(key, true)
    return true
  })
  const removed = schools.length - deduped.length
  console.log(`중복 제거: ${removed}개 → 최종 ${deduped.length}개교`)

  // 개교예정 학교 제거 (code가 빈 문자열)
  const cleaned = deduped.filter(s => s.code && s.code.trim())
  console.log(`개교예정 제거: ${deduped.length - cleaned.length}개 → 최종 ${cleaned.length}개교`)

  // 파일 저장
  const newContent = raw.replace(
    /export const mockSchools = \[[\s\S]*\]/,
    'export const mockSchools = ' + JSON.stringify(cleaned, null, 2)
  )
  writeFileSync(SCHOOLS_PATH, newContent, 'utf8')
  console.log(`\nmockSchools.js 저장 완료`)
}

main().catch(console.error)
