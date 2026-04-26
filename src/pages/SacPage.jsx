import { useEffect, useState } from 'react'
import { itemsApi } from '../lib/api'

function getStatus(item) {
  if (item.quantity === 0) return 'danger'
  if (item.dlc) {
    const diff = Math.floor((new Date(item.dlc) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'danger'
    if (diff < 90) return 'warning'
  }
  if (item.max_quantity && item.quantity < item.max_quantity * 0.3) return 'warning'
  return 'ok'
}

const STATUS = {
  ok:      { color: '#1D8348', bg: '#E6F2EC', dot: '#1D8348' },
  warning: { color: '#D4860B', bg: '#FBF1E0', dot: '#D4860B' },
  danger:  { color: '#C0392B', bg: '#FEF2F2', dot: '#C0392B' },
}

function groupByCategory(items) {
  const groups = {}
  items.forEach(i => {
    const cat = i.category || 'Autres'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(i)
  })
  return groups
}

function formatDLC(dlc) {
  if (!dlc) return 'N/A'
  const d = new Date(dlc)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function SacPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    itemsApi.index().then(data => {
      setItems(data)
      const cats = {}
      data.forEach(i => { if (i.category) cats[i.category] = true })
      setExpanded(cats)
    }).finally(() => setLoading(false))
  }, [])

  const groups  = groupByCategory(items)
  const okCount = items.filter(i => getStatus(i) === 'ok').length
  const total   = items.length
  const pct     = total > 0 ? Math.round((okCount / total) * 100) : 100

  const toggle = (cat) => setExpanded(e => ({ ...e, [cat]: !e[cat] }))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Sac principal</div>

      {/* Conformité */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #E8ECF0', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1E3D' }}>Conformité</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: pct >= 80 ? '#1D8348' : '#C0392B' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#F0F2F5', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: okCount, background: '#1D8348' }} />
          <div style={{ flex: items.filter(i => getStatus(i) === 'warning').length, background: '#D4860B' }} />
          <div style={{ flex: items.filter(i => getStatus(i) === 'danger').length, background: '#C0392B' }} />
        </div>
      </div>

      {/* Catégories */}
      {Object.entries(groups).map(([cat, catItems]) => {
        const isOpen = expanded[cat]
        const warns  = catItems.filter(i => getStatus(i) !== 'ok').length
        return (
          <div key={cat} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', marginBottom: 8, overflow: 'hidden' }}>
            <div
              onClick={() => toggle(cat)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1E3D' }}>{cat}</span>
                <span style={{ fontSize: 11, color: '#8694A7', marginLeft: 6 }}>{catItems.length} articles</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {warns > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', background: '#FEF2F2', borderRadius: 6, padding: '2px 7px' }}>{warns}</span>}
                <span style={{ color: '#B0BFCC', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && catItems.map((item, i) => {
              const st = STATUS[getStatus(item)]
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid #F0F2F5', background: i % 2 === 1 ? '#FAFAFA' : '#fff', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1E3D' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: '#8694A7' }}>DLC: {formatDLC(item.dlc)}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: st.color }}>
                    {item.quantity}<span style={{ fontSize: 11, color: '#8694A7', fontWeight: 400 }}>/{item.max_quantity || '—'}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}