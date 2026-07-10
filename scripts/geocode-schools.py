"""
Nominatim으로 학교명+시군구 → 위도/경도 변환 후 mockSchools.js에 삽입
hit_rate 높이기 위해 학교명 → 학교명+시군구 → 학교명+시도 순으로 fallback
"""
import re, json, time, os, urllib.request, urllib.parse

CKPT    = '/Users/namyunsu/Downloads/mealradar/scripts/geo_checkpoint.json'
JS_FILE = '/Users/namyunsu/Downloads/mealradar/src/data/mockSchools.js'
UA      = 'MealRadar-Geocoder/1.0 (school nutrition research)'

if os.path.exists(CKPT):
    with open(CKPT) as f:
        geo = json.load(f)
    print(f'체크포인트 로드: {len(geo)}개')
else:
    geo = {}

with open(JS_FILE) as f:
    content = f.read()

# id, name, city, region 파싱
schools = re.findall(
    r'id: "([^"]+)".*?name: "([^"]+)".*?region: "([^"]+)".*?city: "([^"]+)"',
    content, re.DOTALL
)
print(f'학교 수: {len(schools)}개')

def geocode(query):
    params = urllib.parse.urlencode({
        'q': query, 'format': 'json', 'limit': 1,
        'countrycodes': 'kr', 'accept-language': 'ko',
    })
    url = f'https://nominatim.openstreetmap.org/search?{params}'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read())
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except:
        pass
    return None, None

hit = 0; miss = 0

for i, (sid, name, region, city) in enumerate(schools):
    if sid in geo:
        continue

    # fallback 순서: 학교명+시군구 → 학교명+시도 → 학교명
    queries = [f'{name} {city}', f'{name} {region}', name]
    lat, lng = None, None
    for q in queries:
        lat, lng = geocode(q)
        time.sleep(1.1)  # Nominatim 1req/s 정책
        if lat:
            break

    if lat:
        geo[sid] = {'lat': lat, 'lng': lng}
        hit += 1
    else:
        geo[sid] = None
        miss += 1

    if (i + 1) % 50 == 0:
        with open(CKPT, 'w') as f:
            json.dump(geo, f)
        print(f'[{i+1}/{len(schools)}] 성공 {hit} / 실패 {miss}')

with open(CKPT, 'w') as f:
    json.dump(geo, f, indent=2)
print(f'\n완료: 성공 {hit} / 실패 {miss}')

# mockSchools.js에 lat/lng 삽입
print('mockSchools.js 업데이트 중...')

def inject(m):
    sid_m = re.search(r'id: "([^"]+)"', m.group(0))
    if not sid_m:
        return m.group(0)
    sid = sid_m.group(1)
    c = geo.get(sid)
    if not c:
        return m.group(0)
    if 'lat:' in m.group(0):
        # 기존 lat/lng 업데이트
        s = re.sub(r'lat: [0-9.-]+, lng: [0-9.-]+,', f'lat: {c["lat"]}, lng: {c["lng"]},', m.group(0))
        return s
    return re.sub(
        r'(budgetPerStudent: \d+,)',
        f'\\1\n    lat: {c["lat"]}, lng: {c["lng"]},',
        m.group(0)
    )

new_content = re.sub(
    r'\{[^{}]*?id: "[^"]*"[^{}]*?budgetPerStudent: \d+,[^{}]*?\}',
    inject, content, flags=re.DOTALL
)

with open(JS_FILE, 'w') as f:
    f.write(new_content)

injected = len(re.findall(r'lat: [0-9.-]+, lng:', new_content))
print(f'lat/lng 삽입 완료: {injected}개교')
