"""
보고서 시각자료
- 데이터 차트(③④⑤⑥): matplotlib 기본 디자인
- 도식(②⑧): 박스/화살표 (색 지정 필요)
출력: server/data/report_figs/fig{2,3,4,5,6,8}_*.png
"""
import json, re
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from pathlib import Path

BASE = Path(__file__).parent.parent
OUT = BASE / 'data/report_figs'
OUT.mkdir(exist_ok=True)

# 한글 폰트만 지정 (그 외 전부 matplotlib 기본값)
for cand in ['AppleSDGothicNeo', 'NanumGothic', 'AppleGothic']:
    fs = [f for f in fm.findSystemFonts() if cand in f]
    if fs:
        plt.rcParams['font.family'] = fm.FontProperties(fname=fs[0]).get_name()
        break
plt.rcParams['axes.unicode_minus'] = False

# 도식용 색 (차트에는 사용 안 함)
INK = '#1a1d23'; SUB = '#6b7280'; ACC = '#2f6690'

def save(fig, name):
    p = OUT / name
    fig.savefig(p)
    plt.close(fig)
    print('저장:', p)

# ── 데이터 ──
src = (BASE / '../src/data/mockSchools.js').read_text(encoding='utf-8')
src = re.sub(r'^export const mockSchools = ', '', src).rstrip().rstrip(';')
schools = json.loads(src)
mar = np.array([s['scores']['mar'] for s in schools if s.get('scores', {}).get('mar') is not None], float)

# ====================================================================
# ③ MAR 분포 히스토그램
# ====================================================================
fig, ax = plt.subplots()
ax.hist(mar, bins=np.arange(40, 102, 2))
ax.axvline(mar.mean(), color='k', linestyle='--')
ax.set_xlabel('MAR (평균 영양 적정도)')
ax.set_ylabel('학교 수')
ax.set_title('전국 고등학교 MAR 분포')
save(fig, 'fig3_mar_hist.png')

# ====================================================================
# ④ 전국 MAR 공간 분포 지도
# ====================================================================
pts = [(s['lng'], s['lat'], s['scores']['mar']) for s in schools
       if s.get('lat') and s.get('lng') and s.get('scores', {}).get('mar') is not None
       and 33 < s['lat'] < 39.5 and 124 < s['lng'] < 132]
lng = np.array([p[0] for p in pts]); lat = np.array([p[1] for p in pts]); mv = np.array([p[2] for p in pts])
fig, ax = plt.subplots()
sc = ax.scatter(lng, lat, c=mv, cmap='RdYlBu', s=15)
fig.colorbar(sc, ax=ax, label='MAR')
ax.set_xlabel('경도 (°E)'); ax.set_ylabel('위도 (°N)')
ax.set_title('전국 학교 MAR의 공간 분포')
save(fig, 'fig4_mar_map.png')

# ====================================================================
# ⑤ 분산 분해 (ICC) — 막대
# ====================================================================
groups = {}
for s in schools:
    m_ = s.get('scores', {}).get('mar'); g = s.get('regionCode')
    if m_ is None or not g: continue
    groups.setdefault(g, []).append(m_)
allv = np.array([v for vs in groups.values() for v in vs]); gm = allv.mean()
ssb = sum(len(vs) * (np.mean(vs) - gm) ** 2 for vs in groups.values())
ssw = sum(sum((v - np.mean(vs)) ** 2 for v in vs) for vs in groups.values())
icc = ssb / (ssb + ssw)
fig, ax = plt.subplots()
ax.bar(['지역 간 격차', '지역 내 학교 간 격차'], [icc * 100, (1 - icc) * 100])
ax.set_ylabel('전체 분산 비율 (%)')
ax.set_title(f'MAR 분산 분해 (ICC = {icc:.3f})')
save(fig, 'fig5_icc_bar.png')

# ====================================================================
# ⑥ (a) MAR–체력 산점도  (b) 학교유형별 체력 우수율
# ====================================================================
rows = [(s['scores']['mar'], s['paps']['grade1Pct'] + s['paps']['grade2Pct'], s['type'])
        for s in schools if s.get('paps') and s['paps'].get('grade1Pct') is not None
        and s.get('scores', {}).get('mar') is not None]
X = np.array([r[0] for r in rows]); Y = np.array([r[1] for r in rows]); T = [r[2] for r in rows]
r = np.corrcoef(X, Y)[0, 1]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 5))
a1.scatter(X, Y, s=11)
b, a = np.polyfit(X, Y, 1)
xs = np.linspace(X.min(), X.max(), 50)
a1.plot(xs, b * xs + a, 'k--')
a1.set_xlabel('MAR (급식 영양 적정도)'); a1.set_ylabel('체력 우수율 — 1·2등급 비율 (%)')
a1.set_title(f'(a) 급식 영양과 학생 체력 (r = {r:.3f}, n = {len(rows):,})')
order = ['특목고', '자율고', '일반고', '직업계고']
means = [np.mean([Y[i] for i in range(len(T)) if T[i] == t]) for t in order]
a2.bar(order, means)
a2.set_ylabel('평균 체력 우수율 (%)')
a2.set_title('(b) 학교 유형별 체력 우수율')
save(fig, 'fig6_nutrition_fitness.png')

# ====================================================================
# 도식 헬퍼
# ====================================================================
def box(ax, x, y, w, h, title, sub='', accent=ACC, num=None):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                 boxstyle='round,pad=0.015,rounding_size=0.06',
                 fc='white', ec=accent, linewidth=1.3))
    ax.add_patch(plt.Rectangle((x, y), 0.07, h, color=accent, zorder=3))
    cy = y + h / 2
    ax.text(x + w / 2 + 0.03, cy + (0.16 if sub else 0), title, ha='center', va='center',
            color=INK, fontsize=10.5, fontweight='bold')
    if sub:
        ax.text(x + w / 2 + 0.03, cy - 0.22, sub, ha='center', va='center',
                color=SUB, fontsize=8.3, linespacing=1.4)
    if num:
        ax.text(x + 0.22, y + h - 0.16, num, ha='center', va='center', color=accent,
                fontsize=9, fontweight='bold')

def arrow(ax, x1, y1, x2, y2):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle='-|>',
                 mutation_scale=13, color=SUB, linewidth=1.1,
                 connectionstyle='arc3', shrinkA=2, shrinkB=2))

# ====================================================================
# ② 데이터 수집·구축 파이프라인
# ====================================================================
fig, ax = plt.subplots(figsize=(12.5, 5.4))
ax.set_xlim(0, 12.5); ax.set_ylim(0, 5.4); ax.axis('off')
ax.text(0.2, 5.05, '데이터 수집·구축 파이프라인', fontweight='bold', fontsize=14, color=INK)
ax.text(0.2, 4.72, '세 공공 API → 수집 엔진 → 학교명 매칭 → 통합 데이터셋', fontsize=9.5, color=SUB)
srcs = [('NEIS 학교정보 API', '학교종류=고교 전수\n2,408개교', '#3d6b8e'),
        ('NEIS 급식식단정보 API', '6개월 중식 영양정보\n→ MAR 2,299개교', '#6f9b7e'),
        ('학교알리미 PAPS', '시도×시군구×학교급\n등급분포·BMI', '#b9a05a')]
for i, (t, d, c) in enumerate(srcs):
    yb = 3.1 - i * 1.45
    box(ax, 0.3, yb, 2.9, 1.05, t, d, accent=c)
box(ax, 4.15, 1.55, 2.55, 1.05, '수집 엔진', 'API키 라운드로빈(3키)\n100건 체크포인트', accent=ACC)
box(ax, 7.45, 1.55, 2.55, 1.05, '학교명 4단계 매칭', '정확·접두추가\n정규화·접두제거', accent='#8a6f9b')
box(ax, 10.35, 1.6, 1.95, 0.95, '통합 데이터셋', '2,314개교\n(동시보유 1,905)', accent=INK)
for i in range(3):
    arrow(ax, 3.2, 3.62 - i * 1.45, 4.15, 2.08)
arrow(ax, 6.7, 2.08, 7.45, 2.08)
arrow(ax, 10.0, 2.08, 10.35, 2.08)
save(fig, 'fig2_pipeline.png')

# ====================================================================
# ⑧ AI 정책 제안 엔진 — 역할 분리
# ====================================================================
fig, ax = plt.subplots(figsize=(12.5, 4.6))
ax.set_xlim(0, 12.5); ax.set_ylim(0, 4.6); ax.axis('off')
ax.text(0.2, 4.25, 'AI 정책 제안 엔진 — 통계 계산과 언어 생성의 역할 분리', fontweight='bold', fontsize=14, color=INK)
steps = [(0.3,  '통합 데이터셋', '17개 시도 통계', ACC, '입력'),
         (3.25, '결정론적 코드 계산', 'MAR·격차·미배치율\n정렬·집계', '#6f9b7e', '통계'),
         (6.35, '구조화 프롬프트', '①단기 ②중기\n③모니터링 ④기대효과', ACC, '구성'),
         (9.55, 'Claude Haiku 4.5', '해석·정책 초안\n언어 생성', '#8a6f9b', '생성')]
for x, t, d, c, tag in steps:
    box(ax, x, 2.15, 2.5, 1.1, t, d, accent=c, num=tag)
for x1 in [2.8, 5.75, 8.85]:
    arrow(ax, x1, 2.7, x1 + 0.45, 2.7)
ax.annotate('', xy=(1.55, 2.05), xytext=(7.6, 2.05),
            arrowprops=dict(arrowstyle='-', color='#6f9b7e', lw=1.0, linestyle=(0, (4, 3))))
ax.text(4.55, 1.78, '수치는 코드가 계산 (검증 가능)', ha='center', color='#5c8a6c', fontsize=9)
ax.text(10.8, 1.78, 'AI는 해석만 생성', ha='center', color='#7a6090', fontsize=9)
box(ax, 4.6, 0.35, 3.3, 0.95, '정책 초안 (마크다운)', '단기·중기 정책 / 기대효과', accent=INK)
arrow(ax, 10.8, 2.15, 7.9, 1.3)
save(fig, 'fig8_ai_flow.png')

print('완료:', OUT)
