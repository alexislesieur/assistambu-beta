import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const TOTAL_STEPS = 4

const IcoCheck    = ({ color = '#fff', size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoChevL    = ({ color = '#0A1E3D' }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoSac      = ({ color = '#2E86C1', size = 36 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="7" width="19" height="14" rx="2"/><path d="M10 7V5.5a2 2 0 014 0V7"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="9.5" y1="13.5" x2="14.5" y2="13.5"/></svg>
const IcoStock    = ({ color = '#2E86C1', size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IcoAlert    = ({ color = '#D4860B', size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoRestock  = ({ color = '#1D8348', size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>

export default function SacOnboarding({ onComplete }) {
  const [step, setStep]             = useState(1)
  const [articles, setArticles]     = useState([])
  const [selected, setSelected]     = useState({})
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading]       = useState(false)
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [catFilter, setCatFilter]   = useState('all')

  useEffect(() => {
    api.get('/items')
      .then(data => setArticles(data))
      .catch(() => setArticles([]))
      .finally(() => setLoadingArticles(false))
  }, [])

  const toggleArticle = (article) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[article.id]) {
        delete next[article.id]
        setQuantities(q => { const nq = { ...q }; delete nq[article.id]; return nq })
      } else {
        next[article.id] = true
        setQuantities(q => ({ ...q, [article.id]: { qty: article.max_quantity || '', dlc: '' } }))
      }
      return next
    })
  }

  const updateQty = (id, field, value) => {
    setQuantities(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const selectedArticles = articles.filter(a => selected[a.id])
  const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))]
  const filteredArticles = articles.filter(a => catFilter === 'all' || a.category === catFilter)

  const canNext = () => {
    if (step === 2) return selectedArticles.length > 0
    if (step === 3) return selectedArticles.every(a => quantities[a.id]?.qty)
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await Promise.all(
        selectedArticles.map(article =>
          api.post('/items', {
            name:         article.name,
            category:     article.category,
            max_quantity: article.max_quantity,
            quantity:     parseInt(quantities[article.id]?.qty) || 0,
            dlc:          quantities[article.id]?.dlc ? `${quantities[article.id].dlc}-01` : null,
          })
        )
      )
      onComplete()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#F0F2F5', fontFamily: "'DM Sans',sans-serif", flex: 1 }}>

      {/* Sous-header onboarding */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcoChevL />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1E3D' }}>Créer mon sac</div>
          <div style={{ fontSize: 11, color: '#8694A7' }}>Étape {step} sur {TOTAL_STEPS}</div>
        </div>
      </div>

      {/* Barre progression */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', background: '#fff', borderBottom: '1px solid #E8ECF0' }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? '#2E86C1' : '#E8ECF0', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ÉTAPE 1 — Bienvenue */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#E3F0FA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <IcoSac size={36} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A1E3D', marginBottom: 8, letterSpacing: '-0.03em' }}>Bienvenue dans votre sac !</h1>
            <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.7, marginBottom: 24, maxWidth: 280 }}>
              Suivez la conformité de votre matériel en temps réel — stock, DLC, alertes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {[
                { Icon: IcoStock,   color: '#2E86C1', bg: '#E3F0FA', title: 'Suivi du stock',  desc: 'Visualisez vos quantités en temps réel' },
                { Icon: IcoAlert,   color: '#D4860B', bg: '#FBF1E0', title: 'Alertes DLC',     desc: 'Soyez alerté avant les péremptions' },
                { Icon: IcoRestock, color: '#1D8348', bg: '#E6F2EC', title: 'Réassort rapide', desc: 'Mettez à jour en quelques secondes' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #E8ECF0', textAlign: 'left' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.Icon color={item.color} size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1E3D' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#8694A7', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Sélection articles */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Vos articles</h2>
            <p style={{ fontSize: 12, color: '#8694A7', marginBottom: 14 }}>
              Sélectionnez les articles présents dans votre sac ({selectedArticles.length} sélectionné{selectedArticles.length > 1 ? 's' : ''})
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: catFilter === cat ? '#0A1E3D' : '#fff', color: catFilter === cat ? '#fff' : '#4A5568', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {cat === 'all' ? 'Tous' : cat}
                </button>
              ))}
            </div>

            {loadingArticles ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#8694A7', fontSize: 13 }}>Chargement...</div>
            ) : filteredArticles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#8694A7', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0' }}>
                Aucun article disponible — l'administrateur doit en ajouter dans la configuration.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredArticles.map(article => {
                  const isSelected = !!selected[article.id]
                  return (
                    <div key={article.id} onClick={() => toggleArticle(article)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '11px 14px', border: `1.5px solid ${isSelected ? '#2E86C1' : '#E8ECF0'}`, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${isSelected ? '#2E86C1' : '#D1D8E0'}`, background: isSelected ? '#2E86C1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {isSelected && <IcoCheck />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1E3D' }}>{article.name}</div>
                        <div style={{ fontSize: 11, color: '#8694A7' }}>{article.category} · max {article.max_quantity || '—'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — Quantités & DLC */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Quantités & DLC</h2>
            <p style={{ fontSize: 12, color: '#8694A7', marginBottom: 14 }}>Renseignez le stock actuel et la date de péremption</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedArticles.map(article => (
                <div key={article.id} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid #E8ECF0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1E3D', marginBottom: 10 }}>{article.name}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Quantité *</label>
                      <input type="number" value={quantities[article.id]?.qty || ''} onChange={e => updateQty(article.id, 'qty', e.target.value)} placeholder={`/ ${article.max_quantity || '—'}`} style={{ width: '100%', height: 40, border: '1.5px solid #D1D8E0', borderRadius: 8, padding: '0 10px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>DLC</label>
                      <input type="month" value={quantities[article.id]?.dlc || ''} onChange={e => updateQty(article.id, 'dlc', e.target.value)} style={{ width: '100%', height: 40, border: '1.5px solid #D1D8E0', borderRadius: 8, padding: '0 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 4 — Récap */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A1E3D', marginBottom: 4 }}>Récapitulatif</h2>
            <p style={{ fontSize: 12, color: '#8694A7', marginBottom: 14 }}>Vérifiez votre sac avant de valider</p>

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '10px 14px', background: '#F7F8FA', borderBottom: '1px solid #E8ECF0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Article</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qté / DLC</span>
              </div>
              {selectedArticles.map((article, i) => {
                const q = quantities[article.id]
                return (
                  <div key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < selectedArticles.length - 1 ? '1px solid #F0F2F5' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1E3D' }}>{article.name}</div>
                      <div style={{ fontSize: 11, color: '#8694A7' }}>{article.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1E3D' }}>{q?.qty}<span style={{ fontSize: 11, color: '#8694A7', fontWeight: 400 }}>/{article.max_quantity || '—'}</span></div>
                      <div style={{ fontSize: 11, color: '#8694A7' }}>{q?.dlc || 'Pas de DLC'}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: '#E3F0FA', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#2E86C1', display: 'flex', gap: 8, alignItems: 'center' }}>
              <IcoSac color="#2E86C1" size={14} />
              <span>{selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} seront ajoutés à votre sac.</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: '#fff', borderTop: '1px solid #E8ECF0', padding: 14 }}>
        <button
          onClick={() => step < TOTAL_STEPS ? setStep(s => s + 1) : handleSubmit()}
          disabled={!canNext() || loading}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: canNext() ? '#0A1E3D' : '#CBD5E0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? 'Création en cours...' : step === TOTAL_STEPS ? <><IcoCheck />Créer mon sac</> : step === 1 ? 'Commencer' : 'Suivant'}
        </button>
      </div>
    </div>
  )
}