// JournalPage.jsx
import { useEffect, useState } from 'react'
import { interventionsApi } from '../lib/api'

const CATEGORIES = {
  cardio: { color: '#C0392B', bg: '#FEF2F2' },
  respi:  { color: '#2E86C1', bg: '#E3F0FA' },
  trauma: { color: '#D4860B', bg: '#FBF1E0' },
  neuro:  { color: '#8E44AD', bg: '#F0E6F6' },
  pedia:  { color: '#1D8348', bg: '#E6F2EC' },
  general:{ color: '#4A5568', bg: '#F0F2F5' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function groupByDate(items) {
  const groups = {}
  items.forEach(i => {
    const label = formatDate(i.created_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(i)
  })
  return groups
}

export default function JournalPage() {
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interventionsApi.index()
      .then(data => setInterventions(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))))
      .finally(() => setLoading(false))
  }, [])

  const groups = groupByDate(interventions)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Historique</div>
      <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 16 }}>{interventions.length} intervention{interventions.length > 1 ? 's' : ''}</div>

      {interventions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8694A7', fontSize: 13, border: '1px solid #E8ECF0' }}>
          Aucune intervention enregistrée
        </div>
      ) : (
        Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8694A7' }}>{date}</span>
              <div style={{ flex: 1, height: 1, background: '#E8ECF0' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', background: '#fff', border: '1px solid #E8ECF0', borderRadius: 10, padding: '1px 7px' }}>{items.length}</span>
            </div>
            {items.map(interv => {
              const cat = CATEGORIES[interv.category] || CATEGORIES.general
              return (
                <div key={interv.id} style={{ background: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', border: '1px solid #E8ECF0', display: 'flex' }}>
                  <div style={{ width: 4, background: cat.color, flexShrink: 0 }} />
                  <div style={{ padding: '12px 14px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1E3D', textTransform: 'capitalize' }}>{interv.category}</span>
                      <span style={{ fontSize: 11, color: '#B0BFCC' }}>{new Date(interv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#4A5568' }}>
                      {interv.patient_gender === 'M' ? '♂ Homme' : '♀ Femme'} · {interv.patient_age} ans
                    </span>
                    {interv.gestures?.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {interv.gestures.slice(0, 3).map((g, i) => (
                          <span key={i} style={{ fontSize: 10, background: '#F0F2F5', color: '#4A5568', borderRadius: 4, padding: '2px 6px' }}>{g}</span>
                        ))}
                        {interv.gestures.length > 3 && <span style={{ fontSize: 10, color: '#B0BFCC' }}>+{interv.gestures.length - 3}</span>}
                      </div>
                    )}
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