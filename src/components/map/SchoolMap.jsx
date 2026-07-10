import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from 'react-router-dom'
import { mockSchools } from '../../data/mockSchools.js'

// 시군구 단위 정밀 좌표 (spread는 해당 시군구 내 학교 분포 범위)
const CITY_COORDS = {
  // ── 특별·광역시 구 ──────────────────────────────────────────────
  '강동구':   { base: [37.530, 127.124], spread: 0.010 },
  '강서구':   { base: [37.550, 126.850], spread: 0.010 },
  '도봉구':   { base: [37.668, 127.047], spread: 0.010 },
  '마포구':   { base: [37.562, 126.909], spread: 0.010 },
  '성동구':   { base: [37.563, 127.037], spread: 0.009 },
  '성북구':   { base: [37.589, 127.017], spread: 0.010 },
  '송파구':   { base: [37.514, 127.106], spread: 0.012 },
  '양천구':   { base: [37.517, 126.866], spread: 0.009 },
  '영등포구': { base: [37.523, 126.896], spread: 0.010 },
  '종로구':   { base: [37.573, 126.979], spread: 0.009 },
  '중랑구':   { base: [37.600, 127.093], spread: 0.010 },
  '동래구':   { base: [35.204, 129.082], spread: 0.009 },
  '부산진구': { base: [35.161, 129.053], spread: 0.010 },
  '해운대구': { base: [35.163, 129.136], spread: 0.011 },
  // ── 경기 ────────────────────────────────────────────────────────
  '고양시':   { base: [37.658, 126.832], spread: 0.025 },
  '부천시':   { base: [37.503, 126.766], spread: 0.018 },
  '성남시':   { base: [37.419, 127.127], spread: 0.022 },
  '수원시':   { base: [37.263, 127.029], spread: 0.022 },
  '안산시':   { base: [37.321, 126.831], spread: 0.020 },
  '용인시':   { base: [37.234, 127.200], spread: 0.028 },
  '의정부시': { base: [37.738, 127.047], spread: 0.018 },
  '평택시':   { base: [36.992, 127.113], spread: 0.025 },
  // ── 강원 ────────────────────────────────────────────────────────
  '강릉시':   { base: [37.751, 128.876], spread: 0.018 },
  '삼척시':   { base: [37.450, 129.165], spread: 0.015 },
  '속초시':   { base: [38.207, 128.592], spread: 0.012 },
  '원주시':   { base: [37.342, 127.921], spread: 0.018 },
  '춘천시':   { base: [37.882, 127.730], spread: 0.018 },
  '태백시':   { base: [37.163, 128.985], spread: 0.012 },
  // ── 충남 ────────────────────────────────────────────────────────
  '보령시':   { base: [36.333, 126.613], spread: 0.015 },
  '서산시':   { base: [36.785, 126.450], spread: 0.018 },
  '아산시':   { base: [36.790, 127.001], spread: 0.018 },
  '천안시':   { base: [36.806, 127.152], spread: 0.022 },
  '홍성군':   { base: [36.601, 126.661], spread: 0.015 },
  // ── 전남 ────────────────────────────────────────────────────────
  '고흥군':   { base: [34.611, 127.285], spread: 0.022 },
  '강진군':   { base: [34.642, 126.769], spread: 0.015 },
  '광양시':   { base: [34.941, 127.696], spread: 0.015 },
  '나주시':   { base: [34.989, 126.712], spread: 0.018 },
  '담양군':   { base: [35.321, 126.989], spread: 0.015 },
  '목포시':   { base: [34.812, 126.393], spread: 0.015 },
  '순천시':   { base: [34.951, 127.487], spread: 0.018 },
  '여수시':   { base: [34.762, 127.662], spread: 0.022 },
  // ── 경북 ────────────────────────────────────────────────────────
  '안동시':   { base: [36.568, 128.729], spread: 0.018 },
  '경주시':   { base: [35.856, 129.225], spread: 0.022 },
  '구미시':   { base: [36.120, 128.344], spread: 0.018 },
  '영주시':   { base: [36.806, 128.624], spread: 0.015 },
  '포항시':   { base: [36.019, 129.343], spread: 0.022 },
  // ── 제주 ────────────────────────────────────────────────────────
  '제주시':   { base: [33.500, 126.531], spread: 0.030 },
  '서귀포시': { base: [33.253, 126.561], spread: 0.025 },
  '한림읍':   { base: [33.413, 126.264], spread: 0.012 },
  // ── 광역시 (fallback) ────────────────────────────────────────────
  '서울':  { base: [37.560, 126.970], spread: 0.045 },
  '부산':  { base: [35.180, 129.075], spread: 0.040 },
  '대구':  { base: [35.870, 128.600], spread: 0.040 },
  '인천':  { base: [37.450, 126.700], spread: 0.040 },
  '광주':  { base: [35.160, 126.851], spread: 0.030 },
  '대전':  { base: [36.350, 127.385], spread: 0.030 },
  '울산':  { base: [35.538, 129.311], spread: 0.030 },
  '세종':  { base: [36.480, 127.289], spread: 0.020 },
  // ── 도 단위 (최종 fallback) ──────────────────────────────────────
  '경기':  { base: [37.275, 127.009], spread: 0.12 },
  '강원':  { base: [37.880, 128.100], spread: 0.15 },
  '충북':  { base: [36.800, 127.730], spread: 0.10 },
  '충남':  { base: [36.310, 126.860], spread: 0.10 },
  '전북':  { base: [35.770, 127.140], spread: 0.10 },
  '전남':  { base: [34.810, 126.990], spread: 0.12 },
  '경북':  { base: [36.490, 128.890], spread: 0.14 },
  '경남':  { base: [35.460, 128.210], spread: 0.12 },
  '제주':  { base: [33.490, 126.530], spread: 0.08 },
}

function seededRand(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getSchoolCoords(school) {
  // 실제 좌표가 있으면 우선 사용
  if (school.lat && school.lng) return [school.lat, school.lng]

  // fallback: 시군구 중심 + 소량 jitter
  const coordInfo = CITY_COORDS[school.city] || CITY_COORDS[school.region] || CITY_COORDS['경기']
  const seed1 = school.id.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0)
  const seed2 = seed1 * 1.618
  const lat = coordInfo.base[0] + (seededRand(seed1) - 0.5) * coordInfo.spread * 2
  const lng = coordInfo.base[1] + (seededRand(seed2) - 0.5) * coordInfo.spread * 2
  return [lat, lng]
}

// 같은 좌표에 여러 학교가 있으면 방사형으로 분산
function buildJitteredCoords(schools) {
  const locMap = {}
  schools.forEach(s => {
    if (!s.lat || !s.lng) return
    const key = `${s.lat},${s.lng}`
    if (!locMap[key]) locMap[key] = []
    locMap[key].push(s.id)
  })
  const jitter = {}  // schoolId → [lat, lng]
  Object.entries(locMap).forEach(([key, ids]) => {
    if (ids.length <= 1) return
    const [baseLat, baseLng] = key.split(',').map(Number)
    const r = 0.003  // ~300m 반경
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / ids.length
      jitter[id] = [baseLat + r * Math.sin(angle), baseLng + r * Math.cos(angle)]
    })
  })
  return jitter
}

// 전국 MAR 분포 기반 상대 평가 (최초 1회 계산)
const _allMAR = mockSchools.map(s => s.scores.mar).sort((a, b) => a - b)
const _n = _allMAR.length
const _p25 = _allMAR[Math.floor(_n * 0.25)]
const _p50 = _allMAR[Math.floor(_n * 0.50)]
const _p75 = _allMAR[Math.floor(_n * 0.75)]

function marToColor(mar) {
  if (mar >= _p75) return '#10b981'   // 상위 25%
  if (mar >= _p50) return '#00e5ff'   // 상위 50%
  if (mar >= _p25) return '#f59e0b'   // 하위 50%
  return '#f43f5e'                    // 하위 25%
}

function marToRelLabel(mar) {
  if (mar >= _p75) return `상위 25% (≥${_p75.toFixed(0)})`
  if (mar >= _p50) return `상위 50% (≥${_p50.toFixed(0)})`
  if (mar >= _p25) return `하위 50% (≥${_p25.toFixed(0)})`
  return `하위 25% (<${_p25.toFixed(0)})`
}

// 지역 중심 좌표 (mockRegions ATPT 코드와 일치)
const REGION_CENTERS = {
  B10: [37.57, 126.98],  // 서울
  C10: [35.18, 129.07],  // 부산
  D10: [35.87, 128.60],  // 대구
  E10: [37.45, 126.70],  // 인천
  F10: [35.16, 126.85],  // 광주
  G10: [36.35, 127.38],  // 대전
  H10: [35.54, 129.31],  // 울산
  I10: [36.48, 127.29],  // 세종
  J10: [37.41, 127.52],  // 경기
  K10: [37.88, 127.73],  // 강원
  M10: [36.63, 127.49],  // 충북
  N10: [36.51, 126.80],  // 충남
  P10: [35.71, 127.14],  // 전북
  Q10: [34.81, 126.46],  // 전남
  R10: [36.49, 128.89],  // 경북
  S10: [35.46, 128.21],  // 경남
  T10: [33.49, 126.53],  // 제주
}

function MapLegend() {
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, zIndex: 1000,
      background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
      padding: '12px 14px', fontSize: 12,
    }}>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 8, color: '#e2e8f0' }}>MAR 상대 등급</div>
      {[
        { color: '#10b981', label: `상위 25% (≥${_p75.toFixed(0)})` },
        { color: '#00e5ff', label: `상위 50% (≥${_p50.toFixed(0)})` },
        { color: '#f59e0b', label: `하위 50% (≥${_p25.toFixed(0)})` },
        { color: '#f43f5e', label: `하위 25% (<${_p25.toFixed(0)})` },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 11 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function SchoolMarkers({ schools, onSelectSchool, viewMode }) {
  const navigate = useNavigate()

  if (viewMode === 'regions') {
    // 지역별 집계 마커
    const regionMap = {}
    schools.forEach(s => {
      if (!regionMap[s.regionCode]) regionMap[s.regionCode] = { schools: [], mar: 0 }
      regionMap[s.regionCode].schools.push(s)
      regionMap[s.regionCode].mar += s.scores.mar
    })

    return Object.entries(regionMap).map(([code, { schools: regionSchools, mar }]) => {
      const avgMar = mar / regionSchools.length
      const center = REGION_CENTERS[code] || [36.0, 128.0]
      const color = marToColor(avgMar)
      const regionName = regionSchools[0]?.region || code
      return (
        <CircleMarker
          key={code}
          center={center}
          radius={40}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', minWidth: 160 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{regionName}</div>
              <div>평균 MAR: <strong>{avgMar.toFixed(1)}</strong></div>
              <div>학교 수: {regionSchools.length}개교</div>
            </div>
          </Popup>
        </CircleMarker>
      )
    })
  }

  // 학교별 마커 (중복 좌표는 방사형 분산)
  const jitteredCoords = useMemo(() => buildJitteredCoords(schools), [schools])

  return schools.map(school => {
    const coords = jitteredCoords[school.id] || getSchoolCoords(school)
    const color = marToColor(school.scores.mar)
    const radius = Math.max(5, Math.min(12, school.studentCount / 80))

    return (
      <CircleMarker
        key={school.id}
        center={coords}
        radius={radius}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 1.5,
        }}
        eventHandlers={{
          click: () => onSelectSchool(school),
        }}
      >
        <Popup>
          <div style={{ fontFamily: 'sans-serif', minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{school.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              {school.region} · {school.city} · {school.type}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                background: color + '22', color, border: `1px solid ${color}55`,
                fontFamily: 'monospace',
              }}>MAR {school.scores.mar.toFixed(1)}</span>
              {school.hasNutritionTeacher && (
                <span style={{ fontSize: 11, color: '#10b981' }}>영양교사 有</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              예산 {school.budgetPerStudent.toLocaleString()}원 · {school.studentCount}명
            </div>
            <button
              onClick={() => navigate(`/school/${school.id}`)}
              style={{
                width: '100%', padding: '6px', borderRadius: 6, border: `1px solid ${color}`,
                background: color + '15', color, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              상세 보기 →
            </button>
          </div>
        </Popup>
      </CircleMarker>
    )
  })
}

export function SchoolMap({ schools, onSelectSchool, viewMode = 'schools' }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapLegend />
      <MapContainer
        center={[36.2, 127.5]}
        zoom={7}
        maxBounds={[[33.0, 124.5], [38.9, 132.0]]}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="dark-tiles"
        />
        <SchoolMarkers
          schools={schools}
          onSelectSchool={onSelectSchool}
          viewMode={viewMode}
        />
      </MapContainer>
    </div>
  )
}
