import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './OnboardPage.module.css'

const GOALS = [
  { value: 'anxiety', label: '😰 Managing anxiety & stress' },
  { value: 'mood',    label: '📊 Tracking my moods' },
  { value: 'cbt',     label: '🧠 Learning CBT techniques' },
  { value: 'support', label: '💬 Just need someone to talk to' },
  { value: 'all',     label: '🌿 All of the above' },
]

export default function OnboardPage() {
  const { session, saveProfile } = useAuth()
  const [name, setName]   = useState(session?.user?.user_metadata?.full_name ?? '')
  const [goal, setGoal]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!goal)        { setError('Please choose a goal.'); return }
    setLoading(true)
    try {
      await saveProfile(name.trim(), goal)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.emoji}>🌤️</div>
        <h2 className={styles.title}>Welcome to Lume</h2>
        <p className={styles.sub}>Let's personalise your experience so I can support you better.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Your name</label>
            <input
              type="text"
              placeholder="What should I call you?"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className={styles.field}>
            <label>What brings you here?</label>
            <div className={styles.goalGrid}>
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  className={`${styles.goalBtn} ${goal === g.value ? styles.goalSelected : ''}`}
                  onClick={() => setGoal(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Setting up…' : 'Begin my journey →'}
          </button>
        </form>
      </div>
    </div>
  )
}
