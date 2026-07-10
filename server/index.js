import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { parse as parseDotenv } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'
// dotenv v17 config()가 ANTHROPIC_API_KEY를 누락하는 버그 우회 — parse 후 직접 inject
try {
  const envPath = new URL('../.env', import.meta.url).pathname
  const parsed = parseDotenv(readFileSync(envPath, 'utf8'))
  Object.entries(parsed).forEach(([k, v]) => { if (!process.env[k]) process.env[k] = v })
} catch { /* .env 없으면 무시 */ }

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

// 프로덕션: 빌드된 React 앱 serve
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
}

const NEIS_KEYS = [
  process.env.NEIS_API_KEY  || '3f24c3dc382741bbbc163fc82473623c',
  process.env.NEIS_API_KEY2 || '90bef23c145e47349e3c5e186f56b336',
  process.env.NEIS_API_KEY3 || 'd143fea5002e4fc8a580a4ae3b322b67',
  process.env.NEIS_API_KEY4 || '0405582e2e9d4840b4ae1aa8fc4a0e39',
].filter(Boolean)
let _keyIdx = 0
const nextNeisKey = () => { const k = NEIS_KEYS[_keyIdx % NEIS_KEYS.length]; _keyIdx++; return k }
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── NEIS 영양정보 파싱 ──────────────────────────────────────────────
function parseNtrInfo(ntrInfo) {
  if (!ntrInfo) return {}
  const result = {}
  ntrInfo.split('<br/>').forEach(item => {
    const [key, val] = item.split(' : ')
    if (!key || !val) return
    const v = parseFloat(val)
    if (key.includes('단백질'))     result.protein_g   = v
    if (key.includes('비타민C'))    result.vitc_mg     = v
    if (key.includes('칼슘'))       result.calcium_mg  = v
    if (key.includes('철') && !key.includes('나')) result.iron_mg = v
    if (key.includes('나트륨'))     result.sodium_mg   = v
    if (key.includes('식이섬유') || key.includes('섬유')) result.fiber_g = v
  })
  return result
}

function parseCalInfo(calInfo) {
  if (!calInfo) return null
  const m = calInfo.match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

function parseNeisMeals(data, schoolId) {
  try {
    const info = data?.mealServiceDietInfo
    if (!info) return []
    const rows = info[1]?.row || []
    return rows
      .filter(r => r.MMEAL_SC_CODE === '2') // 중식만
      .map(r => {
        const menu = (r.DDISH_NM || '')
          .split('<br/>')
          .map(item => item.replace(/\([^)]*\)/g, '').trim()) // 알레르기 번호 제거
          .filter(Boolean)
        const energy_kcal = parseCalInfo(r.CAL_INFO) || 700
        const extraNtr = parseNtrInfo(r.NTR_INFO)
        const dateStr = r.MLSV_YMD // YYYYMMDD
        const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        return {
          school_id: schoolId,
          date,
          menu,
          source: 'neis',
          nutrients: {
            energy_kcal,
            protein_g:  extraNtr.protein_g  ?? Math.round(energy_kcal * 0.04),
            iron_mg:    extraNtr.iron_mg    ?? Math.round(energy_kcal * 0.005 * 10) / 10,
            calcium_mg: extraNtr.calcium_mg ?? Math.round(energy_kcal * 0.42),
            vitc_mg:    extraNtr.vitc_mg    ?? Math.round(energy_kcal * 0.04),
            sodium_mg:  extraNtr.sodium_mg  ?? Math.round(energy_kcal * 2.5),
            fiber_g:    extraNtr.fiber_g    ?? Math.round(energy_kcal * 0.007 * 10) / 10,
          },
          scores: { is_anomaly: false, anomaly_score: 0 },
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

// ── GET /api/neis/meals/:atptCode/:schoolCode ──────────────────────
app.get('/api/neis/meals/:atptCode/:schoolCode', async (req, res) => {
  const { atptCode, schoolCode } = req.params
  const today = new Date()
  const from = new Date(today); from.setMonth(from.getMonth() - 6)
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '')
  const toStr = fmt(today), fromStr = fmt(from)

  try {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${nextNeisKey()}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&MMEAL_SC_CODE=2&MLSV_FROM_YMD=${fromStr}&MLSV_TO_YMD=${toStr}&pSize=200`
    const resp = await fetch(url)
    const data = await resp.json()

    // NEIS 에러 응답 처리
    const result = data?.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT
    if (result?.CODE !== 'INFO-000') {
      return res.json({ success: false, error: result?.MESSAGE || 'NEIS API 오류', meals: [] })
    }

    const meals = parseNeisMeals(data, `${atptCode}_${schoolCode}`)
    res.json({ success: true, meals, count: meals.length, period: { from: fromStr, to: toStr } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, meals: [] })
  }
})

// ── POST /api/ai/persona ───────────────────────────────────────────
app.post('/api/ai/persona', async (req, res) => {
  const { schoolName, menu, nutrients, voteData, marScore, recentMenus } = req.body

  // 메뉴별 영양 기여도 계산
  const menuCount = menu?.length || 1
  const perItemKcal = Math.round((nutrients?.energy_kcal || 700) / menuCount)

  // 최근 자주 등장한 메뉴 분석
  const menuFreq = {}
  ;(recentMenus || []).flat().forEach(item => {
    menuFreq[item] = (menuFreq[item] || 0) + 1
  })
  const topMenus = Object.entries(menuFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, cnt]) => `${name}(${cnt}회)`)
    .join(', ')

  const prompt = `당신은 대한민국 학교급식 학생 경험 분석 전문가입니다. 실제 급식 데이터를 바탕으로 학생들의 반응을 구체적으로 분석해주세요.

## 분석 대상 학교: ${schoolName}

### 오늘 급식 메뉴 (${menu?.length || 0}가지)
${(menu || ['정보 없음']).map((item, i) => `${i + 1}. ${item} (추정 열량 기여: ~${perItemKcal}kcal)`).join('\n')}

### 영양 수치
- 총 열량: ${nutrients?.energy_kcal || '?'}kcal (기준 850kcal의 ${Math.round(((nutrients?.energy_kcal || 700) / 850) * 100)}%)
- 단백질: ${nutrients?.protein_g || '?'}g / 철분: ${nutrients?.iron_mg || '?'}mg / 칼슘: ${nutrients?.calcium_mg || '?'}mg
- MAR 점수: ${marScore} / 100 (전국 평균 약 67)

### 학생 투표
- 맛 ${voteData?.taste || '?'}/5, 양 ${voteData?.quantity || '?'}/5, 다양성 ${voteData?.variety || '?'}/5
- 주요 불만·칭찬: ${voteData?.top_keywords?.join(', ') || '없음'}

### 최근 30일 자주 나온 메뉴
${topMenus || '데이터 없음'}

## 요청 분석 항목

1. **학생 페르소나 3가지**: 이 급식에 실제로 어떻게 반응할 학생 유형을 구체적으로. 오늘 메뉴 중 특정 반찬을 언급하며 반응 묘사.

2. **메뉴별 학생 선호도**: 오늘 메뉴 각 항목에 대해 선호도(상/중/하)와 구체적 이유. 예: "홍어무침 → 하: 특유의 발효 냄새로 학생 거부감 높음"

3. **영양 관점 개선 제안**: 현재 MAR ${marScore}점 수준에서 가장 효과적인 메뉴 변경 2가지. 비용 효율성과 학생 선호도를 동시 고려.

4. **오늘 급식 먹은 학생 감정 3단어**: 솔직한 학생 반응.

JSON 형식으로만 응답:
{
  "personas": [{"name": "...", "desc": "오늘 메뉴 중 [특정 반찬]에 대해 구체적 반응 포함", "emoji": "..."}],
  "menuPreferences": [{"item": "메뉴명", "preference": "상|중|하", "reason": "구체적 이유"}],
  "improvements": [{"title": "개선명", "desc": "구체적 메뉴 변경 방안과 예상 효과"}],
  "emotionKeywords": ["단어1", "단어2", "단어3"]
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let result
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0])
      } catch {
        // JSON 불완전 시 각 필드 개별 추출
        const personasMatch = jsonMatch[0].match(/"personas"\s*:\s*(\[[\s\S]*?\])\s*,/)
        const menuPrefMatch = jsonMatch[0].match(/"menuPreferences"\s*:\s*(\[[\s\S]*?\])\s*,/)
        const improvMatch = jsonMatch[0].match(/"improvements"\s*:\s*(\[[\s\S]*?\])\s*,/)
        const kwMatch = jsonMatch[0].match(/"emotionKeywords"\s*:\s*(\[[\s\S]*?\])/)
        result = {
          personas: personasMatch ? JSON.parse(personasMatch[1]) : [],
          menuPreferences: menuPrefMatch ? JSON.parse(menuPrefMatch[1]) : [],
          improvements: improvMatch ? JSON.parse(improvMatch[1]) : [],
          emotionKeywords: kwMatch ? JSON.parse(kwMatch[1]) : [],
        }
      }
    } else {
      result = { raw: text }
    }
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ai/assistant ─────────────────────────────────────────
// 영양교사 AI 어시스턴트: 학교 데이터 컨텍스트 + 자유 질문
app.post('/api/ai/assistant', async (req, res) => {
  const { school, meals, question, history = [] } = req.body

  const recentMenus = (meals || []).slice(-5).map(m =>
    `${m.date}: ${(m.menu || []).join(', ')} (에너지 ${m.nutrients?.energy_kcal || '?'}kcal, 철분 ${m.nutrients?.iron_mg || '?'}mg)`
  ).join('\n')

  const systemPrompt = `당신은 대한민국 학교급식 전문 영양교사 AI 어시스턴트입니다.
현재 분석 중인 학교: ${school?.name || '미지정'} (${school?.region || ''} ${school?.city || ''}, ${school?.type || ''})
학생 수: ${school?.studentCount || '?'}명 / 1인당 급식비: ${school?.budgetPerStudent || '?'}원 / 영양교사 상주: ${school?.hasNutritionTeacher ? '있음' : '없음'}

현재 영양 지표:
- MAR(영양소 적정섭취비): ${school?.scores?.mar?.toFixed(1) || '?'} / 100
- NRF(영양밀도지수): ${school?.scores?.nrf?.toFixed(1) || '?'}
- DDS(식품군 다양성): ${school?.scores?.dds?.toFixed(1) || '?'} / 5
- 철분 INQ: ${school?.scores?.inq_iron?.toFixed(2) || '?'} (1.0 = 기준 충족)
- 칼슘 INQ: ${school?.scores?.inq_calcium?.toFixed(2) || '?'}

최근 5일 급식:
${recentMenus || '데이터 없음'}

답변 원칙:
- 구체적 수치와 식품명 언급
- 실행 가능한 조언 (예산 범위 내)
- 전문적이지만 이해하기 쉽게
- 마크다운 형식 사용 (헤더, 불릿, 볼드 허용)`

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: question },
  ]

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: systemPrompt,
      messages,
    })
    res.json({ success: true, answer: message.content[0].text })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ai/taste-rank ───────────────────────────────────────
// 급식 맛 순위: 최근 N끼 메뉴를 학생 관점에서 랭킹
app.post('/api/ai/taste-rank', async (req, res) => {
  const { schoolName, meals } = req.body

  if (!meals || meals.length === 0) {
    return res.json({ success: false, error: '급식 데이터 없음' })
  }

  const mealList = meals.map((m, i) =>
    `${i + 1}. [${m.date}] ${(m.menu || []).join(' / ')}
   에너지 ${m.nutrients?.energy_kcal || '?'}kcal | 나트륨 ${m.nutrients?.sodium_mg || '?'}mg | 단백질 ${m.nutrients?.protein_g || '?'}g`
  ).join('\n\n')

  const prompt = `당신은 대한민국 중고등학교 학생들의 급식 취향을 가장 잘 아는 전문가입니다.

학교: ${schoolName}
분석 대상: 최근 ${meals.length}끼 급식

아래 급식 목록을 학생 선호도 기준으로 1위~${meals.length}위 순위를 매겨주세요.

평가 기준 (학생 관점):
- 고기·튀김류 포함 여부 (학생 선호 높음)
- 메뉴 조합의 매력도 (주메뉴+반찬 조화)
- 국물류 종류 (찌개 > 국 > 맑은국)
- 반복 메뉴 신선도 (자주 나오는 메뉴는 감점)
- 채소류 단독 구성 (낮은 선호)

급식 목록:
${mealList}

JSON 형식으로만 응답:
{
  "rankings": [
    {
      "rank": 1,
      "date": "YYYY-MM-DD",
      "menu": ["메뉴1", "메뉴2"],
      "score": 95,
      "highlight": "이 급식의 핵심 매력 한 줄",
      "studentReaction": "학생이 실제로 할 말 (구어체, 이모지 포함)",
      "pros": ["장점1", "장점2"],
      "cons": ["아쉬운 점"]
    }
  ],
  "worstMenu": "최하위 급식에서 학생들이 가장 싫어할 메뉴명",
  "bestCombo": "1위 급식이 인기인 핵심 이유 한 줄 요약"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].text
    // JSON 블록 추출 — 불완전한 JSON도 복구 시도
    let jsonStr = text.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr) return res.json({ success: false, error: 'JSON 파싱 실패' })
    // 불완전하게 잘린 경우 마지막 완성된 ranking까지만 사용
    try {
      const result = JSON.parse(jsonStr)
      res.json({ success: true, data: result })
    } catch {
      // rankings 배열만 부분 추출
      const rankingsMatch = jsonStr.match(/"rankings"\s*:\s*(\[[\s\S]*?\])(?=\s*,|\s*\})/)
      if (rankingsMatch) {
        try {
          const partial = JSON.parse(rankingsMatch[1])
          res.json({ success: true, data: { rankings: partial, bestCombo: '분석 완료', worstMenu: partial[partial.length-1]?.menu?.[0] || '-' } })
          return
        } catch {}
      }
      res.json({ success: false, error: '응답 파싱 실패 — 다시 시도해주세요' })
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ai/inequality ───────────────────────────────────────
// 지역별 영양 불평등 데이터 기반 AI 정책 제안
app.post('/api/ai/inequality', async (req, res) => {
  const { regionStats, nationalGap, topIssues } = req.body

  if (!regionStats?.length || !nationalGap) {
    return res.status(400).json({ success: false, error: '필수 데이터 누락' })
  }

  const fmt1 = (v) => (v != null ? Number(v).toFixed(1) : '?')
  const fmt0 = (v) => (v != null ? Number(v).toFixed(0) : '?')
  const fmtN = (v) => (v != null ? Number(v).toLocaleString() : '?')

  const statsText = [...regionStats]
    .sort((a, b) => (a.avgMAR ?? 0) - (b.avgMAR ?? 0))
    .map(r => `${r.region}: MAR ${fmt1(r.avgMAR)}, 예산 ${fmtN(r.avgBudget)}원/일, 영양교사 미배치 ${fmt0(r.noTeacherPct)}%`)
    .join('\n')

  const prompt = `당신은 대한민국 학교급식 정책 전문가입니다. 아래 공공데이터(NEIS 기반)를 분석하여 교육 영양 불평등 해소를 위한 구체적 정책을 제안하세요.

## 전국 17개 시도 영양 현황

${statsText}

## 핵심 격차 지표
- MAR 최대-최소 격차: ${fmt1(nationalGap.marGap)}점
- 예산 최대-최소 격차: ${fmtN(nationalGap.budgetGap)}원/일
- 영양교사 배치 학교 MAR vs 미배치 MAR 차이: +${fmt1(nationalGap.teacherEffect)}점
- 영양교사 전국 미배치율: ${fmt0(nationalGap.noTeacherPct)}%

## 주요 위기 지역
${topIssues.map(t => `- ${t.region}: ${t.issue}`).join('\n')}

## 요청 사항

다음 4가지 관점에서 구체적 정책 제안을 해주세요:

1. **즉시 시행 가능한 단기 정책 (1년 내)**: 예산 증액 없이 가능한 것 포함
2. **중기 구조 개선 (3~5년)**: 영양교사 배치, 예산 형평화 등
3. **데이터 기반 모니터링 체계**: 이 대시보드 같은 시스템 활용 방안
4. **기대 효과**: 정책 시행 시 MAR 개선 예측치와 수혜 학생 수

실제 현장에서 실행 가능한 구체적 수치와 방법론을 포함하세요. 마크다운 형식으로 응답.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    res.json({ success: true, answer: message.content[0].text })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── PAPS 체력검사 데이터 ─────────────────────────────────────────────
// 학교알리미 PAPS 실데이터 (fetch_paps.js + merge_paps.js 로 수집)
const _schoolsSrc = readFileSync(join(__dirname, '../src/data/mockSchools.js'), 'utf-8')
  .replace(/^export const mockSchools = /, '').replace(/;\s*$/, '')
const _schoolsList = JSON.parse(_schoolsSrc)

// 학교 코드 → { paps, mar } 인덱스
const papsIndex = Object.fromEntries(
  _schoolsList
    .filter(s => s.code && s.paps)
    .map(s => [s.code, { ...s.paps, mar: s.scores?.mar || 70 }])
)

function buildPapsRow(code) {
  const p = papsIndex[code]
  if (!p) return null
  return {
    source: 'real',
    grade1: p.grade1Pct,
    grade2: p.grade2Pct,
    grade3: p.grade3Pct,
    grade4: p.grade4Pct,
    grade5: p.grade5Pct,
    goodRate: Math.round((p.grade1Pct + p.grade2Pct) * 10) / 10,
    bmi: p.bmi,
    pbanYr: p.pbanYr,
  }
}

// GET /api/paps/bulk?codes=7010057,7011169,...  (bulk보다 먼저: 와일드카드 충돌 방지)
app.get('/api/paps/bulk', async (req, res) => {
  const codes = (req.query.codes || '').split(',').filter(Boolean)

  if (!codes.length) return res.status(400).json({ success: false, error: 'codes 파라미터 필요' })

  const slice = codes.slice(0, 2000)
  const results = []

  for (const code of slice) {
    const row = buildPapsRow(code)
    if (!row) continue
    results.push({ schoolCode: code, mar: papsIndex[code].mar, ...row })
  }

  // Pearson r 계산 (MAR vs goodRate)
  const n = results.length
  if (n > 1) {
    const xs = results.map(r => r.mar)
    const ys = results.map(r => r.goodRate)
    const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n
    const num  = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my), 0)
    const denX = Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2, 0))
    const denY = Math.sqrt(ys.reduce((s,y)=>s+(y-my)**2, 0))
    const r = denX && denY ? num/(denX*denY) : 0

    res.json({
      success: true,
      count: n,
      source: 'real',
      correlation: { r: Math.round(r*1000)/1000, r2: Math.round(r*r*1000)/1000 },
      data: results,
    })
  } else {
    res.json({ success: true, count: n, source: 'real', data: results })
  }
})

// GET /api/paps/:schoolCode
app.get('/api/paps/:schoolCode', async (req, res) => {
  const { schoolCode } = req.params
  const row = buildPapsRow(schoolCode)
  if (!row) return res.status(404).json({ success: false, error: '데이터 없음' })
  res.json({ success: true, schoolCode, mar: papsIndex[schoolCode].mar, ...row })
})

// SPA fallback — API 라우트 이외의 모든 요청을 index.html로 (Express 5 호환)
if (existsSync(distPath)) {
  app.use((req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`MealRadar API 서버 :${PORT}`)
})
