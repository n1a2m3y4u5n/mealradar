# MealRadar

전국 고등학교 급식 영양과 학생 체력 데이터를 결합해 분석하고, 정책 담당자와 영양교사가 쓸 수 있게 만든 웹 서비스입니다.

## 소개

그동안 따로 관리되던 두 공공 데이터, 급식 영양(NEIS)과 학생 체력평가(학교알리미 PAPS)를 학교 단위로 결합해 전국 고등학교 2,314개교의 통합 데이터셋을 만들었습니다. 이 데이터로 영양 격차의 분포와 지리적 군집을 분석하고, 분석 결과를 지도, 대시보드, 학교별 진단 화면으로 제공합니다. 수치는 코드가 계산하고, Claude API는 그 수치를 해석해 정책 초안과 식단 조언을 쓰는 데만 씁니다.

분석 방법과 결과의 상세는 [REPORT.md](REPORT.md)에 있습니다.

## 주요 기능

- 전국 지도: 학교를 좌표 기반으로 표시해 저영양 군집을 보여 줍니다.
- 전국 대시보드: 불평등 지표, MAR 분포, 영양소별 결핍률, 학교 유형별 IQR, 예산-MAR 산점도, K-means 군집, 정책 시뮬레이터, 영양 상관 행렬
- 지역, 도시별 화면과 불평등 분석, 체력 상관 화면
- 학교 상세 진단: 영양 분석, 체력(PAPS), 급식 달력, 계절성, 만족도 투표, 개선 요청서(리포트) 등
- AI 기능 4종 (모두 Claude API):
  - 정책 제안: 17개 시도의 격차 통계로 정책 초안 작성
  - 영양교사 어시스턴트: 학교의 영양 지표와 최근 식단을 바탕으로 대화형 조언
  - 학생 페르소나: 오늘 급식에 대한 학생 반응 분석
  - 급식 맛 순위: 최근 식단의 선호도 순위
- 알레르기 설정 시 해당 원료가 든 급식에 경보 표시

## 기술

- 프런트엔드: React 19, Vite, react-router, Leaflet, D3, Recharts
- 백엔드: Node.js (Express 5), NEIS 급식 API 중계, PAPS 데이터 조회, Anthropic SDK
- 데이터 수집, 가공: Python, Node 스크립트 (`scripts/`, `server/scripts/`)
- 배포: Docker, fly.io (도쿄)

## 실행 방법

```bash
npm install
```

프로젝트 루트에 `.env`를 만들고 키를 설정합니다.

```
NEIS_API_KEY=
ANTHROPIC_API_KEY=
```

데이터 수집 스크립트(`scripts/`, `server/scripts/`)는 `NEIS_API_KEYS`(쉼표로 여러 개)와 학교알리미 `SCHOOLINFO_API_KEY` 환경변수를 씁니다.

```bash
npm run dev:all      # Vite 개발 서버(프런트)와 Express 서버(:3001)를 함께 실행
```

따로 실행하려면 `npm run dev`(프런트)와 `npm run server`(API)를 각각 실행합니다. 프로덕션 빌드는 `npm run build`이고, Express 서버가 `dist/`를 함께 서빙합니다.
