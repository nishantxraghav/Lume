import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './MoodPage.module.css'

const MOODS = [
  { emoji: '😄', label: 'Amazing' },
  { emoji: '😊', label: 'Good'    },
  { emoji: '😐', label: 'Okay'    },
  { emoji: '😔', label: 'Low'     },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😤', label: 'Frustrated' },
]

export default function MoodPage({ onMoodLogged }) {
  const [selected, setSelected] = useState(null)   // { emoji, label }
  const [energy, setEnergy]     = useState(5)
  const [note, setNote]         = useState('')
  const [logs, setLogs]         = useState([])
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    const uid = (await supabase.auth.getUser()).data.user.id
    const { data } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setLogs(data)
  }

  async function submit() {
    if (!selected) { showToast('Please pick a mood first 🙂'); return }
    setSaving(true)
    const uid = (await supabase.auth.getUser()).data.user.id
    const { data, error } = await supabase.from('mood_logs').insert({
      user_id: uid,
      emoji: selected.emoji,
      label: selected.label,
      energy: parseInt(energy),
      note: note.trim(),
    }).select().single()

    if (!error && data) {
      setLogs(prev => [data, ...prev])
      onMoodLogged?.(data)
      showToast(`Logged — ${selected.emoji} ${selected.label}`)
      setSelected(null); setEnergy(5); setNote('')
    }
    setSaving(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <h2>Mood Journal</h2>
        <p>Track how you feel each day — small check-ins lead to big insights.</p>
      </header>

      <div className={styles.body}>
        {/* Log card */}
        <div className={styles.card}>
          <h3>How are you feeling right now?</h3>
          <p>Be honest — this is just for you.</p>

          <div className={styles.moodGrid}>
            {MOODS.map(m => (
              <button
                key={m.label}
                className={`${styles.moodBtn} ${selected?.label === m.label ? styles.sel : ''}`}
                onClick={() => setSelected(m)}
              >
                <span className={styles.moodEmoji}>{m.emoji}</span>
                <span className={styles.moodLabel}>{m.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.energyRow}>
            <div className={styles.sectionLabel}>Energy level</div>
            <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(e.target.value)} />
            <div className={styles.rangeLabels}><span>Exhausted</span><span>{energy}/10</span><span>Energized</span></div>
          </div>

          <textarea
            className={styles.noteArea}
            placeholder="Anything on your mind? (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />

          <button className={styles.saveBtn} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save check-in ✓'}
          </button>
        </div>

        {/* History */}
        <div className={styles.card}>
          <h3>Recent check-ins</h3>
          {logs.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📓</div>
              <h4>No entries yet</h4>
              <p>Your first check-in will appear here.</p>
            </div>
          ) : (
            <div className={styles.logList}>
              {logs.map(l => (
                <div key={l.id} className={styles.logItem}>
                  <span className={styles.logEmoji}>{l.emoji}</span>
                  <div className={styles.logInfo}>
                    <div className={styles.logMood}>{l.label} · Energy {l.energy}/10</div>
                    {l.note && <div className={styles.logNote}>{l.note}</div>}
                  </div>
                  <div className={styles.logTime}>
                    {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    <br />
                    <span>{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
