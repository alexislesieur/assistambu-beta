import { useEffect, useState } from 'react'
import { itemsApi } from '../lib/api'
import SacOnboarding from '../components/SacOnboarding'

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
  ok:      { color: '#1D8348', bg: '#E6F2EC', dot: '#1D8348', label: 'OK' },
  warning: { color: '#D4860B', bg: '#FBF1E0', dot: '#D4860B', label: 'Alerte' },
  danger:  { color: '#C0392B', bg: '#FEF2F2', dot: '#C0392B', label: 'Épuisé' },
}

function formatDLC(dlc) {
  if (!dlc) return 'N/A'
  const d = new Date(dlc)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
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

function RestockModal({ item, onClose, onConfirm, loading }) {
  const [qty, setQty] = useState('')
  const [dlc, setDlc] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 40, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1E3D' }}>Réassort</div>
            <div style={{ fontSize: 12, color: '#8694A7', marginTop: 2 }}>{item.name}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ background: '#F7F8FA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8694A7' }}>Stock actuel</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: STATUS[getStatus(item)].color }}>
            {item.quantity} <span style={{ fontSize: 11, color: '#8694A7', fontWeight: 400 }}>/ {item.max_quantity || '—'}</span>
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nouvelle quantité *</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder={`Max recommandé : ${item.max_quantity || '—'}`} style={{ width: '100%', height: 46, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 16, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date de péremption (DLC)</label>
          <input type="month" value={dlc} onChange={e => setDlc(e.target.value)} style={{ width: '100%', height: 46, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
        </div>

        <button onClick={() => onConfirm({ quantity: parseInt(qty), dlc: dlc ? `${dlc}-01` : null })} disabled={!qty || loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: !qty ? '#CBD5E0' : '#0A1E3D', color: '#fff', fontWeight: 700, fontSize: 15, cursor: !qty ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {loading ? 'Enregistrement...' : 'Confirmer le réassort'}
        </button>
      </div>
    </div>
  )
}

export default function SacPage() {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})
  const [restockItem, setRestockItem] = useState(null)
  const [restockLoading, setRestockLoading] = useState(false)
  const [toast, setToast]           = useState(null)
  const [filter, setFilter]         = useState('all')

  const load = () => {
    itemsApi.index()
      .then(data => {
        setItems(data)
        const cats = {}
        data.forEach(i => { if (i.category) cats[i.category] = true })
        setExpanded(cats)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleRestock = async ({ quantity, dlc }) => {
    setRestockLoading(true)
    try {
      await itemsApi.restock(restockItem.id, { quantity, dlc })
      setItems(prev => prev.map(i => i.id === restockItem.id ? { ...i, quantity, dlc } : i))
      setRestockItem(null)
      showToast('Réassort enregistré !')
    } catch {
      showToast('Erreur lors du réassort.', 'error')
    } finally {
      setRestockLoading(false)
    }
  }

  const toggle = (cat) => setExpanded(e => ({ ...e, [cat]: !e[cat] }))

  // Onboarding si sac vide
 if (!loading && items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <SacOnboarding onComplete={() => { setLoading(true); load() }} />
      </div>
    )
  } 

  const filteredItems = filter === 'all' ? items : items.filter(i => getStatus(i) === filter)
  const groups = groupByCategory(filteredItems)

  const okCount     = items.filter(i => getStatus(i) === 'ok').length
  const warnCount   = items.filter(i => getStatus(i) === 'warning').length
  const dangerCount = items.filter(i => getStatus(i) === 'danger').length
  const pct         = items.length > 0 ? Math.round((okCount / items.length) * 100) : 100

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: 16, fontFamily: "'DM Sans',sans-serif" }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: toast.type === 'error' ? '#C0392B' : '#1D8348', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {restockItem && <RestockModal item={restockItem} onClose={() => setRestockItem(null)} onConfirm={handleRestock} loading={restockLoading} />}

      <div style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Sac principal</div>
      <div style={{ fontSize: 12, color: '#8694A7', marginBottom: 14 }}>{items.length} articles</div>

      {/* Conformité */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #E8ECF0', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1E3D' }}>Conformité</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: pct >= 80 ? '#1D8348' : pct >= 50 ? '#D4860B' : '#C0392B' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#F0F2F5', borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
          <div style={{ flex: okCount, background: '#1D8348', transition: 'flex 0.6s' }} />
          <div style={{ flex: warnCount, background: '#D4860B' }} />
          <div style={{ flex: dangerCount, background: '#C0392B' }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ color: '#1D8348', label: `${okCount} OK` }, { color: '#D4860B', label: `${warnCount} alertes` }, { color: '#C0392B', label: `${dangerCount} épuisés` }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 11, color: '#4A5568' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'all',     label: `Tous (${items.length})` },
          { id: 'warning', label: `Alertes (${warnCount})` },
          { id: 'danger',  label: `Épuisés (${dangerCount})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f.id ? '#0A1E3D' : '#fff', color: filter === f.id ? '#fff' : '#4A5568', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Catégories */}
      {Object.keys(groups).length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', padding: 40, textAlign: 'center', color: '#8694A7', fontSize: 13 }}>
          Aucun article dans cette catégorie
        </div>
      ) : (
        Object.entries(groups).map(([cat, catItems]) => {
          const isOpen = expanded[cat]
          const alerts = catItems.filter(i => getStatus(i) !== 'ok').length
          return (
            <div key={cat} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', marginBottom: 8, overflow: 'hidden' }}>
              <div onClick={() => toggle(cat)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1E3D' }}>{cat}</span>
                  <span style={{ fontSize: 11, color: '#8694A7' }}>{catItems.length} articles</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {alerts > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', background: '#FEF2F2', borderRadius: 6, padding: '2px 7px' }}>{alerts}</span>}
                  <span style={{ color: '#B0BFCC', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>
              {isOpen && catItems.map((item, i) => {
                const st = STATUS[getStatus(item)]
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #F0F2F5', background: i % 2 === 1 ? '#FAFAFA' : '#fff', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1E3D' }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: '#8694A7' }}>DLC : {formatDLC(item.dlc)}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: st.color, marginRight: 8 }}>
                      {item.quantity}<span style={{ fontSize: 11, color: '#8694A7', fontWeight: 400 }}>/{item.max_quantity || '—'}</span>
                    </span>
                    <button onClick={() => setRestockItem(item)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2E86C1', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                      Réassort
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}