import { useAuth } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'

const IcoDashboard = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2E86C1' : '#B0BFCC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const IcoJournal = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2E86C1' : '#B0BFCC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const IcoSac = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2E86C1' : '#B0BFCC'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
)

const NAV = [
  { path: '/',        label: 'Accueil',    Icon: IcoDashboard },
  { path: '/historique', label: 'Historique', Icon: IcoJournal   },
  { path: '/sac',     label: 'Sac',        Icon: IcoSac       },
]

export default function AppLayout({ children }) {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#fff', borderBottom: '1px solid #E8ECF0',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 100, boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 120 120" fill="none">
            <rect width="120" height="120" rx="26" fill="#0A1E3D"/>
            <path d="M52 32H68V48H84V64H68V88H52V64H36V48H52Z" fill="#2E86C1"/>
          </svg>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#0A1E3D' }}>Assist</span>
            <span style={{ color: '#2E86C1' }}>Ambu</span>
            <span style={{ fontSize: 9, color: '#D4860B', fontWeight: 700, marginLeft: 6, background: '#FBF1E0', padding: '2px 6px', borderRadius: 4 }}>BÊTA</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8694A7' }}>{user?.name}</span>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8694A7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ paddingTop: 56, paddingBottom: 72 }}>
        {children}
      </div>

      {/* Tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid #E8ECF0',
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
      }}>
        {NAV.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <Link key={path} to={path} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '10px 0', textDecoration: 'none', gap: 3,
            }}>
              <Icon active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#2E86C1' : '#B0BFCC' }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}