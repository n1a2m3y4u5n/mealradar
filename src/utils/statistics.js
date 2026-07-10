// 기술 통계
export function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function std(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

export function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])
}

export function percentileRank(arr, value) {
  const below = arr.filter(v => v < value).length
  return Math.round((below / arr.length) * 100)
}

// Z-score 기반 이상치 감지
export function zScoreOutliers(values, threshold = 2.5) {
  const m = mean(values)
  const s = std(values)
  return values.map((v, i) => ({
    index: i,
    value: v,
    zscore: s > 0 ? Math.abs((v - m) / s) : 0,
    isOutlier: s > 0 && Math.abs((v - m) / s) > threshold,
  }))
}

// 간이 Moran's I (공간 자기상관)
// weights: 인접 행렬 (n×n)
// values: 지역별 수치 배열
export function moransI(values, weights) {
  const n = values.length
  const m = mean(values)
  const deviations = values.map(v => v - m)

  let numerator = 0
  let W = 0

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const w = weights[i]?.[j] || 0
      numerator += w * deviations[i] * deviations[j]
      W += w
    }
  }

  const denominator = deviations.reduce((s, d) => s + d * d, 0)
  if (denominator === 0 || W === 0) return 0

  return (n / W) * (numerator / denominator)
}

// 선형 회귀 (최소제곱법)
export function linearRegression(xArr, yArr) {
  const n = xArr.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }

  const xMean = mean(xArr)
  const yMean = mean(yArr)

  let ssXY = 0, ssXX = 0, ssYY = 0
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - xMean
    const dy = yArr[i] - yMean
    ssXY += dx * dy
    ssXX += dx * dx
    ssYY += dy * dy
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0
  const intercept = yMean - slope * xMean
  const r2 = ssXX > 0 && ssYY > 0 ? Math.pow(ssXY / Math.sqrt(ssXX * ssYY), 2) : 0

  return {
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(2)),
    r2: parseFloat(r2.toFixed(3)),
    predict: x => slope * x + intercept,
  }
}

// 상관계수 (Pearson)
export function pearsonCorr(xArr, yArr) {
  const n = xArr.length
  if (n < 2) return 0
  const xMean = mean(xArr)
  const yMean = mean(yArr)
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - xMean
    const dy = yArr[i] - yMean
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom > 0 ? parseFloat((num / denom).toFixed(3)) : 0
}

// 이동 평균
export function movingAverage(arr, window) {
  return arr.map((_, i) => {
    const start = Math.max(0, i - Math.floor(window / 2))
    const end   = Math.min(arr.length, i + Math.ceil(window / 2))
    return mean(arr.slice(start, end))
  })
}

// 스무딩 (exponential)
export function exponentialSmooth(arr, alpha = 0.3) {
  const result = [arr[0]]
  for (let i = 1; i < arr.length; i++) {
    result.push(alpha * arr[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

// HLM 분산 분해 (시뮬레이션)
export function hlmVarianceDecomp(schoolData) {
  // 실제 HLM 없이 ICC 추정
  const groupMeans = {}
  const groupCounts = {}
  schoolData.forEach(s => {
    if (!groupMeans[s.region]) { groupMeans[s.region] = 0; groupCounts[s.region] = 0 }
    groupMeans[s.region] += s.scores.mar
    groupCounts[s.region]++
  })
  Object.keys(groupMeans).forEach(r => {
    groupMeans[r] /= groupCounts[r]
  })

  const allMars = schoolData.map(s => s.scores.mar)
  const grandMean = mean(allMars)

  const betweenVar = mean(Object.values(groupMeans).map(gm => Math.pow(gm - grandMean, 2)))
  const withinVar  = mean(schoolData.map(s => Math.pow(s.scores.mar - groupMeans[s.region], 2)))
  const totalVar   = betweenVar + withinVar

  const icc = totalVar > 0 ? betweenVar / totalVar : 0

  return {
    icc: parseFloat(icc.toFixed(3)),
    between: parseFloat(betweenVar.toFixed(1)),
    within:  parseFloat(withinVar.toFixed(1)),
    total:   parseFloat(totalVar.toFixed(1)),
    pct_between: Math.round(icc * 100),
    pct_within:  Math.round((1 - icc) * 100),
  }
}
