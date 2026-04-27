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

const TYPE_STYLES = {
  uph:        { label: 'Garde UPH',        color: '#C0392B', bg: '#FEF2F2' },
  commercial: { label: 'Garde Commercial',  color: '#2E86C1', bg: '#E3F0FA' },
  mixte:      { label: 'Garde Mixte',       color: '#8E44AD', bg: '#F0E6F6' },
}

const IcoX     = ({ color = '#4A5568' }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = ({ color = '#fff' })   => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

// ===== MODAL DÉMARRER =====
function StartShiftModal({ onClose, onConfirm, loading }) {
  const [type, setType]             = useState(null)
  const [switchTime, setSwitchTime] = useState('')

  const canStart = type !== null && (type !== 'mixte' || switchTime !== '')

  return (
    <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90%', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0A1E3D' }}>Démarrer une garde</span>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoX /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Type de garde</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: type === 'mixte' ? 16 : 0 }}>
            {Object.entries(TYPE_STYLES).map(([id, style]) => (
              <button key={id} onClick={() => setType(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px', borderRadius: 12, border: `1.5px solid ${type === id ? style.color : '#E8ECF0'}`, background: type === id ? style.bg : '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: type === id ? 700 : 500, color: type === id ? style.color : '#4A5568' }}>{style.label}</span>
              </button>
            ))}
          </div>

          {type === 'mixte' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Heure de bascule</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, background: '#FEF2F2', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', marginBottom: 4 }}>AVANT</div>
                  <div style={{ fontSize: 12, color: '#C0392B' }}>Commercial</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: '#B0BFCC', fontSize: 18 }}>→</div>
                <div style={{ flex: 1, background: '#E3F0FA', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#2E86C1', marginBottom: 4 }}>APRÈS</div>
                  <div style={{ fontSize: 12, color: '#2E86C1' }}>UPH</div>
                </div>
              </div>
              <input
                type="time"
                value={switchTime}
                onChange={e => setSwitchTime(e.target.value)}
                style={{ width: '100%', height: 48, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 16, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
              />
              <div style={{ fontSize: 11, color: '#8694A7', marginTop: 6 }}>Heure de passage en mode UPH</div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #E8ECF0' }}>
          <button
            onClick={() => onConfirm({ type, switch_time: switchTime || null })}
            disabled={!canStart || loading}
            style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: canStart ? '#0A1E3D' : '#CBD5E0', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canStart ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'DM Sans',sans-serif" }}
          >
            {loading ? 'Démarrage...' : <><IcoCheck />Démarrer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== MODAL TERMINER =====
function EndShiftModal({ onClose, onConfirm, loading }) {
  const [breakMin, setBreakMin] = useState('')

  return (
    <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24, paddingBottom: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0A1E3D' }}>Terminer la garde</span>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoX /></button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Pause (en minutes)</div>
        <input type="number" value={breakMin} onChange={e => setBreakMin(e.target.value)} placeholder="0" style={{ width: '100%', height: 48, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 16, boxSizing: 'border-box', outline: 'none', marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }} />
        <div style={{ fontSize: 11, color: '#8694A7', marginBottom: 24 }}>Durée totale de pause durant la garde</div>
        <button onClick={() => onConfirm({ break_minutes: parseInt(breakMin) || 0 })} disabled={loading} style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: '#C0392B', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {loading ? 'Fin de garde...' : 'Terminer la garde'}
        </button>
      </div>
    </div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function DashboardPage() {
  const [loading, setLoading]             = useState(true)
  const [shift, setShift]                 = useState(null)
  const [interventions, setInterventions] = useState([])
  const [alerts, setAlerts]               = useState([])
  const [showStart, setShowStart]         = useState(false)
  const [showEnd, setShowEnd]             = useState(false)
  const [showInterv, setShowInterv]       = useState(false)
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

  const handleStartShift = async ({ type, switch_time }) => {
    setActionLoading(true)
    try {
      const s = await shiftsApi.store({ type, switch_time, started_at: new Date().toISOString() })
      setShift(s); setInterventions([]); setShowStart(false)
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const handleEndShift = async ({ break_minutes }) => {
    setActionLoading(true)
    try {
      await shiftsApi.end(shift.id, { break_minutes })
      setShift(null); setInterventions([]); setShowEnd(false)
    } catch (e) { console.error(e) }
    finally { setActionLoading(false) }
  }

  const handleIntervSuccess = async () => {
    if (shift) {
      const data = await interventionsApi.byShift(shift.id)
      setInterventions(data)
    }
  }

  const shiftStyle = shift ? (TYPE_STYLES[shift.type] || TYPE_STYLES.uph) : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: 16, fontFamily: "'DM Sans',sans-serif" }}>

      {showStart && <StartShiftModal onClose={() => setShowStart(false)} onConfirm={handleStartShift} loading={actionLoading} />}
      {showEnd   && <EndShiftModal   onClose={() => setShowEnd(false)}   onConfirm={handleEndShift}   loading={actionLoading} />}
      <NouvelleIntervention visible={showInterv} onClose={() => setShowInterv(false)} shiftId={shift?.id} shiftType={shift?.type} onSuccess={handleIntervSuccess} />

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ background: '#FBF1E0', border: '1px solid #F5CBA7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D4860B', fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4860B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {alerts.length} article{alerts.length > 1 ? 's' : ''} nécessite{alerts.length > 1 ? 'nt' : ''} votre attention
        </div>
      )}

      {/* Carte garde */}
      {shift ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #E8ECF0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: shiftStyle.color, letterSpacing: 1 }}>
                {shiftStyle.label.toUpperCase()}
              </span>
            </div>
            <div style={{ background: '#E3F0FA', borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: '#2E86C1', fontFamily: 'monospace' }}>
              {formatTimer(elapsed)}
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 2 }}>Garde en cours</div>
          <div style={{ fontSize: 12, color: '#8694A7', marginBottom: shift.type === 'mixte' ? 8 : 12 }}>Depuis {formatTime(shift.started_at)}</div>

          {shift.type === 'mixte' && shift.switch_time && (
            <div style={{ background: '#F0E6F6', borderRadius: 8, padding: '6px 10px', marginBottom: 12, fontSize: 11, color: '#8E44AD', fontWeight: 600 }}>
              Commercial → UPH à {shift.switch_time.slice(0, 5)}
            </div>
          )}

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

          <button onClick={() => setShowInterv(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#E3F0FA', color: '#2E86C1', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
            + Nouvelle intervention
          </button>
          <button onClick={() => setShowEnd(true)} style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#C0392B', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Terminer la garde
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E8ECF0', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1E3D', marginBottom: 6 }}>Aucune garde en cours</div>
          <div style={{ fontSize: 13, color: '#8694A7', marginBottom: 18, lineHeight: 1.5 }}>Démarrez une nouvelle garde pour enregistrer vos interventions.</div>
          <button onClick={() => setShowStart(true)} style={{ background: '#0A1E3D', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Démarrer une garde
          </button>
        </div>
      )}

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
        <strong>Version bêta</strong> — Merci de nous faire part de vos retours !
      </div>
    </div>
  )
}