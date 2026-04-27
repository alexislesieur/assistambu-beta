import { useState, useEffect } from 'react'
import { api, interventionsApi, hospitalsApi } from '../lib/api'
import ConstantesStep, { CONSTANTES, getConstantStatus } from './ConstantesStep'

const STATUS_COLORS = {
  ok:      { color: '#1D8348', bg: '#E6F2EC' },
  warning: { color: '#D4860B', bg: '#FBF1E0' },
  danger:  { color: '#C0392B', bg: '#FEF2F2' },
}

const CATEGORIES_FALLBACK = [
  { name: 'Cardio',      color: '#C0392B', bg: '#FEF2F2' },
  { name: 'Respi',       color: '#2E86C1', bg: '#E3F0FA' },
  { name: 'Trauma',      color: '#D4860B', bg: '#FBF1E0' },
  { name: 'Neuro',       color: '#8E44AD', bg: '#F0E6F6' },
  { name: 'Pédia',       color: '#1D8348', bg: '#E6F2EC' },
  { name: 'Obstétrie',   color: '#E91E8C', bg: '#FCE4F5' },
  { name: 'Psychiatrie', color: '#5D6D7E', bg: '#EAF0F6' },
  { name: 'Général',     color: '#4A5568', bg: '#F0F2F5' },
]

const GESTES = [
  'Scope', 'O2', 'VVP', 'Bilan glycémique', 'DSA',
  'Aspirateur de mucosités', 'Immobilisation', 'Pansement',
  'Médicaments', 'PLS', 'MCE', 'Ventilation assistée',
  'Attelage', 'Minerve', 'Planche', 'Matelas coquille',
]

const DRIVING_OPTIONS = [
  { id: 'outbound',   label: 'Aller' },
  { id: 'return',     label: 'Retour' },
  { id: 'round_trip', label: 'Aller-retour' },
  { id: 'none',       label: 'Non concerné' },
]

const TOTAL_STEPS = 6
const STEP_LABELS = ['Catégorie', 'Patient', 'Constantes', 'Gestes', 'Transport', 'Récap']

const IcoCheck = ({ color = '#fff', size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

export default function NouvelleIntervention({ visible, onClose, shiftId, onSuccess }) {
  const [step, setStep]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [hospitals, setHospitals]   = useState([])
  const [categories, setCategories] = useState([])

  const [category, setCategory]       = useState(null)
  const [gender, setGender]           = useState(null)
  const [age, setAge]                 = useState('')
  const [constants, setConstants]     = useState({})
  const [gestures, setGestures]       = useState([])
  const [driving, setDriving]         = useState('none')
  const [noTransport, setNoTransport] = useState(false)
  const [hospitalId, setHospitalId]   = useState(null)

  useEffect(() => {
    if (visible) {
      hospitalsApi.index().catch(() => []).then(setHospitals)
      api.get('/intervention-categories')
        .then(data => setCategories(data.length > 0 ? data : CATEGORIES_FALLBACK))
        .catch(() => setCategories(CATEGORIES_FALLBACK))
    }
  }, [visible])

  const reset = () => {
    setStep(1); setCategory(null); setGender(null); setAge('')
    setConstants({}); setGestures([]); setDriving('none')
    setNoTransport(false); setHospitalId(null)
  }

  const handleClose = () => { reset(); onClose() }
  const toggleGeste = (g) => setGestures(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const canNext = () => {
    if (step === 1) return !!category
    if (step === 2) return !!gender && age !== ''
    return true
  }

  const getCategoryName = () => {
    if (!category) return ''
    return category.name || category.label || ''
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const filteredConstants = Object.fromEntries(
        Object.entries(constants).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
      await interventionsApi.store({
        shift_id:       shiftId,
        category:       getCategoryName(),
        patient_gender: gender,
        patient_age:    parseInt(age),
        constants:      Object.keys(filteredConstants).length > 0 ? filteredConstants : null,
        gestures,
        driving,
        no_transport:   noTransport,
        hospital_id:    hospitalId,
      })
      reset(); onSuccess(); onClose()
    } catch (e) {
      console.error('Erreur intervention:', JSON.stringify(e.errors))
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 56, bottom: 72, left: 0, right: 0,
      zIndex: 300, background: '#F0F2F5',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans',sans-serif",
      maxWidth: 480, margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={handleClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1E3D' }}>Nouvelle intervention</div>
          <div style={{ fontSize: 10, color: '#8694A7', marginTop: 1 }}>{STEP_LABELS[step - 1]}</div>
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Progression */}
      <div style={{ background: '#fff', padding: '8px 20px 10px', borderBottom: '1px solid #E8ECF0' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? '#2E86C1' : '#E8ECF0', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#8694A7', textAlign: 'center' }}>Étape {step} sur {TOTAL_STEPS}</div>
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ÉTAPE 1 — Catégorie */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Type d'intervention</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Sélectionnez la catégorie principale</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {categories.map(cat => {
                const catName  = cat.name || cat.label
                const isActive = category && (category.name === catName || category.label === catName)
                return (
                  <button key={catName} onClick={() => setCategory(cat)} style={{ padding: '14px 12px', borderRadius: 12, border: `1.5px solid ${isActive ? cat.color : '#E8ECF0'}`, background: isActive ? cat.bg : '#fff', color: isActive ? cat.color : '#0A1E3D', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
                    {catName}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Patient */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Patient</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Renseignez les informations du patient</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Genre</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[{ v: 'M', l: '♂ Homme' }, { v: 'F', l: '♀ Femme' }].map(g => (
                <button key={g.v} onClick={() => setGender(g.v)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `1.5px solid ${gender === g.v ? '#2E86C1' : '#E8ECF0'}`, background: gender === g.v ? '#E3F0FA' : '#F7F8FA', color: gender === g.v ? '#2E86C1' : '#4A5568', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  {g.l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Âge</div>
            <input type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="Ex: 45" style={{ width: '100%', height: 48, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 16, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
          </div>
        )}

        {/* ÉTAPE 3 — Constantes */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Constantes vitales</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Saisissez les paramètres mesurés</div>
            <ConstantesStep values={constants} onChange={setConstants} />
          </div>
        )}

        {/* ÉTAPE 4 — Gestes */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Gestes réalisés</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Sélectionnez tous les gestes effectués</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GESTES.map(g => {
                const sel = gestures.includes(g)
                return (
                  <button key={g} onClick={() => toggleGeste(g)} style={{ padding: '8px 12px', borderRadius: 20, border: `1px solid ${sel ? '#2E86C1' : '#E8ECF0'}`, background: sel ? '#E3F0FA' : '#fff', color: sel ? '#2E86C1' : '#4A5568', fontWeight: sel ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {g}
                  </button>
                )
              })}
            </div>
            {gestures.length === 0 && <div style={{ fontSize: 12, color: '#B0BFCC', marginTop: 16, textAlign: 'center', fontStyle: 'italic' }}>Aucun geste — vous pouvez passer à l'étape suivante</div>}
          </div>
        )}

        {/* ÉTAPE 5 — Transport */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Transport</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Informations sur le transport du patient</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Type de trajet</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {DRIVING_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setDriving(opt.id)} style={{ padding: '13px 14px', borderRadius: 10, border: `1.5px solid ${driving === opt.id ? '#2E86C1' : '#E8ECF0'}`, background: driving === opt.id ? '#E3F0FA' : '#fff', color: driving === opt.id ? '#2E86C1' : '#4A5568', fontWeight: driving === opt.id ? 700 : 500, fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setNoTransport(!noTransport)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 10, border: `1.5px solid ${noTransport ? '#D4860B' : '#E8ECF0'}`, background: noTransport ? '#FFFBEB' : '#fff', width: '100%', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${noTransport ? '#2E86C1' : '#D1D8E0'}`, background: noTransport ? '#2E86C1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {noTransport && <IcoCheck />}
              </div>
              <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>Pas de transport (laissé sur place)</span>
            </button>
            {!noTransport && hospitals.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Hôpital de destination</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  <button onClick={() => setHospitalId(null)} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${hospitalId === null ? '#2E86C1' : '#E8ECF0'}`, background: hospitalId === null ? '#E3F0FA' : '#fff', color: hospitalId === null ? '#2E86C1' : '#4A5568', fontWeight: hospitalId === null ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                    Non renseigné
                  </button>
                  {hospitals.map(h => (
                    <button key={h.id} onClick={() => setHospitalId(h.id)} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${hospitalId === h.id ? '#2E86C1' : '#E8ECF0'}`, background: hospitalId === h.id ? '#E3F0FA' : '#fff', color: hospitalId === h.id ? '#2E86C1' : '#4A5568', fontWeight: hospitalId === h.id ? 700 : 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}>
                      {h.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ÉTAPE 6 — Récap */}
        {step === 6 && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Récapitulatif</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>Vérifiez les informations avant de valider</div>

            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E8ECF0', marginBottom: 12 }}>
              <div style={{ padding: 14, background: category?.bg || '#F0F2F5' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: category?.color || '#4A5568' }}>{getCategoryName()}</span>
              </div>
              {[
                { label: 'Patient',     value: `${gender === 'M' ? '♂ Homme' : '♀ Femme'} · ${age} ans` },
                { label: 'Transport',   value: DRIVING_OPTIONS.find(d => d.id === driving)?.label },
                { label: 'Destination', value: noTransport ? 'Laissé sur place' : hospitals.find(h => h.id === hospitalId)?.name || 'Non renseigné' },
                { label: 'Gestes',      value: gestures.length > 0 ? gestures.join(', ') : 'Aucun' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #F0F2F5', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#8694A7', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1E3D', textAlign: 'right', flex: 1 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Constantes récap */}
            {Object.keys(constants).filter(k => constants[k] !== '' && constants[k] !== null && constants[k] !== undefined).length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '10px 14px', background: '#F7F8FA', borderBottom: '1px solid #E8ECF0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Constantes vitales</span>
                </div>
                {Object.entries(constants)
                  .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
                  .map(([key, val], i) => {
                    const constante = CONSTANTES.find(c => c.id === key)
                    const status    = constante ? getConstantStatus(constante, val) : null
                    const colors    = status ? STATUS_COLORS[status] : null
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: i > 0 ? '1px solid #F0F2F5' : 'none', background: colors ? colors.bg : 'transparent' }}>
                        <span style={{ fontSize: 12, color: colors ? colors.color : '#8694A7', fontWeight: 500 }}>
                          {constante?.label || key}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors ? colors.color : '#0A1E3D' }}>
                          {val} {constante?.unit}
                        </span>
                      </div>
                    )
                  })
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: '#fff', borderTop: '1px solid #E8ECF0', padding: 14, display: 'flex', gap: 10 }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{ padding: '13px 16px', borderRadius: 12, border: 'none', background: '#F0F2F5', color: '#0A1E3D', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            ← Retour
          </button>
        )}
        <button
          disabled={!canNext() || loading}
          onClick={() => step < TOTAL_STEPS ? setStep(s => s + 1) : handleSubmit()}
          style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: canNext() ? '#0A1E3D' : '#CBD5E0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif" }}
        >
          {loading ? 'Envoi...' : step === TOTAL_STEPS ? '✓ Valider' : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}