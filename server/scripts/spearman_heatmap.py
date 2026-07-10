"""
급식 영양소 × PAPS 체력등급 스피어먼 상관관계 히트맵
"""

import json, re
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
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
        # 급식 영양소
        '에너지(kcal)':  n.get('energy_kcal'),
        '단백질(g)':     n.get('protein_g'),
        '철분(mg)':      n.get('iron_mg'),
        '칼슘(mg)':      n.get('calcium_mg'),
        '비타민C(mg)':   n.get('vitc_mg'),
        '급식비(원)':    s.get('budgetPerStudent'),
        # PAPS 체력 성적
        '1등급 비율(%)': p.get('fitnessScore'),
        '5등급 비율(%)': p.get('grade5Pct'),
        'BMI':           p.get('bmi'),
    })

df = pd.DataFrame(rows).dropna()
print(f'분석 n = {len(df)}개 학교')

NUTRITION = ['에너지(kcal)', '단백질(g)', '철분(mg)', '칼슘(mg)', '비타민C(mg)', '급식비(원)']
PAPS      = ['1등급 비율(%)', '5등급 비율(%)', 'BMI']

# ── 스피어먼 상관계수 행렬 계산 ─────────────────────────────────────
rmat = np.zeros((len(NUTRITION), len(PAPS)))
pmat = np.zeros((len(NUTRITION), len(PAPS)))

for i, n_col in enumerate(NUTRITION):
    for j, p_col in enumerate(PAPS):
        r, p = spearmanr(df[n_col], df[p_col])
        rmat[i, j] = r
        pmat[i, j] = p

r_df = pd.DataFrame(rmat, index=NUTRITION, columns=PAPS)
p_df = pd.DataFrame(pmat, index=NUTRITION, columns=PAPS)

# ── 한글 폰트 설정 ───────────────────────────────────────────────────
korean_fonts = [f for f in fm.findSystemFonts() if any(
    k in f for k in ['AppleGothic', 'NanumGothic', 'Malgun', 'NotoSansCJK', 'Noto Sans CJK']
)]
if korean_fonts:
    plt.rcParams['font.family'] = fm.FontProperties(fname=korean_fonts[0]).get_name()
else:
    plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

# ── 시각화 ───────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 6),
                          gridspec_kw={'width_ratios': [3, 2.2]})
fig.patch.set_facecolor('#0f1117')

# 왼쪽: 전체 히트맵
ax1 = axes[0]
mask_insig = pmat >= 0.05  # p≥0.05 흐리게

cmap = sns.diverging_palette(220, 20, as_cmap=True)
sns.heatmap(r_df, ax=ax1, cmap=cmap, center=0, vmin=-0.5, vmax=0.5,
            annot=True, fmt='.3f', annot_kws={'size': 11, 'weight': 'bold'},
            linewidths=0.5, linecolor='#2a2d35',
            cbar_kws={'shrink': 0.8, 'label': "Spearman r"})

# 비유의 셀 투명 오버레이
for i in range(len(NUTRITION)):
    for j in range(len(PAPS)):
        if pmat[i, j] >= 0.05:
            ax1.add_patch(mpatches.Rectangle(
                (j, i), 1, 1,
                fill=True, color='#0f1117', alpha=0.55, zorder=3
            ))
        elif pmat[i, j] < 0.001:
            ax1.text(j + 0.5, i + 0.82, '***', ha='center', va='center',
                     fontsize=9, color='white', zorder=4)
        elif pmat[i, j] < 0.01:
            ax1.text(j + 0.5, i + 0.82, '**', ha='center', va='center',
                     fontsize=9, color='white', zorder=4)
        elif pmat[i, j] < 0.05:
            ax1.text(j + 0.5, i + 0.82, '*', ha='center', va='center',
                     fontsize=9, color='white', zorder=4)

ax1.set_title(f'급식 영양소 × PAPS 체력성적  스피어먼 상관관계\n(n={len(df)}, *p<.05  **p<.01  ***p<.001  흐린셀=비유의)',
              color='white', fontsize=12, pad=14)
ax1.set_xlabel('')
ax1.set_ylabel('')
ax1.tick_params(colors='white', labelsize=10)
ax1.xaxis.tick_top()
ax1.xaxis.set_label_position('top')
for spine in ax1.spines.values():
    spine.set_edgecolor('#2a2d35')
ax1.figure.axes[-1].tick_params(colors='white')
ax1.figure.axes[-1].yaxis.label.set_color('white')

# 오른쪽: 막대 그래프 — 칼슘 vs 1등급% (가장 흥미로운 쌍)
ax2 = axes[1]
ax2.set_facecolor('#1a1d26')

# 칼슘 분위 → 1등급% 평균
df_sorted = df.sort_values('칼슘(mg)')
n = len(df_sorted)
q_size = n // 5
labels = ['최저\n(Q1)', 'Q2', 'Q3', 'Q4', '최고\n(Q5)']
colors = ['#e05252', '#e09052', '#e0d952', '#90c060', '#52b060']
means, stds = [], []
for i in range(5):
    g = df_sorted.iloc[i*q_size : (i+1)*q_size if i < 4 else n]
    means.append(g['1등급 비율(%)'].mean())
    stds.append(g['1등급 비율(%)'].std())

bars = ax2.bar(labels, means, color=colors, edgecolor='#2a2d35',
               linewidth=0.8, width=0.6, zorder=3)
ax2.errorbar(labels, means, yerr=stds, fmt='none',
             color='white', capsize=4, linewidth=1.2, zorder=4)

for bar, val in zip(bars, means):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
             f'{val:.2f}%', ha='center', va='bottom',
             color='white', fontsize=9.5, weight='bold')

ax2.set_facecolor('#1a1d26')
ax2.set_title('칼슘 섭취량 5분위 → 체력 1등급 비율',
              color='white', fontsize=11, pad=12)
ax2.set_ylabel('체력 1등급 비율 (%)', color='#aaaaaa', fontsize=9)
ax2.set_xlabel('칼슘 섭취 분위', color='#aaaaaa', fontsize=9)
ax2.tick_params(colors='white', labelsize=9)
ax2.grid(axis='y', color='#2a2d35', linewidth=0.7, zorder=0)
ax2.set_ylim(0, max(means) * 1.35)
for spine in ax2.spines.values():
    spine.set_edgecolor('#2a2d35')

# r, p 값 표시
r_val, p_val = spearmanr(df['칼슘(mg)'], df['1등급 비율(%)'])
ax2.text(0.97, 0.04, f'r = {r_val:.3f},  p = {p_val:.4f}',
         transform=ax2.transAxes, ha='right', va='bottom',
         color='#aaaaaa', fontsize=9)

fig.suptitle('MealRadar  실급식 데이터(NEIS) × PAPS 체력성적  빅데이터 분석',
             color='white', fontsize=14, weight='bold', y=1.01)

plt.tight_layout(pad=2.5)
out = BASE / 'data/spearman_result.png'
plt.savefig(out, dpi=150, bbox_inches='tight',
            facecolor=fig.get_facecolor())
print(f'저장: {out}')

# 주요 수치 텍스트 출력
print('\n스피어먼 r 행렬:')
print(r_df.to_string(float_format='{:.3f}'.format))
print('\np-value 행렬:')
print(p_df.to_string(float_format='{:.4f}'.format))
