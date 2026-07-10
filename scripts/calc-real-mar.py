#!/usr/bin/env python3
"""
전국 2408개 고등학교의 최근 6개월 급식 데이터를 NEIS에서 가져와
실제 MAR(평균 영양소 적정 비율)을 계산하고 mockSchools.js를 업데이트합니다.
"""
import re, json, time, urllib.request, urllib.parse, os, math
from datetime import datetime, timedelta

NEIS_KEYS = [
    '3f24c3dc382741bbbc163fc82473623c',
    '90bef23c145e47349e3c5e186f56b336',
    'd143fea5002e4fc8a580a4ae3b322b67',
]
_ki = 0
def neis_key():
    global _ki; k = NEIS_KEYS[_ki % len(NEIS_KEYS)]; _ki += 1; return k

MOCK_FILE = '../src/data/mockSchools.js'
CHECKPOINT = 'mar_checkpoint.json'

# 영양 기준 (고등학생 1끼)
STANDARDS = {
    'energy': 850,
    'protein': 25,
    'iron': 5,
    'calcium': 300,
    'vitc': 35,
}

def parse_ntr(ntr_info):
    if not ntr_info:
        return {}
    result = {}
    for item in ntr_info.split('<br/>'):
        parts = item.split(' : ')
        if len(parts) != 2:
            continue
        k, v = parts[0].strip(), parts[1].strip()
        try:
            val = float(v)
            if '단백질' in k:   result['protein'] = val
            if '비타민C' in k:  result['vitc'] = val
            if '칼슘' in k:     result['calcium'] = val
            if '철' in k and '나트' not in k: result['iron'] = val
        except:
            pass
    return result

def parse_cal(cal_info):
    if not cal_info:
        return None
    m = re.search(r'[\d.]+', cal_info)
    return float(m.group()) if m else None

def calc_mar(meals_data):
    """급식 목록에서 MAR 계산"""
    if not meals_data:
        return None
    nars_sum = [0.0] * 5  # energy, protein, iron, calcium, vitc
    count = 0
    for meal in meals_data:
        e = meal.get('energy')
        p = meal.get('protein')
        ir = meal.get('iron')
        ca = meal.get('calcium')
        vc = meal.get('vitc')
        if e is None:
            continue
        nars_sum[0] += min(e / STANDARDS['energy'], 1.0)
        nars_sum[1] += min((p or 0) / STANDARDS['protein'], 1.0) if p else 0.5
        nars_sum[2] += min((ir or 0) / STANDARDS['iron'], 1.0) if ir else 0.5
        nars_sum[3] += min((ca or 0) / STANDARDS['calcium'], 1.0) if ca else 0.5
        nars_sum[4] += min((vc or 0) / STANDARDS['vitc'], 1.0) if vc else 0.5
        count += 1
    if count == 0:
        return None
    mar = sum(nars_sum) / (5 * count) * 100
    return round(mar, 1)

def fetch_meals(atpt, code, from_ymd, to_ymd):
    url = (f'https://open.neis.go.kr/hub/mealServiceDietInfo'
           f'?KEY={neis_key()}&Type=json'
           f'&ATPT_OFCDC_SC_CODE={atpt}&SD_SCHUL_CODE={code}'
           f'&MMEAL_SC_CODE=2&MLSV_FROM_YMD={from_ymd}&MLSV_TO_YMD={to_ymd}&pSize=200')
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            data = json.loads(resp.read())
        info = data.get('mealServiceDietInfo', [])
        if len(info) < 2:
            return []
        result_code = info[0].get('head', [{}]*2)[1].get('RESULT', {}).get('CODE', '')
        if result_code != 'INFO-000':
            return []
        rows = info[1].get('row', [])
        meals = []
        for r in rows:
            energy = parse_cal(r.get('CAL_INFO'))
            ntr = parse_ntr(r.get('NTR_INFO'))
            if energy:
                meals.append({'energy': energy, **ntr})
        return meals
    except:
        return []

# ── 날짜 범위 설정 (최근 6개월) ──────────────────────────────────────
today = datetime.now()
from_dt = today - timedelta(days=180)
FROM_YMD = from_dt.strftime('%Y%m%d')
TO_YMD   = today.strftime('%Y%m%d')

# ── mockSchools.js에서 학교 목록 파싱 ────────────────────────────────
print('mockSchools.js 파싱 중...')
with open(MOCK_FILE, 'r') as f:
    content = f.read()

# id, code, regionCode 추출
entries = re.findall(
    r'id:\s*"(HS\d+)",\s*code:\s*"([^"]+)".*?regionCode:\s*"([^"]+)"',
    content, re.DOTALL
)
schools = [{'id': id_, 'code': code, 'atpt': atpt} for id_, code, atpt in entries]
print(f'총 {len(schools)}개 학교')

# ── 체크포인트 로드 ────────────────────────────────────────────────────
checkpoint = {}
if os.path.exists(CHECKPOINT):
    with open(CHECKPOINT) as f:
        checkpoint = json.load(f)
    print(f'체크포인트 로드: {len(checkpoint)}개 기존 결과')

# ── MAR 계산 루프 ─────────────────────────────────────────────────────
total = len(schools)
done = 0
found = 0
errors = 0

for i, school in enumerate(schools):
    sid = school['id']

    if sid in checkpoint:
        done += 1
        if checkpoint[sid] is not None:
            found += 1
        continue

    meals = fetch_meals(school['atpt'], school['code'], FROM_YMD, TO_YMD)
    mar = calc_mar(meals)
    checkpoint[sid] = mar

    if mar is not None:
        found += 1
        status = f'MAR {mar}'
    else:
        errors += 1
        status = '데이터 없음'

    done += 1

    if done % 50 == 0 or i < 5:
        print(f'[{done}/{total}] {sid} ({school["atpt"]}/{school["code"]}) → {status} | 성공: {found} 실패: {errors}')

    # 체크포인트 저장 (100개마다)
    if done % 100 == 0:
        with open(CHECKPOINT, 'w') as f:
            json.dump(checkpoint, f)

    time.sleep(0.08)  # 3키 × 12.5req/s = 여유있게

# 최종 체크포인트 저장
with open(CHECKPOINT, 'w') as f:
    json.dump(checkpoint, f)

print(f'\n완료: {found}/{total}개 MAR 계산됨 ({errors}개 데이터 없음)')

# ── mockSchools.js 업데이트 ──────────────────────────────────────────
print('mockSchools.js MAR 업데이트 중...')
updated = 0

for school in schools:
    sid = school['id']
    mar = checkpoint.get(sid)
    if mar is None:
        continue

    # 해당 학교 블록 내 mar 값 교체
    # 패턴: id: "HSxxxx", ... scores: { mar: XX.X, ...
    pattern = rf'(id:\s*"{sid}".*?scores:\s*\{{[^}}]*?mar:\s*)[\d.]+'
    new_content = re.sub(pattern, rf'\g<1>{mar}', content, count=1, flags=re.DOTALL)
    if new_content != content:
        content = new_content
        updated += 1

with open(MOCK_FILE, 'w') as f:
    f.write(content)

print(f'완료: {updated}개 학교 MAR 실데이터로 교체')
print(f'체크포인트: {CHECKPOINT}')
