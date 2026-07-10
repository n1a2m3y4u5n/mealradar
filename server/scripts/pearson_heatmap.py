"""
급식 영양소 × PAPS 체력등급 피어슨 + 스피어먼 상관관계 비교
"""

import json, re
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
import seaborn as sns
from pathlib import Path

BASE = Path(__file__).parent.parent

# ── 데이터 로드 ──────────────────────────────────────────────────────
src = (BASE / '../src/data/mockSchools.js').read_text(encoding='utf-8')
src = re.sub(r'^export const mockSchools = ', '', src).rstrip().rstrip(';')
schools = json.loads(src)
neis = json.loads((BASE / 'data/neisNutrition.json').read_text())

rows = []
for s in schools:
    code = s.get('code')
    n = neis.get(code)
    p = s.get('paps')
    if not n or not p:
        continue
    rows.append({
        '에너지(kcal)':   n.get('energy_kcal'),
        '단백질(g)':      n.get('protein_g'),
        '철분(mg)':       n.get('iron_mg'),
        '칼슘(mg)':       n.get('calcium_mg'),
        '비타민C(mg)':    n.get('vitc_mg'),
        '급식비(원)':     s.get('budgetPerStudent'),
        '1등급 비율(%)':  p.get('fitnessScore'),
        '5등급 비율(%)':  p.get('grade5Pct'),
        'BMI':            p.get('bmi'),
    })

df = pd.DataFrame(rows).dropna()
N = len(df)
print(f'분석 n = {N}개 학교')

NUTRITION = ['에너지(kcal)', '단백질(g)', '철분(mg)', '칼슘(mg)', '비타민C(mg)', '급식비(원)']
PAPS      = ['1등급 비율(%)', '5등급 비율(%)', 'BMI']

# ── 두 방법 상관계수 행렬 ─────────────────────────────────────────────
def build_matrix(df, x_cols, y_cols, method='pearson'):
    fn = pearsonr if method == 'pearson' else spearmanr
    r_mat = np.zeros((len(x_cols), len(y_cols)))
    p_mat = np.zeros((len(x_cols), len(y_cols)))
    for i, xc in enumerate(x_cols):
        for j, yc in enumerate(y_cols):
            r, p = fn(df[xc], df[yc])
            r_mat[i, j] = r
            p_mat[i, j] = p
    return (pd.DataFrame(r_mat, index=x_cols, columns=y_cols),
            pd.DataFrame(p_mat, index=x_cols, columns=y_cols))

r_p, p_p = build_matrix(df, NUTRITION, PAPS, 'pearson')
r_s, p_s = build_matrix(df, NUTRITION, PAPS, 'spearman')

# ── 한글 폰트 ────────────────────────────────────────────────────────
korean_fonts = [f for f in fm.findSystemFonts() if any(
    k in f for k in ['AppleGothic', 'NanumGothic', 'Malgun', 'NotoSansCJK']
)]
if korean_fonts:
    plt.rcParams['font.family'] = fm.FontProperties(fname=korean_fonts[0]).get_name()
else:
    plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

# ── 레이아웃: 히트맵 2개 + 차이 비교 막대 ────────────────────────────
fig = plt.figure(figsize=(18, 8), facecolor='#0f1117')
gs  = fig.add_gridspec(1, 3, width_ratios=[3, 3, 2.5], wspace=0.35)
ax_p  = fig.add_subplot(gs[0])
ax_s  = fig.add_subplot(gs[1])
ax_d  = fig.add_subplot(gs[2])

cmap = sns.diverging_palette(220, 20, as_cmap=True)
VMIN, VMAX = -0.45, 0.45

def draw_heatmap(ax, r_df, p_df, title):
    sns.heatmap(r_df, ax=ax, cmap=cmap, center=0, vmin=VMIN, vmax=VMAX,
                annot=True, fmt='.3f', annot_kws={'size': 10.5, 'weight': 'bold'},
                linewidths=0.5, linecolor='#2a2d35',
                cbar_kws={'shrink': 0.75, 'label': 'r'})
    for i in range(len(NUTRITION)):
        for j in range(len(PAPS)):
            p = p_df.iloc[i, j]
            if p >= 0.05:
                ax.add_patch(mpatches.Rectangle(
                    (j, i), 1, 1, fill=True, color='#0f1117', alpha=0.58, zorder=3))
            sig = '***' if p < 0.001 else ('**' if p < 0.01 else ('*' if p < 0.05 else ''))
            if sig:
                ax.text(j+0.5, i+0.82, sig, ha='center', va='center',
                        fontsize=8, color='white', zorder=4)
    ax.set_title(title, color='white', fontsize=12, pad=10)
    ax.xaxis.tick_top(); ax.xaxis.set_label_position('top')
    ax.tick_params(colors='white', labelsize=9.5)
    ax.set_xlabel(''); ax.set_ylabel('')
    for sp in ax.spines.values(): sp.set_edgecolor('#2a2d35')
    ax.figure.axes[-1].tick_params(colors='white')
    ax.figure.axes[-1].yaxis.label.set_color('white')

draw_heatmap(ax_p, r_p, p_p,
             f'Pearson r\n(n={N}, *p<.05 **p<.01 ***p<.001)')
draw_heatmap(ax_s, r_s, p_s,
             f'Spearman ρ\n(n={N}, *p<.05 **p<.01 ***p<.001)')

# ── 차이 비교: |Pearson| vs |Spearman| 막대 (상위 조합) ──────────────
ax_d.set_facecolor('#1a1d26')

diffs = []
for i, nc in enumerate(NUTRITION):
    for j, pc in enumerate(PAPS):
        rp = r_p.iloc[i, j]
        rs = r_s.iloc[i, j]
        diffs.append({
            'label': f'{nc}\n↔ {pc}',
            'pearson': rp,
            'spearman': rs,
            'abs_avg': (abs(rp) + abs(rs)) / 2,
        })

# 절댓값 평균 상위 8개만
diffs = sorted(diffs, key=lambda x: -x['abs_avg'])[:8]
labels = [d['label'] for d in diffs]
p_vals = [d['pearson'] for d in diffs]
s_vals = [d['spearman'] for d in diffs]

x = np.arange(len(labels))
w = 0.35
bars1 = ax_d.barh(x + w/2, p_vals, w, label='Pearson r',
                   color='#5b8fdd', edgecolor='#2a2d35', linewidth=0.6)
bars2 = ax_d.barh(x - w/2, s_vals, w, label='Spearman ρ',
                   color='#dd8f5b', edgecolor='#2a2d35', linewidth=0.6)

for bar in list(bars1) + list(bars2):
    v = bar.get_width()
    ax_d.text(v + (0.003 if v >= 0 else -0.003),
              bar.get_y() + bar.get_height()/2,
              f'{v:.3f}', va='center',
              ha='left' if v >= 0 else 'right',
              color='white', fontsize=7.5)

ax_d.axvline(0, color='#555', linewidth=0.8)
ax_d.set_yticks(x)
ax_d.set_yticklabels(labels, color='white', fontsize=7.5)
ax_d.set_xlabel('상관계수', color='#aaa', fontsize=9)
ax_d.set_title('상위 상관쌍 Pearson vs Spearman 비교\n(절댓값 기준 상위 8개)', color='white', fontsize=10, pad=10)
ax_d.tick_params(colors='white', labelsize=8)
ax_d.legend(facecolor='#2a2d35', edgecolor='#555', labelcolor='white', fontsize=8)
ax_d.grid(axis='x', color='#2a2d35', linewidth=0.6)
for sp in ax_d.spines.values(): sp.set_edgecolor('#2a2d35')

fig.suptitle('MealRadar  실급식(NEIS) × PAPS 체력성적  Pearson & Spearman 상관관계 분석',
             color='white', fontsize=14, weight='bold', y=1.02)

plt.tight_layout(pad=2.5)
out = BASE / 'data/pearson_spearman_result.png'
plt.savefig(out, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
print(f'저장: {out}')

# ── 수치 출력 ────────────────────────────────────────────────────────
print('\n[Pearson r]')
print(r_p.to_string(float_format='{:.3f}'.format))
print('\n[Spearman ρ]')
print(r_s.to_string(float_format='{:.3f}'.format))
print('\n[Pearson - Spearman 차이]')
diff_df = r_p - r_s
print(diff_df.to_string(float_format='{:+.3f}'.format))
