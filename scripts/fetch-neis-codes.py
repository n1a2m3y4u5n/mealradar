#!/usr/bin/env python3
import re, json, time, urllib.request, urllib.parse

NEIS_KEYS = ['3f24c3dc382741bbbc163fc82473623c', '90bef23c145e47349e3c5e186f56b336']
_ki = 0
def neis_key():
    global _ki; k = NEIS_KEYS[_ki % len(NEIS_KEYS)]; _ki += 1; return k
NEIS_KEY = neis_key  # 하위 호환
MOCK_FILE = '../src/data/mockSchools.js'

# mockSchools.js에서 id, code, name, regionCode 파싱
with open(MOCK_FILE, 'r') as f:
    content = f.read()

# 학교 엔트리 추출 (id, code, name, regionCode)
schools = []
# id: "HSxxx", code: "...", name: "...", ...regionCode: "..."
entries = re.findall(
    r'id:\s*"(HS\d+)",\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)".*?regionCode:\s*"([^"]+)"',
    content, re.DOTALL
)
for id_, code, name, region_code in entries:
    schools.append({'id': id_, 'old_code': code, 'name': name, 'regionCode': region_code})

print(f'총 {len(schools)}개 학교 발견')

def fetch_neis_code(name, atpt_code):
    encoded = urllib.parse.quote(name)
    url = f'https://open.neis.go.kr/hub/schoolInfo?KEY={NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE={atpt_code}&SCHUL_NM={encoded}'
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())
        info = data.get('schoolInfo', [{}, {}])
        rows = info[1].get('row', []) if len(info) > 1 else []
        if rows:
            return rows[0]['SD_SCHUL_CODE']
    except Exception as e:
        print(f'  오류: {e}')
    return None

# 코드 조회
updates = {}  # id -> new_code
not_found = []

for i, school in enumerate(schools):
    # 이미 올바른 코드인 경우 skip (앞서 수동으로 수정한 학교들)
    already_fixed = {'HS001': '8490323', 'HS002': '8490141', 'HS004': '8490212',
                     'HS005': '8490078', 'HS009': '7010084', 'HS010': '7010170'}
    if school['id'] in already_fixed:
        updates[school['id']] = already_fixed[school['id']]
        print(f"[{i+1}/{len(schools)}] {school['id']} {school['name']} → 기존 수정값 사용")
        continue

    print(f"[{i+1}/{len(schools)}] {school['id']} {school['name']} ({school['regionCode']}) 조회 중...", end=' ')
    real_code = fetch_neis_code(school['name'], school['regionCode'])
    if real_code:
        updates[school['id']] = real_code
        changed = ' ← 변경됨' if real_code != school['old_code'] else ''
        print(f"→ {real_code}{changed}")
    else:
        not_found.append(school)
        print(f"→ 없음 (기존 {school['old_code']} 유지)")
    time.sleep(0.15)  # rate limit

print(f'\n찾음: {len(updates)}개, 못찾음: {len(not_found)}개')

# mockSchools.js 업데이트
new_content = content
changed_count = 0
for id_, new_code in updates.items():
    # 해당 학교의 code 값만 정확히 교체
    old_entry = re.search(rf'(id:\s*"{id_}",\s*code:\s*)"([^"]+)"', new_content)
    if old_entry and old_entry.group(2) != new_code:
        new_content = new_content[:old_entry.start(2)] + new_code + new_content[old_entry.end(2):]
        changed_count += 1

with open(MOCK_FILE, 'w') as f:
    f.write(new_content)

print(f'mockSchools.js 업데이트 완료: {changed_count}개 코드 변경')
if not_found:
    print('미발견 학교:', [s['name'] for s in not_found])
