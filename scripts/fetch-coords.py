"""
NEIS schoolInfo API에서 학교 위도/경도 가져와 mockSchools.js에 추가
LA(위도), LO(경도) 필드 사용
"""
import re, json, time, os, urllib.request, urllib.parse

API_KEYS = os.environ.get('NEIS_API_KEYS', '').split(',')
BASE = 'https://open.neis.go.kr/hub/schoolInfo'
CKPT = '/Users/namyunsu/Downloads/mealradar/scripts/coords_checkpoint.json'
JS_FILE = '/Users/namyunsu/Downloads/mealradar/src/data/mockSchools.js'

# 체크포인트 로드
if os.path.exists(CKPT):
    with open(CKPT) as f:
        coords = json.load(f)
    print(f'체크포인트 로드: {len(coords)}개')
else:
    coords = {}

# mockSchools.js에서 code + regionCode 파싱
with open(JS_FILE) as f:
    content = f.read()

schools_raw = re.findall(
    r'id: "([^"]+)".*?code: "(\d+)".*?regionCode: "([^"]+)"',
    content, re.DOTALL
)
print(f'파싱된 학교: {len(schools_raw)}개')

ATPT_MAP = {
    'B10': '서울특별시', 'C10': '부산광역시', 'D10': '대구광역시',
    'E10': '인천광역시', 'F10': '광주광역시', 'G10': '대전광역시',
    'H10': '울산광역시', 'I10': '세종특별자치시', 'J10': '경기도',
    'K10': '강원특별자치도', 'M10': '충청북도', 'N10': '충청남도',
    'P10': '전라북도', 'Q10': '전라남도', 'R10': '경상북도',
    'S10': '경상남도', 'T10': '제주특별자치도',
}

key_idx = 0
updated = 0
failed = 0

for i, (school_id, code, region_code) in enumerate(schools_raw):
    if school_id in coords:
        continue

    key = API_KEYS[key_idx % len(API_KEYS)]
    key_idx += 1

    atpt_name = ATPT_MAP.get(region_code, '')
    params = urllib.parse.urlencode({
        'KEY': key,
        'Type': 'json',
        'pIndex': 1,
        'pSize': 1,
        'SD_SCHUL_CODE': code,
    })
    url = f'{BASE}?{params}'

    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            data = json.loads(r.read())

        rows = data.get('schoolInfo', [{}])[1].get('row', [])
        if rows:
            lat = rows[0].get('LA', '').strip()
            lng = rows[0].get('LO', '').strip()
            if lat and lng:
                coords[school_id] = {'lat': float(lat), 'lng': float(lng)}
                updated += 1
            else:
                failed += 1
        else:
            failed += 1
    except Exception as e:
        failed += 1

    if (i + 1) % 100 == 0:
        with open(CKPT, 'w') as f:
            json.dump(coords, f)
        print(f'[{i+1}/{len(schools_raw)}] 좌표 수집: {updated}개, 실패: {failed}개')

    time.sleep(0.05)

# 최종 저장
with open(CKPT, 'w') as f:
    json.dump(coords, f, indent=2)

print(f'\n완료: {updated}개 좌표 수집, {failed}개 실패')
print(f'체크포인트: {CKPT}')

# mockSchools.js 업데이트 - lat/lng 삽입
print('\nmockSchools.js 업데이트 중...')

def inject_coords(match):
    school_id = re.search(r'id: "([^"]+)"', match.group(0))
    if not school_id:
        return match.group(0)
    sid = school_id.group(1)
    if sid not in coords:
        return match.group(0)
    c = coords[sid]
    # 이미 lat/lng 있으면 스킵
    if 'lat:' in match.group(0):
        return match.group(0)
    # budgetPerStudent 뒤에 삽입
    return re.sub(
        r'(budgetPerStudent: \d+,)',
        f'\\1\n    lat: {c["lat"]}, lng: {c["lng"]},',
        match.group(0)
    )

# 각 학교 블록에 적용
new_content = re.sub(
    r'\{[^{}]*?id: "[^"]*"[^{}]*?budgetPerStudent: \d+,[^{}]*?\}',
    inject_coords,
    content,
    flags=re.DOTALL
)

if new_content != content:
    with open(JS_FILE, 'w') as f:
        f.write(new_content)
    injected = new_content.count('lat:') - content.count('lat:')
    print(f'lat/lng 삽입: {injected}개교')
else:
    print('변경 없음')
