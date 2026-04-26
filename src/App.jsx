import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import HistoriquePage from './pages/HistoriquePage'
import SacPage from './pages/SacPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/historique"  element={<HistoriquePage />} />
          <Route path="/sac"      element={<SacPage />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}