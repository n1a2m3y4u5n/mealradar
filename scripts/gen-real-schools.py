#!/usr/bin/env python3
"""
NEIS에서 전국 고등학교 전체를 가져와 mockSchools.js를 새로 생성합니다.
"""
import re, json, time, math, urllib.request, urllib.parse, random, os

NEIS_KEYS = os.environ.get('NEIS_API_KEYS', '').split(',')
_ki = 0
def neis_key():
    global _ki
    k = NEIS_KEYS[_ki % len(NEIS_KEYS)]; _ki += 1; return k

ATPT_MAP = {
    'B10': '서울', 'C10': '부산', 'D10': '대구', 'E10': '인천',
    'F10': '광주', 'G10': '대전', 'H10': '울산', 'I10': '세종',
    'J10': '경기', 'K10': '강원', 'M10': '충북', 'N10': '충남',
    'P10': '전북', 'Q10': '전남', 'R10': '경북', 'S10': '경남', 'T10': '제주',
}

# 지역별 예산 범위 (원/일)
BUDGET_RANGE = {
    '서울': (5500, 7800), '부산': (4800, 6800), '대구': (4600, 6500),
    '인천': (4800, 6600), '광주': (4200, 6000), '대전': (4500, 6200),
    '울산': (4800, 6500), '세종': (4500, 6000), '경기': (5000, 7200),
    '강원': (3800, 5500), '충북': (3900, 5600), '충남': (3800, 5500),
    '전북': (3700, 5400), '전남': (3500, 5200), '경북': (3800, 5500),
    '경남': (4000, 5800), '제주': (4200, 6000),
}

# 학교 유형 매핑
TYPE_MAP = {
    '일반고': '일반고', '자율고': '자율고', '특목고': '특목고',
    '특성화고': '직업계고', '직업계고': '직업계고', '자사고': '자사고',
    '마이스터고': '직업계고',
}

# 학교 유형별 MAR 분포 오프셋
TYPE_MAR_OFFSET = {
    '자사고': 15, '특목고': 12, '일반고': 3, '자율고': 5,
    '직업계고': -8,
}

def lcg_rand(seed):
    s = seed & 0xffffffff
    results = []
    for _ in range(20):
        s = (s * 1664525 + 1013904223) & 0xffffffff
        results.append(s / 0xffffffff)
    return results

def extract_city(addr, region):
    """주소에서 시군구 추출"""
    if not addr:
        return region
    # "서울특별시 강동구 ..." → "강동구"
    # "경기도 수원시 장안구 ..." → "수원시"
    # "전라남도 고흥군 ..." → "고흥군"
    parts = addr.strip().split()
    if len(parts) >= 2:
        # 두 번째 단어가 시/군/구면 반환
        city = parts[1]
        if any(city.endswith(s) for s in ['시', '군', '구']):
            return city
        # 세 번째 단어 시도
        if len(parts) >= 3:
            city = parts[2]
            if any(city.endswith(s) for s in ['시', '군', '구']):
                return city
    return region

def make_school_data(idx, school_info):
    atpt = school_info['ATPT_OFCDC_SC_CODE']
    region = ATPT_MAP.get(atpt, '기타')
    code = school_info['SD_SCHUL_CODE']
    name = school_info['SCHUL_NM']
    addr = school_info.get('ORG_RDNMA', '')
    city = extract_city(addr, region)

    hs_type_raw = school_info.get('HS_SC_NM') or school_info.get('SCHUL_KND_SC_NM', '일반고')
    school_type = TYPE_MAP.get(hs_type_raw, '일반고')

    # 시드 기반 결정론적 난수
    seed = int(code) if code.isdigit() else sum(ord(c) * (i+1) for i, c in enumerate(code))
    rng = lcg_rand(seed)

    # 예산
    bmin, bmax = BUDGET_RANGE.get(region, (4000, 6000))
    budget = int(round((bmin + rng[0] * (bmax - bmin)) / 10) * 10)

    # MAR
    base_mar = 48 + rng[1] * 34  # 48~82
    type_offset = TYPE_MAR_OFFSET.get(school_type, 0)
    budget_factor = (budget - 4500) / 1000 * 2.3
    mar = round(min(95, max(35, base_mar + type_offset + budget_factor + rng[2] * 6 - 3)), 1)

    # 나머지 지표
    nrf = round(mar * 0.64 + rng[3] * 4, 1)
    dds = round(1.8 + mar / 40 + rng[4] * 0.6, 1)
    dds = min(5.0, max(1.5, dds))
    inq_iron     = round(0.3 + mar / 200 + rng[5] * 0.15, 2)
    inq_calcium  = round(0.4 + mar / 180 + rng[6] * 0.15, 2)
    inq_energy   = round(0.55 + mar / 250 + rng[7] * 0.12, 2)
    efficiency   = round(mar * 10 / (budget / 100), 2)

    # 학생 수
    student_count = int(150 + rng[8] * 950)
    has_nutrition = rng[9] > 0.45

    # 영양소
    energy = round(550 + mar * 3.5 + rng[10] * 80)
    protein = round(20 + mar * 0.22 + rng[11] * 8, 1)
    iron = round(1.5 + mar * 0.03 + rng[12] * 1.2, 1)
    calcium = round(200 + mar * 2.4 + rng[13] * 60)
    vitc = round(20 + mar * 0.4 + rng[14] * 20)
    sodium = round(1400 + (100 - mar) * 4 + rng[15] * 200)
    fiber = round(2.8 + mar * 0.04 + rng[16] * 1.2, 1)

    # 연속 미달일
    iron_streak = max(0, int((60 - mar) * 0.4 + rng[17] * 8)) if mar < 70 else int(rng[17] * 3)
    cal_streak  = max(0, int((65 - mar) * 0.25 + rng[18] * 5)) if mar < 70 else int(rng[18] * 2)

    # 투표
    taste    = round(1.8 + mar / 28 + rng[0] * 0.8, 1)
    quantity = round(1.5 + mar / 32 + rng[1] * 0.8, 1)
    variety  = round(1.6 + mar / 30 + rng[2] * 0.8, 1)
    overall  = round((taste + quantity + variety) / 3, 1)
    taste    = min(5.0, max(1.0, taste))
    quantity = min(5.0, max(1.0, quantity))
    variety  = min(5.0, max(1.0, variety))
    overall  = min(5.0, max(1.0, overall))

    kw_bad  = ['부족해요', '맛없어요', '양이 적어요', '채소만', '개선 필요', '배고파요']
    kw_mid  = ['그럭저럭', '보통이에요', '가끔 맛있어요', '그냥 먹어요']
    kw_good = ['맛있어요', '만족해요', '다양해요', '영양 좋아요', '오늘 맛있다']
    kw_pool = kw_bad if mar < 58 else (kw_mid if mar < 72 else kw_good)
    keywords = [kw_pool[int(rng[i] * len(kw_pool)) % len(kw_pool)] for i in range(3, 7)]
    keywords = list(dict.fromkeys(keywords))[:4]

    # monthly_mar
    months = ['2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02',
              '2025-03', '2025-04', '2025-05']
    monthly = {}
    for i, m in enumerate(months):
        v = mar + (rng[(i*3) % 20] - 0.5) * 6
        monthly[m] = round(min(95, max(30, v)), 1)

    # 이상치 (MAR 낮은 학교만)
    anomalies = []
    if mar < 65 and iron_streak > 5:
        anomalies.append({
            'date': f'2024-{10 + int(rng[4]*2):02d}-{3 + int(rng[5]*20):02d}',
            'type': 'critical' if iron_streak > 15 else 'warning',
            'nutrient': 'iron_mg',
            'value': round(iron * 0.45, 1),
            'zscore': round(2.5 + rng[6] * 1.5, 1),
            'label': '철분 부족'
        })
    if mar < 60 and cal_streak > 3:
        anomalies.append({
            'date': f'2024-{9 + int(rng[7]*3):02d}-{1 + int(rng[8]*25):02d}',
            'type': 'critical' if mar < 50 else 'warning',
            'nutrient': 'energy_kcal',
            'value': round(energy * 0.62),
            'zscore': round(2.8 + rng[9] * 1.2, 1),
            'label': '저칼로리 이상'
        })

    # 계절별
    def seasonal_val(base, amp, idx):
        return round(base * (1 + amp * math.sin(idx * math.pi / 2) * 0.08), 1)

    seasonal = {
        'spring': {'energy': round(energy*1.04), 'iron': round(iron*1.1,1), 'calcium': round(calcium*1.05), 'dds': round(dds*1.08,1)},
        'summer': {'energy': round(energy*0.93), 'iron': round(iron*0.88,1), 'calcium': round(calcium*0.94), 'dds': round(dds*0.90,1)},
        'fall':   {'energy': round(energy*1.01), 'iron': round(iron*1.04,1), 'calcium': round(calcium*1.01), 'dds': round(dds*1.02,1)},
        'winter': {'energy': round(energy*0.90), 'iron': round(iron*0.84,1), 'calcium': round(calcium*0.91), 'dds': round(dds*0.88,1)},
    }

    school_id = f'HS{idx+1:04d}'
    short_name = name.replace('고등학교', '고').replace('특성화', '').replace('과학기술', '과기')[:8]

    return {
        'id': school_id,
        'code': code,
        'name': name,
        'shortName': short_name,
        'region': region,
        'regionCode': atpt,
        'city': city,
        'type': school_type,
        'studentCount': student_count,
        'hasNutritionTeacher': has_nutrition,
        'budgetPerStudent': budget,
        'scores': {'mar': mar, 'nrf': nrf, 'dds': dds,
                   'inq_iron': inq_iron, 'inq_calcium': inq_calcium,
                   'inq_energy': inq_energy, 'efficiency': efficiency},
        'streaks': {'iron_deficit_days': iron_streak, 'calorie_deficit_days': cal_streak,
                    'last_perfect_day': '2025-04-15'},
        'nutrients': {'energy_kcal': energy, 'protein_g': protein, 'iron_mg': iron,
                      'calcium_mg': calcium, 'vitc_mg': vitc, 'sodium_mg': sodium,
                      'fiber_g': fiber},
        'vote': {'total': int(student_count * 5.2), 'taste': taste, 'quantity': quantity,
                 'variety': variety, 'overall': overall, 'top_keywords': keywords},
        'anomalies': anomalies,
        'allergens_today': [int(rng[10]*14)+1, int(rng[11]*14)+1],
        'monthly_mar': monthly,
        'seasonal': seasonal,
    }

# ── NEIS 학교 목록 전체 수집 ────────────────────────────────────────
def fetch_all_schools():
    schools = []
    page = 1
    while True:
        url = (f'https://open.neis.go.kr/hub/schoolInfo'
               f'?KEY={neis_key()}&Type=json&SCHUL_KND_SC_NM=%EA%B3%A0%EB%93%B1%ED%95%99%EA%B5%90'
               f'&pSize=1000&pIndex={page}')
        print(f'  페이지 {page} 요청 중...', end=' ')
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            print(f'오류: {e}')
            break

        info = data.get('schoolInfo', [])
        if len(info) < 2:
            print('완료')
            break
        result_code = info[0].get('head', [{}]*2)[1].get('RESULT', {}).get('CODE', '')
        if result_code != 'INFO-000':
            print('API 종료')
            break

        rows = info[1].get('row', [])
        print(f'{len(rows)}개 수신 (누계: {len(schools)+len(rows)})')
        schools.extend(rows)

        if len(rows) < 1000:
            break
        page += 1
        time.sleep(0.3)

    return schools

print('NEIS 고등학교 목록 수집 시작...')
raw_schools = fetch_all_schools()
print(f'\n총 {len(raw_schools)}개 고등학교 수집 완료')

# ── JS 파일 생성 ────────────────────────────────────────────────────
print('mockSchools.js 생성 중...')

js_schools = []
for idx, raw in enumerate(raw_schools):
    try:
        data = make_school_data(idx, raw)
        js_schools.append(data)
    except Exception as e:
        pass  # 파싱 실패 학교 스킵

def to_js_val(v, indent=0):
    pad = '  ' * indent
    if isinstance(v, dict):
        # 하이픈·숫자 시작 키는 따옴표로 감싸야 함
        def fmt_key(k):
            if re.match(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$', str(k)):
                return k
            return f'"{k}"'
        items = ', '.join(f'{fmt_key(k)}: {to_js_val(val)}' for k, val in v.items())
        return '{ ' + items + ' }'
    elif isinstance(v, list):
        if not v:
            return '[]'
        items = ', '.join(to_js_val(i) for i in v)
        return '[' + items + ']'
    elif isinstance(v, bool):
        return 'true' if v else 'false'
    elif isinstance(v, str):
        return f'"{v}"'
    elif isinstance(v, float):
        return str(v)
    elif isinstance(v, int):
        return str(v)
    return str(v)

lines = ['export const mockSchools = [']
for i, s in enumerate(js_schools):
    comma = ',' if i < len(js_schools)-1 else ''
    parts = []
    for k, v in s.items():
        parts.append(f'    {k}: {to_js_val(v)}')
    block = '  {\n' + ',\n'.join(parts) + '\n  }' + comma
    lines.append(block)
lines.append(']')

out_path = '../src/data/mockSchools.js'
with open(out_path, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f'완료: {len(js_schools)}개 학교 → mockSchools.js')
print(f'파일 크기: {len(open(out_path).read())//1024}KB')

# 지역별 통계
from collections import Counter
regions = Counter(s['region'] for s in js_schools)
for r, cnt in sorted(regions.items(), key=lambda x: -x[1]):
    print(f'  {r}: {cnt}개')
