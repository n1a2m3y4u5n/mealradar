import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './components/layout/Header.jsx'
import { NationalDashboard } from './pages/NationalDashboard.jsx'
import { SchoolDetail } from './pages/SchoolDetail.jsx'
import { ToolsPage } from './pages/ToolsPage.jsx'
import { RegionDashboard } from './pages/RegionDashboard.jsx'
import { CityView } from './pages/CityView.jsx'
import { AboutPage } from './pages/AboutPage.jsx'
import { MapView } from './pages/MapView.jsx'
import { InequalityPage } from './pages/InequalityPage.jsx'
import { ReportChartsPage } from './components/ReportCharts.jsx'
import { FitnessCorrelation } from './pages/FitnessCorrelation.jsx'

function SideNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const items = [
    { icon: '🗺', path: '/', exact: true, label: '지도' },
    { icon: '📊', path: '/dashboard', label: '통계' },
    { icon: '🔍', path: '/cities', label: '지역' },
    { icon: '⚖️', path: '/inequality', label: '불평등' },
    { icon: '💪', path: '/fitness', label: '체력' },
    { icon: '🧮', path: '/tools', label: '도구' },
    { icon: 'ℹ️', path: '/about', label: '정보' },
  ]
  const isActive = (item) => item.exact
    ? location.pathname === item.path
    : item.path === '/cities'
      ? location.pathname === '/cities'
      : location.pathname.startsWith(item.path)

  return (
    <div style={{
      position: 'fixed', left: 0, top: 52, height: 'calc(100vh - 52px)', width: 64,
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12,
      gap: 4, zIndex: 90,
    }}>
      {items.map(item => (
        <button key={item.path} onClick={() => navigate(item.path)}
          style={{
            width: 48, height: 48, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: isActive(item) ? 'rgba(0,229,255,0.1)' : 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, fontSize: 20,
            borderLeft: isActive(item) ? '3px solid var(--cyan)' : '3px solid transparent',
            transition: 'all 0.2s',
          }}
          title={item.label}
        >
          {item.icon}
          <span style={{ fontSize: 9, color: isActive(item) ? 'var(--cyan)' : 'var(--text-muted)' }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <SideNav />
      <main style={{ paddingTop: 52, paddingLeft: 64 }}>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/dashboard" element={<NationalDashboard />} />
          <Route path="/school/:id" element={<SchoolDetail />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/cities" element={<CityView />} />
          <Route path="/region/:regionCode" element={<RegionDashboard />} />
          <Route path="/inequality" element={<InequalityPage />} />
          <Route path="/fitness" element={<FitnessCorrelation />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/report-charts" element={<ReportChartsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
