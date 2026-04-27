const STATUS_COLORS = {
  ok:      { dot: '#1D8348', border: '#1D8348', bg: '#E6F2EC' },
  warning: { dot: '#D4860B', border: '#D4860B', bg: '#FBF1E0' },
  danger:  { dot: '#C0392B', border: '#C0392B', bg: '#FEF2F2' },
}

export const CONSTANTES = [
  {
    id: 'spo2',
    label: 'SpO2',
    unit: '%',
    step: 1,
    norms: [
      { min: 95,  max: 100, status: 'ok'      },
      { min: 90,  max: 94,  status: 'warning'  },
      { min: 0,   max: 89,  status: 'danger'   },
    ],
  },
  {
    id: 'fr_vent',
    label: 'Fr. Vent',
    unit: 'c/min',
    step: 1,
    norms: [
      { min: 12, max: 20,  status: 'ok'      },
      { min: 10, max: 11,  status: 'warning'  },
      { min: 21, max: 25,  status: 'warning'  },
      { min: 0,  max: 9,   status: 'danger'   },
      { min: 26, max: 999, status: 'danger'   },
    ],
  },
  {
    id: 'pouls',
    label: 'Pouls',
    unit: 'bpm',
    step: 1,
    norms: [
      { min: 60,  max: 100, status: 'ok'      },
      { min: 50,  max: 59,  status: 'warning'  },
      { min: 101, max: 120, status: 'warning'  },
      { min: 0,   max: 49,  status: 'danger'   },
      { min: 121, max: 999, status: 'danger'   },
    ],
  },
  {
    id: 'ta_sys',
    label: 'TA Sys',
    unit: 'mmHg',
    step: 1,
    norms: [
      { min: 90,  max: 140, status: 'ok'      },
      { min: 80,  max: 89,  status: 'warning'  },
      { min: 141, max: 160, status: 'warning'  },
      { min: 0,   max: 79,  status: 'danger'   },
      { min: 161, max: 999, status: 'danger'   },
    ],
  },
  {
    id: 'ta_dia',
    label: 'TA Dia',
    unit: 'mmHg',
    step: 1,
    norms: [
      { min: 60,  max: 90,  status: 'ok'      },
      { min: 40,  max: 59,  status: 'warning'  },
      { min: 91,  max: 110, status: 'warning'  },
      { min: 0,   max: 39,  status: 'danger'   },
      { min: 111, max: 999, status: 'danger'   },
    ],
  },
  {
    id: 'temperature',
    label: 'Température',
    unit: '°C',
    step: 0.1,
    norms: [
      { min: 36.1, max: 37.9, status: 'ok'      },
      { min: 35.0, max: 36.0, status: 'warning'  },
      { min: 38.0, max: 39.0, status: 'warning'  },
      { min: 0,    max: 34.9, status: 'danger'   },
      { min: 39.1, max: 99,   status: 'danger'   },
    ],
  },
  {
    id: 'dextro',
    label: 'Dextro',
    unit: 'g/L',
    step: 0.1,
    norms: [
      { min: 0.7,  max: 1.8,  status: 'ok'      },
      { min: 0.5,  max: 0.69, status: 'warning'  },
      { min: 1.81, max: 2.5,  status: 'warning'  },
      { min: 0,    max: 0.49, status: 'danger'   },
      { min: 2.51, max: 999,  status: 'danger'   },
    ],
  },
]

export function getConstantStatus(constante, value) {
  if (value === '' || value === null || value === undefined) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  for (const norm of constante.norms) {
    if (num >= norm.min && num <= norm.max) return norm.status
  }
  return null
}

function ConstanteCard({ constante, value, onChange }) {
  const status = getConstantStatus(constante, value)
  const colors = status ? STATUS_COLORS[status] : null

  return (
    <div style={{
      background: colors ? colors.bg : '#fff',
      borderRadius: 14,
      border: `1.5px solid ${colors ? colors.border : '#E8ECF0'}`,
      padding: '12px 14px',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors ? colors.dot : '#8694A7', marginBottom: 6 }}>
        {constante.label} · {constante.unit}
      </div>
      <input
        type="number"
        inputMode="decimal"
        step={constante.step}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          fontSize: 24,
          fontWeight: 700,
          color: colors ? colors.dot : '#0A1E3D',
          outline: 'none',
          padding: 0,
          fontFamily: "'DM Sans',sans-serif",
        }}
      />
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors ? colors.dot : '#E8ECF0',
        marginTop: 8,
        transition: 'background 0.2s',
      }} />
    </div>
  )
}

export default function ConstantesStep({ values, onChange }) {
  const set = (id, val) => onChange({ ...values, [id]: val })
  const v = (id) => values[id] ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Ligne 1 — Respi */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        Respiratoire
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ConstanteCard constante={CONSTANTES[0]} value={v('spo2')}    onChange={val => set('spo2', val)} />
        <ConstanteCard constante={CONSTANTES[1]} value={v('fr_vent')} onChange={val => set('fr_vent', val)} />
      </div>

      {/* Ligne 2 — Cardio */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6, marginBottom: 2 }}>
        Cardiovasculaire
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <ConstanteCard constante={CONSTANTES[2]} value={v('pouls')}  onChange={val => set('pouls', val)} />
        <ConstanteCard constante={CONSTANTES[3]} value={v('ta_sys')} onChange={val => set('ta_sys', val)} />
        <ConstanteCard constante={CONSTANTES[4]} value={v('ta_dia')} onChange={val => set('ta_dia', val)} />
      </div>

      {/* Ligne 3 — Métabolique */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6, marginBottom: 2 }}>
        Métabolique
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ConstanteCard constante={CONSTANTES[5]} value={v('temperature')} onChange={val => set('temperature', val)} />
        <ConstanteCard constante={CONSTANTES[6]} value={v('dextro')}      onChange={val => set('dextro', val)} />
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
        {[{ color: '#1D8348', label: 'Normal' }, { color: '#D4860B', label: 'Attention' }, { color: '#C0392B', label: 'Critique' }].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: 11, color: '#8694A7' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#B0BFCC', fontStyle: 'italic' }}>
        Toutes les constantes sont optionnelles.
      </div>
    </div>
  )
}