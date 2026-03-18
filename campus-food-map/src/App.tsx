import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { University } from './types'
import { universities } from './data/restaurants'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import ListPage from './pages/ListPage'
import RandomPage from './pages/RandomPage'
import RankPage from './pages/RankPage'
import GroupOrderPage from './pages/GroupOrderPage'
import DetailPage from './pages/DetailPage'
import ProfilePage from './pages/ProfilePage'
import InsightsPage from './pages/InsightsPage'
import TuanziInsightsPage from './pages/TuanziInsightsPage'
import ChatAgent from './components/ChatAgent'

function App() {
  const [selectedUniversity, setSelectedUniversity] = useState<University | 'all'>('all')
  const location = useLocation()
  const isDetailPage = location.pathname.startsWith('/restaurant/')
  const isInsightsPage = location.pathname === '/profile/insights'
  const isTuanziInsightsPage = location.pathname === '/profile/tuanzi'

  return (
    <div className="app">
      {!isDetailPage && !isInsightsPage && !isTuanziInsightsPage && (
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">美</div>
              <div className="logo-text">
                <span className="brand">美团·大学城美食</span>
                <span className="slogan">同学都在吃什么</span>
              </div>
            </div>
            <div className="university-selector">
              <span className="loc-icon">•</span>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value as University | 'all')}
              >
                <option value="all">全部学校</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.name}>
                    {uni.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage university={selectedUniversity} />} />
          <Route path="/map" element={<MapPage university={selectedUniversity} />} />
          <Route path="/group" element={<GroupOrderPage university={selectedUniversity} />} />
          <Route path="/random" element={<RandomPage university={selectedUniversity} />} />
          <Route path="/ai" element={<ChatAgent university={selectedUniversity} />} />
          <Route path="/rank" element={<RankPage university={selectedUniversity} />} />
          <Route path="/rank/:rankId" element={<RankPage university={selectedUniversity} />} />
          <Route path="/list" element={<ListPage university={selectedUniversity} />} />
          <Route path="/restaurant/:id" element={<DetailPage />} />
          <Route path="/profile" element={<ProfilePage university={selectedUniversity} />} />
          <Route path="/profile/insights" element={<InsightsPage />} />
          <Route path="/profile/tuanzi" element={<TuanziInsightsPage />} />
        </Routes>
      </main>

      {!isDetailPage && !isInsightsPage && !isTuanziInsightsPage && (
        <nav className="nav">
          <ul className="nav-list">
            <li>
              <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span className="label">首页</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/ai" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                </svg>
                <span className="label">团子</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/random" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z"/>
                </svg>
                <span className="label">随机吃</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/group" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <span className="label">拼单</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/rank" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>
                </svg>
                <span className="label">榜单</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <svg className="nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span className="label">我的</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}

export default App
