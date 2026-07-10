// 개발: VITE_API_BASE=http://localhost:3001 (.env.development)
// 프로덕션: 빈 문자열 → 같은 오리진의 /api/* 사용
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
