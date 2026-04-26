import { useEffect, useState, useCallback } from 'react'
import { shiftsApi, interventionsApi, itemsApi } from '../lib/api'
import NouvelleIntervention from '../components/NouvelleIntervention'

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (seconds < 120) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${h}h${String(m).padStart(2, '0')}`
}

function formatAmplitude(seconds) {
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (m < 60) return `${m}min`
  return `${h}h${String(m % 60).padStart(2, '0')}`
}

function formatTime(dateStr) {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function useTimer(startedAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    update()
    let interval = setInterval(update, 1000)
    const timeout = setTimeout(() => { clearInterval(interval); interval = setInterval(update, 60000) }, 120000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [startedAt])
  return elapsed
}

export default function DashboardPage() {
  const [loading, setLoading]     = useState(true)
  const [shift, setShift]         = useState(null)
  const [interventions, setInterventions] = useState([])
  const [alerts, setAlerts]       = useState([])
  const [showStart, setShowStart] = useState(false)
  const [showEnd, setShowEnd]     = useState(false)
  const [showInterv, setShowInterv] = useState(false)
  const [driver, setDriver]       = useState(null)
  const [breakMin, setBreakMin]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const elapsed = useTimer(shift?.started_at)

  const load = useCallback(async () => {
    try {
      const [shiftsData, alertsData] = await Promise.all([shiftsApi.index(), itemsApi.alerts()])
      const active = shiftsData.find(s => !s.ended_at)
      setShift(active || null)
      if (active) {
        const data = await interventionsApi.byShift(active.id)
        setInterventions(data)
      } else {
        setInterventions([])
      }
      setAlerts(alertsData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const startShift = async () => {
    if (driver === null) return
    setActionLoading(true)
    try {
      const s = await shiftsApi.store({ driver, started_at: new Date().toISOString() })
      setShift(s); setInterventions([]); setShowStart(false); setDriver(null)
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const endShift = async () => {
    setActionLoading(true)
    try {
      await shiftsApi.end(shift.id, { break_minutes: parseInt(breakMin) || 0 })
      setShift(null); setInterventions([]); setShowEnd(false); setBreakMin('')
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const onIntervSuccess = async () => {
    if (shift) {
      const data = await interventionsApi.byShift(shift.id)
      setInterventions(data)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: '16px' }}>

      {/* Alertes DLC */}
      {alerts.length > 0 && (
        <div style={{ background: '#FBF1E0', border: '1px solid #F5CBA7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D4860B', fontWeight: 500 }}>
          ⚠️ {alerts.length} article{alerts.length > 1 ? 's' : ''} nécessite{alerts.length > 1 ? 'nt' : ''} votre attention
        </div>
      )}

      {/* Carte garde */}
      {shift ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {/* Badge + timer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1D8348', letterSpacing: 1 }}>GARDE EN COURS</span>
            </div>
            <div style={{ background: '#E3F0FA', borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: '#2E86C1', fontFamily: 'monospace' }}>
              {formatTimer(elapsed)}
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1E3D', marginBottom: 2 }}>{shift.driver ? 'Conducteur' : 'Équipier'}</div>
          <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Depuis {formatTime(shift.started_at)}</div>

          {/* Stats */}
          <div style={{ display: 'flex', background: '#F7F8FA', borderRadius: 10, border: '1px solid #E8ECF0', marginBottom: 12 }}>
            {[
              { label: 'Interventions', value: interventions.length },
              { label: 'Amplitude',     value: formatAmplitude(elapsed) },
              { label: 'Pause',         value: `${shift.break_minutes || 0}min` },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 6px', borderRight: i < 2 ? '1px solid #E8ECF0' : 'none' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#8694A7', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Boutons */}
          <button
            onClick={() => setShowInterv(true)}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#E3F0FA', color: '#2E86C1', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}
          >
            + Nouvelle intervention
          </button>
          <button
            onClick={() => setShowEnd(true)}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#C0392B', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
          >
            Terminer la garde
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E8ECF0', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1E3D', marginBottom: 6 }}>Aucune garde en cours</div>
          <div style={{ fontSize: 13, color: '#8694A7', marginBottom: 18, lineHeight: 1.5 }}>Démarrez une nouvelle garde pour enregistrer vos interventions.</div>
          <button
            onClick={() => setShowStart(true)}
            style={{ background: '#0A1E3D', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
          >
            Démarrer une garde
          </button>
        </div>
      )}

      {/* Bandeau bêta */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
        🧪 <strong>Version bêta</strong> — Merci de nous faire part de vos retours pour améliorer l'application !
      </div>

      {/* Modal démarrer */}
      {showStart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 40, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0A1E3D' }}>Démarrer une garde</span>
              <button onClick={() => setShowStart(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Votre rôle</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[{ val: true, label: '🚗 Conducteur' }, { val: false, label: '🧰 Équipier' }].map(r => (
                <button key={String(r.val)} onClick={() => setDriver(r.val)} style={{ flex: 1, padding: '14px 10px', borderRadius: 12, border: `1.5px solid ${driver === r.val ? '#2E86C1' : '#E8ECF0'}`, background: driver === r.val ? '#E3F0FA' : '#F7F8FA', color: driver === r.val ? '#2E86C1' : '#4A5568', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={startShift}
              disabled={driver === null || actionLoading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: driver === null ? '#CBD5E0' : '#0A1E3D', color: '#fff', fontWeight: 700, fontSize: 15, cursor: driver === null ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            >
              {actionLoading ? 'Démarrage...' : 'Démarrer'}
            </button>
          </div>
        </div>
      )}

      {/* Modal terminer */}
      {showEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 40, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0A1E3D' }}>Terminer la garde</span>
              <button onClick={() => setShowEnd(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Pause (en minutes)</div>
            <input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} placeholder="0" style={{ width: '100%', height: 48, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 16, marginBottom: 6, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
            <div style={{ fontSize: 11, color: '#8694A7', marginBottom: 24 }}>Durée totale de pause durant la garde</div>
            <button
              onClick={endShift}
              disabled={actionLoading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#C0392B', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            >
              {actionLoading ? 'Fin de garde...' : 'Terminer la garde'}
            </button>
          </div>
        </div>
      )}

      {/* Formulaire intervention */}
      <NouvelleIntervention
        visible={showInterv}
        onClose={() => setShowInterv(false)}
        shiftId={shift?.id}
        onSuccess={onIntervSuccess}
      />
    </div>
  )
}