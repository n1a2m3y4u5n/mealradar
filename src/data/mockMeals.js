// 10개교 급식 데이터 — 2023-09-01 ~ 2024-11-30 평일

export const mockMeals = (() => {
  function getWeekdays(start, end) {
    const days = []
    const cur = new Date(start)
    const fin = new Date(end)
    while (cur <= fin) {
      const d = cur.getDay()
      if (d !== 0 && d !== 6) days.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }

  function seededRand(seed) {
    let s = seed
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return (s >>> 0) / 0xffffffff
    }
  }

  const WEATHERS = ['맑음', '맑음', '맑음', '흐림', '비', '구름']

  // 전남 특화 메뉴
  const MENUS_JEONNAM = [
    { menu: ['백미밥', '미역국', '홍어무침', '콩나물무침', '배추김치'], allergens: [13, 5], base: { energy: 621, protein: 26.4, iron: 2.8, calcium: 298, vitc: 22, sodium: 1840, fiber: 4.2 }, contrib: { '백미밥': { energy: 52, iron: 8, calcium: 5 }, '미역국': { energy: 6, iron: 18, calcium: 31 }, '홍어무침': { energy: 24, iron: 32, calcium: 18 }, '콩나물무침': { energy: 8, iron: 22, calcium: 18 }, '배추김치': { energy: 10, iron: 20, calcium: 28 } }, eat: ['홍어무침', '미역국'] },
    { menu: ['잡곡밥', '된장찌개', '낙지볶음', '시금치나물', '깍두기'], allergens: [5, 17], base: { energy: 698, protein: 32.1, iron: 3.8, calcium: 312, vitc: 28, sodium: 1848, fiber: 5.2 }, contrib: { '잡곡밥': { energy: 48, iron: 10, calcium: 8 }, '된장찌개': { energy: 8, iron: 14, calcium: 22 }, '낙지볶음': { energy: 26, iron: 38, calcium: 14 }, '시금치나물': { energy: 6, iron: 21, calcium: 31 }, '깍두기': { energy: 12, iron: 17, calcium: 25 } }, eat: ['낙지볶음', '시금치나물'] },
    { menu: ['현미밥', '콩나물국', '갓김치볶음', '두부조림', '배추김치'], allergens: [5], base: { energy: 658, protein: 28.6, iron: 2.6, calcium: 288, vitc: 31, sodium: 1780, fiber: 4.8 }, contrib: { '현미밥': { energy: 46, iron: 12, calcium: 6 }, '콩나물국': { energy: 5, iron: 16, calcium: 18 }, '갓김치볶음': { energy: 12, iron: 22, calcium: 24 }, '두부조림': { energy: 26, iron: 28, calcium: 36 }, '배추김치': { energy: 11, iron: 22, calcium: 16 } }, eat: ['두부조림'] },
    { menu: ['백미밥', '해물탕', '꼬막무침', '도라지무침', '열무김치'], allergens: [8, 17], base: { energy: 648, protein: 29.8, iron: 3.4, calcium: 321, vitc: 42, sodium: 1924, fiber: 5.6 }, contrib: { '백미밥': { energy: 44, iron: 7, calcium: 5 }, '해물탕': { energy: 12, iron: 28, calcium: 28 }, '꼬막무침': { energy: 18, iron: 42, calcium: 32 }, '도라지무침': { energy: 14, iron: 14, calcium: 18 }, '열무김치': { energy: 12, iron: 9, calcium: 17 } }, eat: ['꼬막무침'] },
    { menu: ['보리밥', '된장국', '전어구이', '고사리나물', '배추김치'], allergens: [7], base: { energy: 634, protein: 28.4, iron: 2.9, calcium: 278, vitc: 24, sodium: 1862, fiber: 4.4 }, contrib: { '보리밥': { energy: 47, iron: 14, calcium: 7 }, '된장국': { energy: 6, iron: 9, calcium: 14 }, '전어구이': { energy: 24, iron: 32, calcium: 36 }, '고사리나물': { energy: 11, iron: 28, calcium: 18 }, '배추김치': { energy: 12, iron: 17, calcium: 25 } }, eat: ['전어구이', '고사리나물'] },
    { menu: ['흑미밥', '김치찌개', '불고기', '숙주나물', '배추김치'], allergens: [5, 10, 16], base: { energy: 742, protein: 35.2, iron: 3.6, calcium: 334, vitc: 18, sodium: 1968, fiber: 4.9 }, contrib: { '흑미밥': { energy: 45, iron: 16, calcium: 6 }, '김치찌개': { energy: 11, iron: 18, calcium: 16 }, '불고기': { energy: 26, iron: 42, calcium: 8 }, '숙주나물': { energy: 7, iron: 12, calcium: 18 }, '배추김치': { energy: 11, iron: 12, calcium: 52 } }, eat: ['불고기'] },
    { menu: ['잡곡밥', '닭곰탕', '고등어구이', '시금치나물', '배추김치'], allergens: [7, 15], base: { energy: 668, protein: 33.4, iron: 3.2, calcium: 318, vitc: 22, sodium: 1802, fiber: 4.6 }, contrib: { '잡곡밥': { energy: 46, iron: 11, calcium: 7 }, '닭곰탕': { energy: 14, iron: 22, calcium: 24 }, '고등어구이': { energy: 24, iron: 24, calcium: 32 }, '시금치나물': { energy: 6, iron: 28, calcium: 28 }, '배추김치': { energy: 10, iron: 15, calcium: 9 } }, eat: ['고등어구이', '시금치나물'] },
    { menu: ['백미밥', '부대찌개', '두부조림', '고사리나물', '배추김치'], allergens: [1, 2, 5, 6, 10], base: { energy: 758, protein: 31.6, iron: 2.8, calcium: 294, vitc: 16, sodium: 2084, fiber: 4.2 }, contrib: { '백미밥': { energy: 48, iron: 7, calcium: 4 }, '부대찌개': { energy: 18, iron: 14, calcium: 18 }, '두부조림': { energy: 14, iron: 24, calcium: 36 }, '고사리나물': { energy: 12, iron: 36, calcium: 18 }, '배추김치': { energy: 8, iron: 19, calcium: 24 } }, eat: ['두부조림', '고사리나물'] },
  ]

  // 제주 특화 메뉴
  const MENUS_JEJU = [
    { menu: ['백미밥', '미역국', '옥돔구이', '콩나물무침', '배추김치'], allergens: [7], base: { energy: 648, protein: 31.4, iron: 2.6, calcium: 312, vitc: 18, sodium: 1780, fiber: 4.0 }, contrib: { '백미밥': { energy: 50, iron: 8, calcium: 5 }, '미역국': { energy: 6, iron: 18, calcium: 31 }, '옥돔구이': { energy: 26, iron: 24, calcium: 42 }, '콩나물무침': { energy: 8, iron: 22, calcium: 18 }, '배추김치': { energy: 10, iron: 28, calcium: 4 } }, eat: ['옥돔구이', '미역국'] },
    { menu: ['잡곡밥', '된장찌개', '흑돼지볶음', '시금치나물', '깍두기'], allergens: [5, 10], base: { energy: 738, protein: 36.8, iron: 3.8, calcium: 328, vitc: 26, sodium: 1924, fiber: 5.2 }, contrib: { '잡곡밥': { energy: 46, iron: 10, calcium: 7 }, '된장찌개': { energy: 8, iron: 14, calcium: 22 }, '흑돼지볶음': { energy: 28, iron: 48, calcium: 12 }, '시금치나물': { energy: 6, iron: 21, calcium: 31 }, '깍두기': { energy: 12, iron: 7, calcium: 28 } }, eat: ['흑돼지볶음', '시금치나물'] },
    { menu: ['현미밥', '갈치조림', '한라봉샐러드', '호박볶음', '배추김치'], allergens: [7], base: { energy: 624, protein: 28.4, iron: 2.4, calcium: 298, vitc: 52, sodium: 1760, fiber: 4.8 }, contrib: { '현미밥': { energy: 46, iron: 13, calcium: 6 }, '갈치조림': { energy: 22, iron: 26, calcium: 28 }, '한라봉샐러드': { energy: 14, iron: 8, calcium: 18 }, '호박볶음': { energy: 10, iron: 18, calcium: 18 }, '배추김치': { energy: 8, iron: 35, calcium: 30 } }, eat: ['갈치조림', '한라봉샐러드'] },
    { menu: ['백미밥', '오메기떡국', '고등어구이', '도라지무침', '열무김치'], allergens: [7], base: { energy: 668, protein: 29.8, iron: 2.8, calcium: 308, vitc: 24, sodium: 1802, fiber: 4.4 }, contrib: { '백미밥': { energy: 44, iron: 7, calcium: 5 }, '오메기떡국': { energy: 18, iron: 10, calcium: 14 }, '고등어구이': { energy: 22, iron: 26, calcium: 32 }, '도라지무침': { energy: 10, iron: 18, calcium: 28 }, '열무김치': { energy: 6, iron: 39, calcium: 21 } }, eat: ['고등어구이'] },
    { menu: ['흑미밥', '해물탕', '돈가스', '브로콜리무침', '배추김치'], allergens: [1, 5, 8, 17], base: { energy: 786, protein: 36.8, iron: 3.4, calcium: 321, vitc: 42, sodium: 1924, fiber: 5.6 }, contrib: { '흑미밥': { energy: 44, iron: 8, calcium: 5 }, '해물탕': { energy: 12, iron: 24, calcium: 24 }, '돈가스': { energy: 28, iron: 22, calcium: 14 }, '브로콜리무침': { energy: 8, iron: 18, calcium: 42 }, '배추김치': { energy: 8, iron: 28, calcium: 15 } }, eat: ['돈가스', '브로콜리무침'] },
    { menu: ['잡곡밥', '김치찌개', '제육볶음', '콩나물무침', '깍두기'], allergens: [5, 10], base: { energy: 718, protein: 33.6, iron: 3.4, calcium: 308, vitc: 22, sodium: 1924, fiber: 4.8 }, contrib: { '잡곡밥': { energy: 47, iron: 11, calcium: 7 }, '김치찌개': { energy: 11, iron: 18, calcium: 16 }, '제육볶음': { energy: 26, iron: 48, calcium: 14 }, '콩나물무침': { energy: 8, iron: 22, calcium: 18 }, '깍두기': { energy: 8, iron: 1, calcium: 45 } }, eat: ['제육볶음'] },
    { menu: ['보리밥', '미역국', '닭볶음탕', '시금치나물', '배추김치'], allergens: [15], base: { energy: 694, protein: 34.2, iron: 2.8, calcium: 302, vitc: 28, sodium: 1836, fiber: 4.6 }, contrib: { '보리밥': { energy: 47, iron: 14, calcium: 7 }, '미역국': { energy: 6, iron: 14, calcium: 28 }, '닭볶음탕': { energy: 26, iron: 28, calcium: 12 }, '시금치나물': { energy: 6, iron: 28, calcium: 28 }, '배추김치': { energy: 15, iron: 16, calcium: 25 } }, eat: ['닭볶음탕', '시금치나물'] },
    { menu: ['백미밥', '된장국', '불고기', '파프리카잡채', '배추김치'], allergens: [5, 6, 16], base: { energy: 724, protein: 32.8, iron: 3.2, calcium: 318, vitc: 38, sodium: 1862, fiber: 4.8 }, contrib: { '백미밥': { energy: 48, iron: 8, calcium: 5 }, '된장국': { energy: 6, iron: 9, calcium: 14 }, '불고기': { energy: 28, iron: 42, calcium: 8 }, '파프리카잡채': { energy: 10, iron: 22, calcium: 42 }, '배추김치': { energy: 8, iron: 19, calcium: 31 } }, eat: ['불고기', '파프리카잡채'] },
  ]

  // 서울 특화 메뉴
  const MENUS_SEOUL = [
    { menu: ['백미밥', '미역국', '파스타샐러드', '두부조림', '배추김치'], allergens: [1, 2, 5, 6], base: { energy: 712, protein: 28.6, iron: 2.6, calcium: 298, vitc: 36, sodium: 1768, fiber: 4.8 }, contrib: { '백미밥': { energy: 44, iron: 7, calcium: 5 }, '미역국': { energy: 6, iron: 18, calcium: 31 }, '파스타샐러드': { energy: 28, iron: 12, calcium: 18 }, '두부조림': { energy: 14, iron: 24, calcium: 32 }, '배추김치': { energy: 8, iron: 39, calcium: 14 } }, eat: ['두부조림', '파스타샐러드'] },
    { menu: ['잡곡밥', '된장찌개', '치킨카레', '시금치나물', '깍두기'], allergens: [1, 5, 6, 15], base: { energy: 768, protein: 34.8, iron: 3.2, calcium: 318, vitc: 28, sodium: 1924, fiber: 5.2 }, contrib: { '잡곡밥': { energy: 44, iron: 10, calcium: 7 }, '된장찌개': { energy: 8, iron: 14, calcium: 22 }, '치킨카레': { energy: 32, iron: 22, calcium: 14 }, '시금치나물': { energy: 8, iron: 21, calcium: 31 }, '깍두기': { energy: 8, iron: 33, calcium: 26 } }, eat: ['치킨카레', '시금치나물'] },
    { menu: ['현미밥', '콩나물국', '훈제오리샐러드', '감자볶음', '배추김치'], allergens: [1, 2, 5], base: { energy: 748, protein: 32.6, iron: 2.8, calcium: 302, vitc: 42, sodium: 1780, fiber: 4.8 }, contrib: { '현미밥': { energy: 44, iron: 12, calcium: 6 }, '콩나물국': { energy: 5, iron: 16, calcium: 18 }, '훈제오리샐러드': { energy: 32, iron: 18, calcium: 16 }, '감자볶음': { energy: 12, iron: 12, calcium: 12 }, '배추김치': { energy: 7, iron: 42, calcium: 48 } }, eat: ['훈제오리샐러드'] },
    { menu: ['백미밥', '육개장', '함박스테이크', '브로콜리무침', '배추김치'], allergens: [1, 5, 6, 10], base: { energy: 824, protein: 42.8, iron: 4.2, calcium: 348, vitc: 48, sodium: 1968, fiber: 5.8 }, contrib: { '백미밥': { energy: 40, iron: 7, calcium: 5 }, '육개장': { energy: 12, iron: 28, calcium: 18 }, '함박스테이크': { energy: 36, iron: 42, calcium: 14 }, '브로콜리무침': { energy: 4, iron: 14, calcium: 42 }, '배추김치': { energy: 8, iron: 9, calcium: 21 } }, eat: ['함박스테이크', '브로콜리무침'] },
    { menu: ['보리밥', '순두부찌개', '오징어볶음', '도라지무침', '열무김치'], allergens: [5, 17], base: { energy: 648, protein: 28.4, iron: 2.9, calcium: 278, vitc: 24, sodium: 1862, fiber: 4.4 }, contrib: { '보리밥': { energy: 47, iron: 14, calcium: 7 }, '순두부찌개': { energy: 9, iron: 12, calcium: 24 }, '오징어볶음': { energy: 22, iron: 32, calcium: 16 }, '도라지무침': { energy: 10, iron: 18, calcium: 28 }, '열무김치': { energy: 12, iron: 24, calcium: 25 } }, eat: ['오징어볶음', '도라지무침'] },
    { menu: ['흑미밥', '김치찌개', '불고기', '숙주나물', '배추김치'], allergens: [5, 10, 16], base: { energy: 742, protein: 35.2, iron: 3.6, calcium: 334, vitc: 18, sodium: 1968, fiber: 4.9 }, contrib: { '흑미밥': { energy: 45, iron: 16, calcium: 6 }, '김치찌개': { energy: 11, iron: 18, calcium: 16 }, '불고기': { energy: 26, iron: 42, calcium: 8 }, '숙주나물': { energy: 7, iron: 12, calcium: 18 }, '배추김치': { energy: 11, iron: 12, calcium: 52 } }, eat: ['불고기'] },
    { menu: ['잡곡밥', '닭곰탕', '고등어구이', '시금치나물', '배추김치'], allergens: [7, 15], base: { energy: 668, protein: 33.4, iron: 3.2, calcium: 318, vitc: 22, sodium: 1802, fiber: 4.6 }, contrib: { '잡곡밥': { energy: 46, iron: 11, calcium: 7 }, '닭곰탕': { energy: 14, iron: 22, calcium: 24 }, '고등어구이': { energy: 24, iron: 24, calcium: 32 }, '시금치나물': { energy: 6, iron: 28, calcium: 28 }, '배추김치': { energy: 10, iron: 15, calcium: 9 } }, eat: ['고등어구이', '시금치나물'] },
    { menu: ['백미밥', '사골국', '돈육두루치기', '파프리카잡채', '배추김치'], allergens: [1, 5, 6, 10], base: { energy: 754, protein: 34.8, iron: 2.8, calcium: 318, vitc: 32, sodium: 1894, fiber: 4.8 }, contrib: { '백미밥': { energy: 44, iron: 8, calcium: 5 }, '사골국': { energy: 8, iron: 6, calcium: 42 }, '돈육두루치기': { energy: 28, iron: 38, calcium: 10 }, '파프리카잡채': { energy: 12, iron: 22, calcium: 28 }, '배추김치': { energy: 8, iron: 26, calcium: 15 } }, eat: ['돈육두루치기', '파프리카잡채'] },
  ]

  // 기타 공통 메뉴
  const MENUS_COMMON = [
    { menu: ['백미밥', '미역국', '돈육볶음', '콩나물무침', '배추김치'], allergens: [5, 10, 13], base: { energy: 646, protein: 28.2, iron: 2.8, calcium: 298, vitc: 18, sodium: 1840, fiber: 4.2 }, contrib: { '백미밥': { energy: 52, iron: 8, calcium: 5 }, '미역국': { energy: 6, iron: 18, calcium: 31 }, '돈육볶음': { energy: 24, iron: 42, calcium: 12 }, '콩나물무침': { energy: 8, iron: 22, calcium: 18 }, '배추김치': { energy: 10, iron: 10, calcium: 34 } }, eat: ['돈육볶음', '미역국'] },
    { menu: ['잡곡밥', '된장찌개', '제육볶음', '시금치나물', '깍두기'], allergens: [5, 10], base: { energy: 698, protein: 32.1, iron: 3.8, calcium: 312, vitc: 28, sodium: 1848, fiber: 5.2 }, contrib: { '잡곡밥': { energy: 48, iron: 10, calcium: 8 }, '된장찌개': { energy: 8, iron: 14, calcium: 22 }, '제육볶음': { energy: 26, iron: 48, calcium: 14 }, '시금치나물': { energy: 6, iron: 21, calcium: 31 }, '깍두기': { energy: 12, iron: 7, calcium: 25 } }, eat: ['제육볶음', '시금치나물'] },
    { menu: ['현미밥', '콩나물국', '닭갈비', '감자볶음', '배추김치'], allergens: [1, 5, 15], base: { energy: 724, protein: 34.6, iron: 2.6, calcium: 298, vitc: 31, sodium: 1780, fiber: 4.8 }, contrib: { '현미밥': { energy: 46, iron: 12, calcium: 6 }, '콩나물국': { energy: 5, iron: 16, calcium: 18 }, '닭갈비': { energy: 28, iron: 38, calcium: 10 }, '감자볶음': { energy: 14, iron: 12, calcium: 12 }, '배추김치': { energy: 7, iron: 22, calcium: 54 } }, eat: ['닭갈비'] },
    { menu: ['백미밥', '육개장', '돈가스', '브로콜리무침', '배추김치'], allergens: [1, 5, 6, 10], base: { energy: 786, protein: 36.8, iron: 3.4, calcium: 321, vitc: 42, sodium: 1924, fiber: 5.6 }, contrib: { '백미밥': { energy: 44, iron: 7, calcium: 5 }, '육개장': { energy: 12, iron: 28, calcium: 18 }, '돈가스': { energy: 28, iron: 22, calcium: 14 }, '브로콜리무침': { energy: 8, iron: 18, calcium: 42 }, '배추김치': { energy: 8, iron: 25, calcium: 21 } }, eat: ['돈가스', '브로콜리무침'] },
    { menu: ['보리밥', '순두부찌개', '오징어볶음', '도라지무침', '열무김치'], allergens: [5, 17], base: { energy: 648, protein: 28.4, iron: 2.9, calcium: 278, vitc: 24, sodium: 1862, fiber: 4.4 }, contrib: { '보리밥': { energy: 47, iron: 14, calcium: 7 }, '순두부찌개': { energy: 9, iron: 12, calcium: 24 }, '오징어볶음': { energy: 22, iron: 32, calcium: 16 }, '도라지무침': { energy: 10, iron: 18, calcium: 28 }, '열무김치': { energy: 12, iron: 24, calcium: 25 } }, eat: ['오징어볶음', '도라지무침'] },
    { menu: ['흑미밥', '김치찌개', '불고기', '숙주나물', '배추김치'], allergens: [5, 10, 16], base: { energy: 742, protein: 35.2, iron: 3.6, calcium: 334, vitc: 18, sodium: 1968, fiber: 4.9 }, contrib: { '흑미밥': { energy: 45, iron: 16, calcium: 6 }, '김치찌개': { energy: 11, iron: 18, calcium: 16 }, '불고기': { energy: 26, iron: 42, calcium: 8 }, '숙주나물': { energy: 7, iron: 12, calcium: 18 }, '배추김치': { energy: 11, iron: 12, calcium: 52 } }, eat: ['불고기'] },
    { menu: ['백미밥', '무국', '생선구이', '콩조림', '깍두기'], allergens: [7], base: { energy: 614, protein: 29.8, iron: 2.1, calcium: 304, vitc: 14, sodium: 1724, fiber: 3.8 }, contrib: { '백미밥': { energy: 52, iron: 8, calcium: 5 }, '무국': { energy: 6, iron: 9, calcium: 14 }, '생선구이': { energy: 22, iron: 28, calcium: 28 }, '콩조림': { energy: 12, iron: 38, calcium: 38 }, '깍두기': { energy: 8, iron: 17, calcium: 15 } }, eat: ['콩조림'] },
    { menu: ['잡곡밥', '닭곰탕', '고등어구이', '시금치나물', '배추김치'], allergens: [7, 15], base: { energy: 668, protein: 33.4, iron: 3.2, calcium: 318, vitc: 22, sodium: 1802, fiber: 4.6 }, contrib: { '잡곡밥': { energy: 46, iron: 11, calcium: 7 }, '닭곰탕': { energy: 14, iron: 22, calcium: 24 }, '고등어구이': { energy: 24, iron: 24, calcium: 32 }, '시금치나물': { energy: 6, iron: 28, calcium: 28 }, '배추김치': { energy: 10, iron: 15, calcium: 9 } }, eat: ['고등어구이', '시금치나물'] },
    { menu: ['백미밥', '부대찌개', '두부조림', '고사리나물', '배추김치'], allergens: [1, 2, 5, 6, 10], base: { energy: 758, protein: 31.6, iron: 2.8, calcium: 294, vitc: 16, sodium: 2084, fiber: 4.2 }, contrib: { '백미밥': { energy: 48, iron: 7, calcium: 4 }, '부대찌개': { energy: 18, iron: 14, calcium: 18 }, '두부조림': { energy: 14, iron: 24, calcium: 36 }, '고사리나물': { energy: 12, iron: 36, calcium: 18 }, '배추김치': { energy: 8, iron: 19, calcium: 24 } }, eat: ['두부조림', '고사리나물'] },
    { menu: ['현미밥', '사골국', '돈육두루치기', '호박볶음', '배추김치'], allergens: [10], base: { energy: 712, protein: 30.8, iron: 2.4, calcium: 352, vitc: 19, sodium: 1836, fiber: 4.0 }, contrib: { '현미밥': { energy: 46, iron: 13, calcium: 6 }, '사골국': { energy: 8, iron: 6, calcium: 42 }, '돈육두루치기': { energy: 28, iron: 38, calcium: 10 }, '호박볶음': { energy: 10, iron: 18, calcium: 18 }, '배추김치': { energy: 8, iron: 25, calcium: 24 } }, eat: ['돈육두루치기'] },
    { menu: ['잡곡밥', '미역국', '오리고기볶음', '청경채볶음', '배추김치'], allergens: [5], base: { energy: 674, protein: 31.4, iron: 3.4, calcium: 308, vitc: 38, sodium: 1768, fiber: 4.8 }, contrib: { '잡곡밥': { energy: 47, iron: 10, calcium: 7 }, '미역국': { energy: 6, iron: 14, calcium: 28 }, '오리고기볶음': { energy: 24, iron: 36, calcium: 12 }, '청경채볶음': { energy: 11, iron: 22, calcium: 34 }, '배추김치': { energy: 12, iron: 18, calcium: 19 } }, eat: ['오리고기볶음', '청경채볶음'] },
    { menu: ['백미밥', '황태해장국', '닭볶음탕', '연근조림', '배추김치'], allergens: [15], base: { energy: 728, protein: 34.8, iron: 2.6, calcium: 288, vitc: 20, sodium: 1894, fiber: 4.4 }, contrib: { '백미밥': { energy: 50, iron: 8, calcium: 5 }, '황태해장국': { energy: 8, iron: 18, calcium: 16 }, '닭볶음탕': { energy: 26, iron: 28, calcium: 12 }, '연근조림': { energy: 8, iron: 18, calcium: 38 }, '배추김치': { energy: 8, iron: 28, calcium: 29 } }, eat: ['닭볶음탕', '연근조림'] },
    { menu: ['콩나물밥', '버섯국', '간장계란장조림', '파프리카잡채', '배추김치'], allergens: [1, 5, 6], base: { energy: 618, protein: 26.8, iron: 2.2, calcium: 264, vitc: 48, sodium: 1714, fiber: 4.2 }, contrib: { '콩나물밥': { energy: 44, iron: 18, calcium: 14 }, '버섯국': { energy: 7, iron: 12, calcium: 8 }, '간장계란장조림': { energy: 16, iron: 24, calcium: 28 }, '파프리카잡채': { energy: 21, iron: 22, calcium: 26 }, '배추김치': { energy: 12, iron: 24, calcium: 24 } }, eat: ['파프리카잡채', '간장계란장조림'] },
    { menu: ['백미밥', '순대국', '돼지갈비구이', '깻잎무침', '깍두기'], allergens: [5, 10], base: { energy: 824, protein: 38.4, iron: 4.2, calcium: 312, vitc: 22, sodium: 2028, fiber: 4.6 }, contrib: { '백미밥': { energy: 44, iron: 7, calcium: 5 }, '순대국': { energy: 14, iron: 14, calcium: 18 }, '돼지갈비구이': { energy: 32, iron: 52, calcium: 8 }, '깻잎무침': { energy: 4, iron: 18, calcium: 42 }, '깍두기': { energy: 6, iron: 9, calcium: 27 } }, eat: ['돼지갈비구이', '깻잎무침'] },
    { menu: ['잡곡밥', '시금치된장국', '떡갈비', '콩나물무침', '열무김치'], allergens: [5, 6, 10, 16], base: { energy: 696, protein: 30.6, iron: 3.4, calcium: 296, vitc: 26, sodium: 1842, fiber: 4.6 }, contrib: { '잡곡밥': { energy: 47, iron: 11, calcium: 7 }, '시금치된장국': { energy: 7, iron: 22, calcium: 28 }, '떡갈비': { energy: 24, iron: 36, calcium: 10 }, '콩나물무침': { energy: 10, iron: 22, calcium: 18 }, '열무김치': { energy: 12, iron: 9, calcium: 37 } }, eat: ['떡갈비', '시금치된장국'] },
    { menu: ['현미밥', '갈비탕', '소불고기', '시금치무침', '배추김치'], allergens: [5, 16], base: { energy: 754, protein: 36.4, iron: 4.1, calcium: 342, vitc: 24, sodium: 1918, fiber: 4.8 }, contrib: { '현미밥': { energy: 44, iron: 13, calcium: 6 }, '갈비탕': { energy: 14, iron: 18, calcium: 38 }, '소불고기': { energy: 28, iron: 48, calcium: 8 }, '시금치무침': { energy: 6, iron: 14, calcium: 32 }, '배추김치': { energy: 8, iron: 7, calcium: 16 } }, eat: ['소불고기', '시금치무침'] },
  ]

  function getSeasonMul(dateStr) {
    const month = parseInt(dateStr.split('-')[1])
    if (month >= 3 && month <= 5) return 0.88 + Math.random() * 0.04  // 봄: 680-780 base range
    if (month >= 6 && month <= 8) return 0.76 + Math.random() * 0.04  // 여름: 580-700
    if (month >= 9 && month <= 11) return 0.86 + Math.random() * 0.04  // 가을: 650-780
    return 0.80 + Math.random() * 0.04  // 겨울: 600-720
  }

  function generateForSchool(schoolId, menuSet, seed, anomalyDates) {
    const days = getWeekdays('2023-09-01', '2024-11-30')
    const rand = seededRand(seed)

    return days.map(date => {
      const menuIdx = Math.floor(rand() * menuSet.length)
      const tpl = menuSet[menuIdx]
      const isAno = anomalyDates.has(date)
      const month = parseInt(date.split('-')[1])
      const dow = new Date(date).getDay() // 1=Mon, 5=Fri
      const isFriday = dow === 5
      const isSummer = month >= 6 && month <= 8
      const isWinter = month === 12 || month <= 2

      // 계절 베이스
      const seasonMul = isSummer ? (0.76 + rand() * 0.04) : isWinter ? (0.80 + rand() * 0.04) : (month >= 3 && month <= 5 ? 0.88 + rand() * 0.04 : 0.86 + rand() * 0.04)
      // 금요일 패턴
      const fridayMul = isFriday ? 0.92 : 1.0
      const noise = () => 0.88 + rand() * 0.24

      let energy = Math.round(tpl.base.energy * seasonMul * fridayMul * noise())
      let iron = parseFloat((tpl.base.iron * seasonMul * noise()).toFixed(1))
      let calcium = Math.round(tpl.base.calcium * seasonMul * noise())
      let protein = parseFloat((tpl.base.protein * seasonMul * noise()).toFixed(1))
      let vitc = parseFloat((tpl.base.vitc * seasonMul * noise()).toFixed(0))
      let sodium = Math.round(tpl.base.sodium * noise())
      let fiber = parseFloat((tpl.base.fiber * noise()).toFixed(1))

      // 이상치 적용
      const anoTypes = ['energy', 'iron', 'calcium', 'energy', 'iron', 'energy', 'calcium', 'iron', 'energy', 'energy', 'iron', 'calcium']
      if (isAno) {
        const anoIdx = [...anomalyDates].indexOf(date) % anoTypes.length
        const anoType = anoTypes[Math.max(0, anoIdx)]
        if (anoType === 'energy') energy = 360 + Math.floor(rand() * 80)
        if (anoType === 'iron') iron = parseFloat((0.7 + rand() * 0.5).toFixed(1))
        if (anoType === 'calcium') calcium = 110 + Math.floor(rand() * 60)
      }

      const mar = Math.min(100, Math.round(
        ((Math.min(energy / 850, 1) + Math.min(protein / 25, 1) + Math.min(iron / 5, 1) + Math.min(calcium / 300, 1) + Math.min(vitc / 35, 1)) / 5) * 100
      ))

      const dds = new Set([
        true,
        tpl.menu.some(m => ['고기', '육', '닭', '돼지', '소', '생선', '어', '두부', '콩', '달걀', '오리', '갈비', '불고기', '돈가스', '떡갈비', '함박'].some(k => m.includes(k))),
        tpl.menu.some(m => ['나물', '무침', '채소', '시금치', '콩나물', '배추', '브로콜리', '청경채', '샐러드', '파프리카'].some(k => m.includes(k))),
        tpl.menu.some(m => ['국', '찌개', '탕', '수프'].some(k => m.includes(k))),
      ]).size

      const anomalyScore = isAno ? 0.75 + rand() * 0.25 : rand() * 0.3

      return {
        date,
        school_id: schoolId,
        menu: tpl.menu,
        allergens: tpl.allergens,
        nutrients: {
          energy_kcal: energy,
          protein_g: protein,
          iron_mg: iron,
          calcium_mg: calcium,
          vitc_mg: vitc,
          fat_g: parseFloat((energy * 0.28 / 9).toFixed(1)),
          carb_g: parseFloat((energy * 0.56 / 4).toFixed(1)),
          sodium_mg: sodium,
          fiber_g: fiber,
        },
        scores: {
          mar,
          dds,
          inq_energy: parseFloat((energy / 850).toFixed(2)),
          anomaly_score: parseFloat(anomalyScore.toFixed(2)),
          is_anomaly: isAno || anomalyScore > 0.7,
        },
        contribution: tpl.contrib,
        eat_recommendation: tpl.eat,
        skip_recommendation: sodium > 2000 ? [tpl.menu[tpl.menu.length - 1]] : [],
        weather: WEATHERS[Math.floor(rand() * WEATHERS.length)],
        temperature: isSummer ? 28 + Math.floor(rand() * 8) : isWinter ? 2 + Math.floor(rand() * 8) : 10 + Math.floor(rand() * 10),
      }
    })
  }

  return [
    ...generateForSchool('HS001', MENUS_JEONNAM, 42, new Set([
      '2023-09-12', '2023-10-18', '2023-11-07', '2023-12-05',
      '2024-01-16', '2024-02-14', '2024-03-19', '2024-04-23',
      '2024-05-14', '2024-06-18', '2024-07-11', '2024-09-03',
    ])),
    ...generateForSchool('HS002', MENUS_JEONNAM, 43, new Set([
      '2023-09-19', '2023-10-25', '2023-11-14', '2023-12-12',
      '2024-01-23', '2024-02-21', '2024-03-26', '2024-04-30',
      '2024-05-21', '2024-06-25', '2024-07-18', '2024-10-08',
    ])),
    ...generateForSchool('HS009', MENUS_SEOUL, 91, new Set([
      '2023-09-26', '2023-10-31', '2023-11-21', '2023-12-19',
      '2024-01-30', '2024-02-28', '2024-04-02', '2024-05-07',
      '2024-06-04', '2024-09-10', '2024-10-15', '2024-11-19',
    ])),
    ...generateForSchool('HS010', MENUS_SEOUL, 92, new Set([
      '2023-09-05', '2023-10-10', '2023-11-08', '2023-12-06',
      '2024-01-09', '2024-02-07', '2024-03-12', '2024-04-09',
      '2024-05-08', '2024-06-11', '2024-09-17', '2024-10-22',
    ])),
    ...generateForSchool('HS019', MENUS_COMMON, 193, new Set([
      '2023-09-13', '2023-10-17', '2023-11-15', '2023-12-13',
      '2024-01-17', '2024-02-15', '2024-03-20', '2024-04-17',
      '2024-05-15', '2024-06-19', '2024-09-18', '2024-10-23',
    ])),
    ...generateForSchool('HS020', MENUS_COMMON, 194, new Set([
      '2023-09-20', '2023-10-24', '2023-11-22', '2023-12-20',
      '2024-01-24', '2024-02-22', '2024-03-27', '2024-04-24',
      '2024-05-22', '2024-06-26', '2024-09-25', '2024-10-30',
    ])),
    ...generateForSchool('HS027', MENUS_COMMON, 271, new Set([
      '2023-09-06', '2023-10-11', '2023-11-09', '2023-12-07',
      '2024-01-10', '2024-02-08', '2024-03-13', '2024-04-10',
      '2024-05-09', '2024-06-12', '2024-09-11', '2024-10-16',
    ])),
    ...generateForSchool('HS033', MENUS_COMMON, 333, new Set([
      '2023-09-27', '2023-11-01', '2023-11-29', '2023-12-27',
      '2024-01-31', '2024-02-29', '2024-03-28', '2024-04-25',
      '2024-05-30', '2024-06-27', '2024-09-26', '2024-10-31',
    ])),
    ...generateForSchool('HS043', MENUS_JEJU, 431, new Set([
      '2023-09-14', '2023-10-19', '2023-11-16', '2023-12-14',
      '2024-01-18', '2024-02-16', '2024-03-21', '2024-04-18',
      '2024-05-16', '2024-06-20', '2024-09-19', '2024-10-24',
    ])),
    ...generateForSchool('HS047', MENUS_COMMON, 471, new Set([
      '2023-09-21', '2023-10-26', '2023-11-23', '2023-12-21',
      '2024-01-25', '2024-02-23', '2024-03-28', '2024-04-26',
      '2024-05-24', '2024-06-28', '2024-09-27', '2024-10-25',
    ])),
  ]
})()
