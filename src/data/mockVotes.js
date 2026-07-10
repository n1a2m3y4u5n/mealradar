function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

const POSITIVE_COMMENTS = [
  "오늘 돈가스 맛있었어요","불고기 양이 충분해서 좋았어요","오늘 급식 역대급이에요",
  "생선구이가 신선했어요","나물이 맛있게 무쳐졌어요","오늘 정말 맛있게 먹었어요",
  "반찬이 다양해서 좋아요","국이 시원하고 맛있었어요","오늘 메뉴 마음에 들어요",
]

const NEGATIVE_COMMENTS = [
  "양이 너무 적어요","맛이 없어요","항상 비슷한 메뉴예요","칼로리가 부족해요",
  "채소가 너무 많아요","고기가 없어요","국이 짜요","밥이 너무 딱딱해요",
  "반찬 수가 적어요","오늘 맛이 좀 이상했어요","양 좀 늘려주세요",
]

function generateVotesForSchool(schoolId, tasteBase, quantityBase, varietyBase) {
  const rand = seededRand(schoolId.charCodeAt(2) * 31 + schoolId.charCodeAt(3))
  const result = {}

  // 최근 90일치 데이터 (2024-09-01 ~ 2024-11-30 평일)
  const start = new Date("2024-09-01")
  const end   = new Date("2024-11-30")
  const cur   = new Date(start)

  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) {
      const dateStr = cur.toISOString().split('T')[0]
      const noise = () => -0.4 + rand() * 0.8

      const tasteMean = Math.max(1, Math.min(5, tasteBase + noise()))
      const qtyMean   = Math.max(1, Math.min(5, quantityBase + noise()))
      const varMean   = Math.max(1, Math.min(5, varietyBase + noise()))

      const mkDist = (mean) => {
        const total = 40 + Math.floor(rand() * 60)
        const dist = [0,0,0,0,0]
        for (let i = 0; i < total; i++) {
          const idx = Math.max(0, Math.min(4, Math.round(mean - 1 + (rand() - 0.5) * 2)))
          dist[idx]++
        }
        return dist
      }

      const numComments = Math.floor(rand() * 4)
      const comments = []
      for (let i = 0; i < numComments; i++) {
        const isPos = rand() > 0.45
        const pool  = isPos ? POSITIVE_COMMENTS : NEGATIVE_COMMENTS
        comments.push({
          text: pool[Math.floor(rand() * pool.length)],
          sentiment: isPos ? "positive" : "negative",
          timestamp: `${dateStr}T${11 + Math.floor(rand() * 2)}:${String(Math.floor(rand() * 60)).padStart(2,'0')}:00`,
        })
      }

      result[dateStr] = {
        school_id: schoolId,
        date: dateStr,
        votes: {
          taste:    mkDist(tasteMean),
          quantity: mkDist(qtyMean),
          variety:  mkDist(varMean),
        },
        comments,
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

// 대표 학교 5개에 대해 상세 투표 데이터 생성
export const mockVotesBySchool = {
  HS001: generateVotesForSchool("HS001", 3.4, 2.8, 2.6),
  HS005: generateVotesForSchool("HS005", 4.2, 3.9, 4.0),
  HS009: generateVotesForSchool("HS009", 4.4, 4.1, 4.3),
  HS019: generateVotesForSchool("HS019", 4.3, 4.0, 4.1),
  HS027: generateVotesForSchool("HS027", 3.6, 3.1, 2.9),
}

// 모든 학교 요약 (최신 날짜 기준)
export const mockVotesSummary = {
  HS001: { taste_avg: 3.4, quantity_avg: 2.8, variety_avg: 2.6, total_votes: 1247, trend: -0.2 },
  HS002: { taste_avg: 3.7, quantity_avg: 3.1, variety_avg: 2.9, total_votes: 2134, trend: 0.1 },
  HS003: { taste_avg: 3.9, quantity_avg: 3.4, variety_avg: 3.2, total_votes: 1876, trend: 0.3 },
  HS004: { taste_avg: 3.1, quantity_avg: 2.5, variety_avg: 2.3, total_votes:  987, trend: -0.4 },
  HS005: { taste_avg: 4.2, quantity_avg: 3.9, variety_avg: 4.0, total_votes: 4218, trend: 0.2 },
  HS006: { taste_avg: 3.5, quantity_avg: 2.9, variety_avg: 2.8, total_votes: 1562, trend: 0.0 },
  HS007: { taste_avg: 3.2, quantity_avg: 2.6, variety_avg: 2.4, total_votes: 1041, trend: -0.1 },
  HS008: { taste_avg: 2.9, quantity_avg: 2.3, variety_avg: 2.1, total_votes:  748, trend: -0.5 },
  HS009: { taste_avg: 4.4, quantity_avg: 4.1, variety_avg: 4.3, total_votes: 1842, trend: 0.4 },
  HS010: { taste_avg: 4.1, quantity_avg: 3.8, variety_avg: 3.9, total_votes: 6841, trend: 0.2 },
}
