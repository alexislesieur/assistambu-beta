import { useEffect, useState } from 'react'
import { api, shiftsApi, interventionsApi } from '../lib/api'

const JOURS_COURT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MOIS        = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MOIS_COURT  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const TYPE_STYLES = {
  garde_uph:        { label: 'Garde UPH',        color: '#C0392B', bg: '#FEF2F2' },
  garde_commercial: { label: 'Garde Commercial',  color: '#2E86C1', bg: '#E3F0FA' },
  conge:            { label: 'Congés',            color: '#D4860B', bg: '#FBF1E0' },
}

// Gardes réelles (shifts)
const SHIFT_STYLE = { color: '#0A1E3D', bg: '#E8ECF0', label: 'Garde effectuée' }

const IcoChevL = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1E3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoChevR = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1E3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoPlus  = ({ color = '#fff' }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoX     = ({ color = '#4A5568' }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck = ({ color = '#fff' })   => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getDaysInMonth(year, month) {
  const days = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  for (let i = startDow - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), current: false })
  for (let d = 1; d <= lastDay.getDate(); d++) days.push({ date: new Date(year, month, d), current: true })
  while (days.length < 42) {
    const last = days[days.length - 1].date
    const next = new Date(last); next.setDate(last.getDate() + 1)
    days.push({ date: next, current: false })
  }
  return days
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDate(d) {
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

function formatTime(t) {
  if (!t) return ''
  if (t.includes('T')) return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return t.slice(0, 5)
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function shiftsInPeriod(shifts, startDate, endDate) {
  return shifts.filter(s => {
    const d = new Date(s.started_at)
    return d >= startDate && d <= endDate
  })
}

function computeShiftStats(shifts, interventions) {
  const completed       = shifts.filter(s => s.ended_at)
  const totalAmpMin     = completed.reduce((acc, s) => acc + Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 60000), 0)
  const totalTTEMin     = completed.reduce((acc, s) => {
    const amp = Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 60000)
    return acc + amp - (s.break_minutes || 0)
  }, 0)
  const totalInterv = interventions.filter(i => shifts.some(s => s.id === i.shift_id)).length
  return {
    gardes:        shifts.length,
    interventions: totalInterv,
    amplitude:     totalAmpMin > 0 ? formatDuration(totalAmpMin) : '—',
    tte:           totalTTEMin > 0 ? formatDuration(totalTTEMin) : '—',
  }
}

// ===== STATS =====
function StatsCard({ shifts, interventions, label }) {
  const { gardes, interventions: nbInterv, amplitude, tte } = computeShiftStats(shifts, interventions)
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#B0BFCC', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Gardes',  value: gardes    },
          { label: 'Interv.', value: nbInterv  },
          { label: 'Ampli.',  value: amplitude },
          { label: 'TTE',     value: tte       },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', borderRight: i < 3 ? '1px solid #F0F2F5' : 'none', padding: '0 4px' }}>
            <div style={{ fontSize: i < 2 ? 20 : 14, fontWeight: 800, color: '#0A1E3D' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#8694A7', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== MODAL AJOUT =====
function AddServiceModal({ date, onClose, onSaved }) {
  const [type, setType]           = useState('garde_uph')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime]     = useState('20:00')
  const [note, setNote]           = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const service = await api.post('/schedules', {
        date: date.toISOString().split('T')[0],
        type, start_time: startTime, end_time: endTime, note,
      })
      onSaved(service); onClose()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1E3D' }}>Ajouter au planning</div>
            <div style={{ fontSize: 11, color: '#8694A7' }}>{formatDate(date)}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoX /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {Object.entries(TYPE_STYLES).map(([id, style]) => (
              <button key={id} onClick={() => setType(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 10, border: `1.5px solid ${type === id ? style.color : '#E8ECF0'}`, background: type === id ? style.bg : '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: type === id ? 700 : 500, color: type === id ? style.color : '#4A5568' }}>{style.label}</span>
              </button>
            ))}
          </div>

          {type !== 'conge' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Horaires</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Début</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', height: 44, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 12px', fontSize: 15, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Fin</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', height: 44, border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '0 12px', fontSize: 15, boxSizing: 'border-box', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>
            </>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: '#8694A7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Note (optionnel)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Secteur nord..." rows={3} style={{ width: '100%', border: '1.5px solid #D1D8E0', borderRadius: 10, padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif" }} />
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E8ECF0' }}>
          <button onClick={handleSave} disabled={loading} style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: '#0A1E3D', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'DM Sans',sans-serif" }}>
            {loading ? 'Enregistrement...' : <><IcoCheck />Ajouter</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== VUE SEMAINE =====
function WeekView({ weekDays, schedules, shifts, interventions, onDayClick, today }) {
  const getSchedulesForDate = (d) => schedules.filter(s => sameDay(new Date(s.date), d))
  const getShiftsForDate    = (d) => shifts.filter(s => sameDay(new Date(s.started_at), d))

  const endOfWeek  = new Date(weekDays[6]); endOfWeek.setHours(23, 59, 59)
  const weekShifts = shiftsInPeriod(shifts, weekDays[0], endOfWeek)

  return (
    <div>
      <StatsCard shifts={weekShifts} interventions={interventions} label={`Semaine ${getWeekNumber(weekDays[0])}`} />
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
        {weekDays.map((day, di) => {
          const daySchedules = getSchedulesForDate(day)
          const dayShifts    = getShiftsForDate(day)
          const isToday      = sameDay(day, today)
          const isWeekend    = di >= 5

          return (
            <div key={di} onClick={() => onDayClick(day)} style={{ display: 'flex', alignItems: 'stretch', borderBottom: di < 6 ? '1px solid #F0F2F5' : 'none', background: isToday ? '#EFF6FF' : isWeekend ? '#FAFAFA' : '#fff', cursor: 'pointer', minHeight: 56 }}>
              <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', borderRight: '1px solid #F0F2F5' }}>
                <span style={{ fontSize: 10, color: isToday ? '#2E86C1' : '#8694A7', fontWeight: 600, textTransform: 'uppercase' }}>{JOURS_LONG[di].slice(0, 3)}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? '#2E86C1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? '#fff' : '#0A1E3D' }}>{day.getDate()}</span>
                </div>
                <span style={{ fontSize: 9, color: '#B0BFCC', marginTop: 1 }}>{MOIS_COURT[day.getMonth()]}</span>
              </div>

              <div style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                {dayShifts.length === 0 && daySchedules.length === 0 ? (
                  <span style={{ fontSize: 11, color: '#D1D8E0', fontStyle: 'italic' }}>Aucun service</span>
                ) : (
                  <>
                    {dayShifts.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: SHIFT_STYLE.bg, borderRadius: 8, padding: '5px 10px', borderLeft: `3px solid ${SHIFT_STYLE.color}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SHIFT_STYLE.color }}>Garde {s.driver ? 'conducteur' : 'équipier'}</span>
                        <span style={{ fontSize: 11, color: '#8694A7' }}>{formatTime(s.started_at)} → {s.ended_at ? formatTime(s.ended_at) : 'En cours'}</span>
                      </div>
                    ))}
                    {daySchedules.map((s, i) => {
                      const style = TYPE_STYLES[s.type] || TYPE_STYLES.garde_uph
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: style.bg, borderRadius: 8, padding: '5px 10px', borderLeft: `3px solid ${style.color}` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: style.color }}>{style.label}</span>
                          {s.type !== 'conge' && <span style={{ fontSize: 11, color: '#8694A7' }}>{formatTime(s.start_time)} → {formatTime(s.end_time)}</span>}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IcoPlus color="#B0BFCC" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== VUE MOIS =====
function MonthView({ year, month, schedules, shifts, interventions, onDayClick, today }) {
  const getSchedulesForDate = (d) => schedules.filter(s => sameDay(new Date(s.date), d))
  const getShiftsForDate    = (d) => shifts.filter(s => sameDay(new Date(s.started_at), d))

  const startOfMonth   = new Date(year, month, 1)
  const endOfMonth     = new Date(year, month + 1, 0, 23, 59, 59)
  const monthShifts    = shiftsInPeriod(shifts, startOfMonth, endOfMonth)
  const monthSchedules = schedules.filter(s => { const d = new Date(s.date); return d.getMonth() === month && d.getFullYear() === year })

  const days  = getDaysInMonth(year, month)
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <StatsCard shifts={monthShifts} interventions={interventions} label={`${MOIS[month]} ${year}`} />

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', background: '#F7F8FA', borderBottom: '1px solid #E8ECF0' }}>
          <div style={{ padding: '8px 4px', fontSize: 9, fontWeight: 700, color: '#B0BFCC', textAlign: 'center' }}>S</div>
          {JOURS_COURT.map((j, i) => (
            <div key={i} style={{ padding: '8px 4px', fontSize: 10, fontWeight: 700, color: '#8694A7', textAlign: 'center' }}>{j}</div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const weekNum = getWeekNumber(week[0].date)
          return (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F0F2F5' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRight: '1px solid #F0F2F5' }}>
                <span style={{ fontSize: 9, color: '#B0BFCC', fontWeight: 600 }}>{weekNum}</span>
              </div>
              {week.map((dayObj, di) => {
                const daySchedules = getSchedulesForDate(dayObj.date)
                const dayShifts    = getShiftsForDate(dayObj.date)
                const dots = [
                  ...dayShifts.map(() => SHIFT_STYLE.color),
                  ...daySchedules.map(s => (TYPE_STYLES[s.type] || TYPE_STYLES.garde_uph).color),
                ]
                const isToday   = sameDay(dayObj.date, today)
                const isWeekend = di >= 5

                return (
                  <div key={di} onClick={() => onDayClick(dayObj.date)} style={{ minHeight: 52, padding: '4px 3px', borderLeft: di > 0 ? '1px solid #F0F2F5' : 'none', background: isToday ? '#EFF6FF' : isWeekend ? '#FAFAFA' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: isToday ? '#2E86C1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: isToday ? 700 : dayObj.current ? 500 : 400, color: isToday ? '#fff' : dayObj.current ? '#0A1E3D' : '#D1D8E0' }}>
                        {dayObj.date.getDate()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dots.slice(0, 4).map((color, i) => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                      ))}
                      {dots.length > 4 && <span style={{ fontSize: 8, color: '#B0BFCC' }}>+{dots.length - 4}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Gardes effectuées */}
      {monthShifts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B0BFCC', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Gardes effectuées · {monthShifts.length}</div>
          {[...monthShifts].sort((a, b) => new Date(a.started_at) - new Date(b.started_at)).map(s => {
            const d   = new Date(s.started_at)
            const amp = s.ended_at ? Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 60000) : null
            const tte = amp !== null ? amp - (s.break_minutes || 0) : null
            return (
              <div key={s.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #E8ECF0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, background: SHIFT_STYLE.color, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1E3D' }}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.driver ? 'Conducteur' : 'Équipier'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8694A7' }}>
                    {formatTime(s.started_at)} → {s.ended_at ? formatTime(s.ended_at) : <span style={{ color: '#2ECC71', fontWeight: 700 }}>En cours</span>}
                    {amp !== null && <span style={{ marginLeft: 8 }}>· Ampli. {formatDuration(amp)}</span>}
                    {tte !== null && <span style={{ marginLeft: 6 }}>· TTE {formatDuration(tte)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Planning */}
      {monthSchedules.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B0BFCC', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Planning · {monthSchedules.length}</div>
          {[...monthSchedules].sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => {
            const style = TYPE_STYLES[s.type] || TYPE_STYLES.garde_uph
            const d = new Date(s.date)
            return (
              <div key={s.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #E8ECF0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, background: style.color, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1E3D' }}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: 11, color: '#8694A7' }}>
                    {style.label}{s.type !== 'conge' ? ` · ${formatTime(s.start_time)} → ${formatTime(s.end_time)}` : ''}
                  </div>
                  {s.note && <div style={{ fontSize: 10, color: '#B0BFCC', marginTop: 2 }}>{s.note}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function PlanningPage() {
  const now   = new Date()
  const [view, setView]           = useState('month')
  const [year, setYear]           = useState(now.getFullYear())
  const [month, setMonth]         = useState(now.getMonth())
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(now))
  const [schedules, setSchedules] = useState([])
  const [shifts, setShifts]       = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const today = new Date()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/schedules/month?year=${year}&month=${month + 1}`).catch(() => []),
      shiftsApi.index().catch(() => []),
      interventionsApi.index().catch(() => []),
    ]).then(([sched, sh, interv]) => {
      setSchedules(Array.isArray(sched) ? sched : sched?.data || [])
      setShifts(Array.isArray(sh) ? sh : [])
      setInterventions(Array.isArray(interv) ? interv : [])
    }).finally(() => setLoading(false))
  }, [year, month])

  const syncWeekToMonth = (monday) => { setYear(monday.getFullYear()); setMonth(monday.getMonth()) }

  const prevPeriod = () => {
    if (view === 'month') {
      if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    } else {
      const prev = new Date(weekStart); prev.setDate(weekStart.getDate() - 7)
      setWeekStart(prev); syncWeekToMonth(prev)
    }
  }

  const nextPeriod = () => {
    if (view === 'month') {
      if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    } else {
      const next = new Date(weekStart); next.setDate(weekStart.getDate() + 7)
      setWeekStart(next); syncWeekToMonth(next)
    }
  }

  const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekStart(getMondayOfWeek(today)) }

  const weekDays    = getWeekDays(weekStart)
  const periodLabel = view === 'month'
    ? `${MOIS[month]} ${year}`
    : `S${getWeekNumber(weekStart)} · ${weekStart.getDate()} ${MOIS_COURT[weekStart.getMonth()]} – ${weekDays[6].getDate()} ${MOIS_COURT[weekDays[6].getMonth()]}`

  const getSchedulesForDate = (d) => schedules.filter(s => sameDay(new Date(s.date), d))
  const getShiftsForDate    = (d) => shifts.filter(s => sameDay(new Date(s.started_at), d))

  return (
    <div style={{ padding: 16, fontFamily: "'DM Sans',sans-serif" }}>

      {/* Modal jour */}
      {selectedDate && !showAdd && (
        <div style={{ position: 'fixed', top: 56, bottom: 72, left: 0, right: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8ECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1E3D' }}>{formatDate(selectedDate)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAdd(true)} style={{ background: '#0A1E3D', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoPlus /></button>
                <button onClick={() => setSelectedDate(null)} style={{ background: '#F0F2F5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoX /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
              {getShiftsForDate(selectedDate).map(s => (
                <div key={s.id} style={{ background: SHIFT_STYLE.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 8, borderLeft: `4px solid ${SHIFT_STYLE.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: SHIFT_STYLE.color }}>Garde {s.driver ? 'conducteur' : 'équipier'}</div>
                  <div style={{ fontSize: 11, color: '#4A5568' }}>{formatTime(s.started_at)} → {s.ended_at ? formatTime(s.ended_at) : <span style={{ color: '#2ECC71', fontWeight: 700 }}>En cours</span>}</div>
                  {s.break_minutes > 0 && <div style={{ fontSize: 10, color: '#8694A7' }}>Pause : {s.break_minutes}min</div>}
                </div>
              ))}
              {getSchedulesForDate(selectedDate).map(s => {
                const style = TYPE_STYLES[s.type] || TYPE_STYLES.garde_uph
                return (
                  <div key={s.id} style={{ background: style.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 8, borderLeft: `4px solid ${style.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: style.color }}>{style.label}</div>
                      {s.type !== 'conge' && <div style={{ fontSize: 11, color: '#4A5568' }}>{formatTime(s.start_time)} → {formatTime(s.end_time)}</div>}
                      {s.note && <div style={{ fontSize: 10, color: '#8694A7', marginTop: 2 }}>{s.note}</div>}
                    </div>
                    <button onClick={async () => {
                      try { await api.delete(`/schedules/${s.id}`); setSchedules(prev => prev.filter(x => x.id !== s.id)) }
                      catch (e) { console.error(e) }
                    }} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IcoX color="#C0392B" />
                    </button>
                  </div>
                )
              })}
              {getShiftsForDate(selectedDate).length === 0 && getSchedulesForDate(selectedDate).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8694A7', fontSize: 13 }}>Aucun service ce jour</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && selectedDate && (
        <AddServiceModal date={selectedDate} onClose={() => setShowAdd(false)} onSaved={(s) => { setSchedules(prev => [...prev, s]); setShowAdd(false) }} />
      )}

      {/* Switch vue */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', background: view === v.id ? '#0A1E3D' : '#fff', color: view === v.id ? '#fff' : '#4A5568', fontWeight: view === v.id ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={prevPeriod} style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoChevL /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1E3D' }}>{periodLabel}</div>
          <button onClick={goToToday} style={{ fontSize: 10, color: '#2E86C1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: "'DM Sans',sans-serif" }}>Aujourd'hui</button>
        </div>
        <button onClick={nextPeriod} style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoChevR /></button>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: SHIFT_STYLE.color }} />
          <span style={{ fontSize: 10, color: '#8694A7' }}>Garde effectuée</span>
        </div>
        {Object.entries(TYPE_STYLES).map(([_, style]) => (
          <div key={style.label} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: style.color }} />
            <span style={{ fontSize: 10, color: '#8694A7', whiteSpace: 'nowrap' }}>{style.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '3px solid #E8ECF0', borderTopColor: '#2E86C1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : view === 'month' ? (
        <MonthView year={year} month={month} schedules={schedules} shifts={shifts} interventions={interventions} onDayClick={setSelectedDate} today={today} />
      ) : (
        <WeekView weekDays={weekDays} schedules={schedules} shifts={shifts} interventions={interventions} onDayClick={setSelectedDate} today={today} />
      )}
    </div>
  )
}