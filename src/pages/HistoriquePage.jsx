import { useEffect, useState } from 'react'
import { interventionsApi, shiftsApi, api, hospitalsApi } from '../lib/api'
import ConstantesStep, { CONSTANTES, getConstantStatus } from '../components/ConstantesStep'

const STATUS_COLORS = {
  ok:      { color: '#1D8348', bg: '#E6F2EC' },
  warning: { color: '#D4860B', bg: '#FBF1E0' },
  danger:  { color: '#C0392B', bg: '#FEF2F2' },
}

function getCatStyle(category) {
  const MAP = {
    cardio:      { color: '#C0392B', bg: '#FEF2F2' },
    respi:       { color: '#2E86C1', bg: '#E3F0FA' },
    trauma:      { color: '#D4860B', bg: '#FBF1E0' },
    neuro:       { color: '#8E44AD', bg: '#F0E6F6' },
    pédia:       { color: '#1D8348', bg: '#E6F2EC' },
    obstétrie:   { color: '#E91E8C', bg: '#FCE4F5' },
    psychiatrie: { color: '#5D6D7E', bg: '#EAF0F6' },
  }
  return MAP[category?.toLowerCase()] || { color: '#4A5568', bg: '#F0F2F5' }
}

function formatShiftDate(dateStr) {
  if (!dateStr) return 'Garde inconnue'
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Garde d'aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return "Garde d'hier"
  return `Garde du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

function formatTime(dateStr) {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const DRIVING_OPTIONS = [
  { id: 'outbound',   label: 'Aller' },
  { id: 'return',     label: 'Retour' },
  { id: 'round_trip', label: 'Aller-retour' },
  { id: 'none',       label: 'Non concerné' },
]

const CONSTANTE_LABELS = {
  spo2:        { label: 'SpO2',        unit: '%' },
  pouls:       { label: 'Pouls',       unit: 'bpm' },
  ta_sys:      { label: 'TA Sys',      unit: 'mmHg' },
  ta_dia:      { label: 'TA Dia',      unit: 'mmHg' },
  fr_vent:     { label: 'Fr. Vent',    unit: 'c/min' },
  temperature: { label: 'Température', unit: '°C' },
  dextro:      { label: 'Dextro',      unit: 'g/L' },
}

const GESTES = [
  'Scope', 'O2', 'VVP', 'Bilan glycémique', 'DSA',
  'Aspirateur de mucosités', 'Immobilisation', 'Pansement',
  'Médicaments', 'PLS', 'MCE', 'Ventilation assistée',
  'Attelage', 'Minerve', 'Planche', 'Matelas coquille',
]

function getScore(interv) {
  const c = interv.constants || {}
  const fields = [
    { key: 'Catégorie',   done: !!interv.category },
    { key: 'Genre',       done: !!interv.patient_gender },
    { key: 'Âge',         done: !!interv.patient_age },
    { key: 'SpO2',        done: !!c.spo2 },
    { key: 'Pouls',       done: !!c.pouls },
    { key: 'TA Sys',      done: !!c.ta_sys },
    { key: 'TA Dia',      done: !!c.ta_dia },
    { key: 'Température', done: !!c.temperature },
    { key: 'Transport',   done: !!interv.driving },
    { key: 'Destination', done: interv.no_transport || !!interv.hospital_id },
  ]
  const done  = fields.filter(f => f.done).length
  const total = fields.length
  const pct   = Math.round((done / total) * 100)
  return { pct, done, total, fields }
}

function scoreColor(pct) {
  if (pct === 100) return '#1D8348'
  if (pct >= 70)   return '#D4860B'
  return '#C0392B'
}

const IcoCheck = ({ color = '#fff', size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoEdit  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E86C1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>

// ===== MODAL DÉTAIL =====
function IntervDetailModal({ interv, onClose, onEdit }) {
  const cat = getCatStyle(interv.category)
  const { pct, fields } = getScore(interv)
  const color = scoreColor(pct)

  return (
    <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0A1E3D' }}>Intervention · {formatTime(interv.created_at)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcoEdit />
            </button>
            <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

          {/* Score */}
          <div style={{ background: '#F7F8FA', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1E3D' }}>Complétude</span>
              <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: '#E8ECF0', borderRadius: 3, overflow: 'hidden', marginBottom: pct < 100 ? 8 : 0 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
            {pct < 100 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {fields.filter(f => !f.done).map(f => (
                  <span key={f.key} style={{ fontSize: 10, background: '#FEF2F2', color: '#C0392B', borderRadius: 4, padding: '2px 6px' }}>{f.key}</span>
                ))}
              </div>
            )}
          </div>

          {/* Catégorie */}
          <div style={{ background: cat.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 12, borderLeft: `4px solid ${cat.color}` }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: cat.color, textTransform: 'capitalize' }}>{interv.category}</span>
          </div>

          {/* Patient + Transport */}
          <div style={{ background: '#F7F8FA', borderRadius: 10, marginBottom: 12 }}>
            {[
              { label: 'Patient',     value: `${interv.patient_gender === 'M' ? '♂ Homme' : '♀ Femme'} · ${interv.patient_age} ans` },
              { label: 'Transport',   value: DRIVING_OPTIONS.find(d => d.id === interv.driving)?.label || '—' },
              { label: 'Destination', value: interv.no_transport ? 'Laissé sur place' : interv.hospital?.name || 'Non renseigné' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < 2 ? '1px solid #E8ECF0' : 'none' }}>
                <span style={{ fontSize: 12, color: '#8694A7' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1E3D' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Gestes */}
          {interv.gestures?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gestes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {interv.gestures.map((g, i) => (
                  <span key={i} style={{ fontSize: 11, background: '#F0F2F5', color: '#4A5568', borderRadius: 6, padding: '3px 8px' }}>{g}</span>
                ))}
              </div>
            </div>
          )}

          {/* Constantes */}
          {interv.constants && Object.keys(interv.constants).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Constantes vitales</div>
              <div style={{ background: '#F7F8FA', borderRadius: 10, overflow: 'hidden' }}>
                {Object.entries(interv.constants).map(([key, val], i, arr) => {
                  const info      = CONSTANTE_LABELS[key]
                  const constante = CONSTANTES.find(c => c.id === key)
                  const status    = constante ? getConstantStatus(constante, val) : null
                  const colors    = status ? STATUS_COLORS[status] : null
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid #E8ECF0' : 'none', background: colors ? colors.bg : 'transparent' }}>
                      <span style={{ fontSize: 12, color: colors ? colors.color : '#8694A7' }}>{info?.label || key}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors ? colors.color : '#0A1E3D' }}>{val} {info?.unit}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== MODAL ÉDITION =====
function IntervEditModal({ interv, onClose, onSaved }) {
  const [loading, setLoading]         = useState(false)
  const [hospitals, setHospitals]     = useState([])
  const [categories, setCategories]   = useState([])
  const [category, setCategory]       = useState(interv.category || '')
  const [gender, setGender]           = useState(interv.patient_gender || null)
  const [age, setAge]                 = useState(String(interv.patient_age || ''))
  const [constants, setConstants]     = useState(interv.constants || {})
  const [gestures, setGestures]       = useState(interv.gestures || [])
  const [driving, setDriving]         = useState(interv.driving || 'none')
  const [noTransport, setNoTransport] = useState(!!interv.no_transport)
  const [hospitalId, setHospitalId]   = useState(interv.hospital_id || null)

  useEffect(() => {
    hospitalsApi.index().then(setHospitals).catch(() => {})
    api.get('/intervention-categories').then(setCategories).catch(() => {})
  }, [])

  const toggleGeste = (g) => setGestures(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const handleSave = async () => {
    setLoading(true)
    try {
      const filteredConstants = Object.fromEntries(
        Object.entries(constants).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
      const updated = await api.put(`/interventions/${interv.id}`, {
        category,
        patient_gender: gender,
        patient_age:    parseInt(age),
        constants:      Object.keys(filteredConstants).length > 0 ? filteredConstants : null,
        gestures,
        driving,
        no_transport:   noTransport,
        hospital_id:    hospitalId,
      })
      onSaved(updated)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 500, background: '#F0F2F5', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans',sans-serif", maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 20 }}>×</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1E3D' }}>Modifier l'intervention</span>
        <button onClick={handleSave} disabled={loading} style={{ background: '#0A1E3D', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {loading ? '...' : 'Sauvegarder'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Catégorie</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {categories.map(cat => {
            const name = cat.name || cat.label
            const isActive = category?.toLowerCase() === name?.toLowerCase()
            return (
              <button key={name} onClick={() => setCategory(name)} style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${isActive ? (cat.color || '#2E86C1') : '#E8ECF0'}`, background: isActive ? (cat.bg || '#E3F0FA') : '#fff', color: isActive ? (cat.color || '#2E86C1') : '#4A5568', fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {name}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Patient</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {[{ v: 'M', l: '♂ Homme' }, { v: 'F', l: '♀ Femme' }].map(g => (
            <button key={g.v} onClick={() => setGender(g.v)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1.5px solid ${gender === g.v ? '#2E86C1' : '#E8ECF0'}`, background: gender === g.v ? '#E3F0FA' : '#F7F8FA', color: gender === g.v ? '#2E86C1' : '#4A5568', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {g.l}
            </button>
          ))}
        </div>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Âge" style={{ width: '100%', height: 44, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 15, boxSizing: 'border-box', outline: 'none', marginBottom: 20, fontFamily: "'DM Sans',sans-serif" }} />

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Constantes vitales</div>
        <div style={{ marginBottom: 20 }}>
          <ConstantesStep values={constants} onChange={setConstants} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gestes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {GESTES.map(g => {
            const sel = gestures.includes(g)
            return (
              <button key={g} onClick={() => toggleGeste(g)} style={{ padding: '7px 12px', borderRadius: 20, border: `1px solid ${sel ? '#2E86C1' : '#E8ECF0'}`, background: sel ? '#E3F0FA' : '#fff', color: sel ? '#2E86C1' : '#4A5568', fontWeight: sel ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {g}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Transport</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {DRIVING_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setDriving(opt.id)} style={{ padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${driving === opt.id ? '#2E86C1' : '#E8ECF0'}`, background: driving === opt.id ? '#E3F0FA' : '#fff', color: driving === opt.id ? '#2E86C1' : '#4A5568', fontWeight: driving === opt.id ? 700 : 500, fontSize: 13, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={() => setNoTransport(!noTransport)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${noTransport ? '#D4860B' : '#E8ECF0'}`, background: noTransport ? '#FFFBEB' : '#fff', width: '100%', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginBottom: 14 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${noTransport ? '#2E86C1' : '#D1D8E0'}`, background: noTransport ? '#2E86C1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {noTransport && <IcoCheck />}
          </div>
          <span style={{ fontSize: 13, color: '#4A5568' }}>Pas de transport (laissé sur place)</span>
        </button>

        {!noTransport && hospitals.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Hôpital</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
              <button onClick={() => setHospitalId(null)} style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${hospitalId === null ? '#2E86C1' : '#E8ECF0'}`, background: hospitalId === null ? '#E3F0FA' : '#fff', color: hospitalId === null ? '#2E86C1' : '#4A5568', fontWeight: hospitalId === null ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                Non renseigné
              </button>
              {hospitals.map(h => (
                <button key={h.id} onClick={() => setHospitalId(h.id)} style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${hospitalId === h.id ? '#2E86C1' : '#E8ECF0'}`, background: hospitalId === h.id ? '#E3F0FA' : '#fff', color: hospitalId === h.id ? '#2E86C1' : '#4A5568', fontWeight: hospitalId === h.id ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                  {h.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function HistoriquePage() {
  const [shifts, setShifts]                 = useState([])
  const [interventions, setInterventions]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [selectedInterv, setSelectedInterv] = useState(null)
  const [editingInterv, setEditingInterv]   = useState(null)

  useEffect(() => {
    Promise.all([shiftsApi.index(), interventionsApi.index()])
      .then(([shiftsData, intervData]) => {
        setShifts(shiftsData.sort((a, b) => new Date(b.started_at) - new Date(a.started_at)))
        setInterventions(intervData)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUpdated = (updated) => {
    setInterventions(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedInterv(updated)
    setEditingInterv(null)
  }

  const shiftGroups = shifts.map(shift => ({
    shift,
    interventions: interventions
      .filter(i => i.shift_id === shift.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  })).filter(g => g.interventions.length > 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: 16, fontFamily: "'DM Sans',sans-serif" }}>

      {selectedInterv && !editingInterv && (
        <IntervDetailModal
          interv={selectedInterv}
          onClose={() => setSelectedInterv(null)}
          onEdit={() => { setEditingInterv(selectedInterv); setSelectedInterv(null) }}
        />
      )}

      {editingInterv && (
        <IntervEditModal
          interv={editingInterv}
          onClose={() => setEditingInterv(null)}
          onSaved={handleUpdated}
        />
      )}

      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Historique</div>
      <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>
        {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
      </div>

      {shiftGroups.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8694A7', fontSize: 13, border: '1px solid #E8ECF0' }}>
          Aucune intervention enregistrée
        </div>
      ) : (
        shiftGroups.map(({ shift, interventions: shiftIntervs }) => (
          <div key={shift.id} style={{ marginBottom: 20 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8694A7' }}>
                {formatShiftDate(shift.started_at)}
              </span>
              <span style={{ fontSize: 10, color: '#B0BFCC' }}>
                {formatTime(shift.started_at)}{shift.ended_at ? ` → ${formatTime(shift.ended_at)}` : ' · En cours'}
              </span>
              <div style={{ flex: 1, height: 1, background: '#E8ECF0' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', background: '#fff', border: '1px solid #E8ECF0', borderRadius: 10, padding: '1px 7px' }}>
                {shiftIntervs.length}
              </span>
            </div>

            {shiftIntervs.map(interv => {
              const cat   = getCatStyle(interv.category)
              const { pct } = getScore(interv)
              const color = scoreColor(pct)

              return (
                <div
                  key={interv.id}
                  onClick={() => setSelectedInterv(interv)}
                  style={{ position: 'relative', background: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', border: '1px solid #E8ECF0', display: 'flex', cursor: 'pointer' }}
                >
                  {/* Barre catégorie gauche */}
                  <div style={{ width: 4, background: cat.color, flexShrink: 0 }} />

                  {/* Contenu */}
                  <div style={{ padding: '12px 14px', flex: 1, minWidth: 0, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1E3D', textTransform: 'capitalize' }}>{interv.category}</span>
                      <span style={{ fontSize: 11, color: '#B0BFCC' }}>{formatTime(interv.created_at)}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#4A5568' }}>
                      {interv.patient_gender === 'M' ? '♂ Homme' : '♀ Femme'} · {interv.patient_age} ans
                    </span>
                    {interv.gestures?.length > 0 && (
                      <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {interv.gestures.slice(0, 3).map((g, i) => (
                          <span key={i} style={{ fontSize: 10, background: '#F0F2F5', color: '#4A5568', borderRadius: 4, padding: '2px 6px' }}>{g}</span>
                        ))}
                        {interv.gestures.length > 3 && <span style={{ fontSize: 10, color: '#B0BFCC' }}>+{interv.gestures.length - 3}</span>}
                      </div>
                    )}
                    {interv.constants && Object.keys(interv.constants).length > 0 && (
                      <div style={{ marginTop: 5, fontSize: 10, color: '#2E86C1', fontWeight: 600 }}>
                        {Object.keys(interv.constants).length} constante{Object.keys(interv.constants).length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0BFCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>

                  {/* Barre de complétude en absolute bottom */}
                  <div style={{ position: 'absolute', bottom: 0, left: 4, right: 0, height: 3, background: '#F0F2F5' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}