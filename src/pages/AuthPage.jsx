import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { signInWithGoogleAndroid } from '../lib/androidAuth'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [tab, setTab]       = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail]   = useState('')
  const [password, setPw]   = useState('')
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  function reset() { setError(''); setSuccess('') }

  async function handleSignIn(e) {
    e.preventDefault(); reset()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignUp(e) {
    e.preventDefault(); reset()
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('Account created! Check your email to confirm, then sign in.')
  }

  async function handleGoogle() {
    reset()
    // Uses system browser on Android, standard redirect on web
    const { error } = await signInWithGoogleAndroid()
    if (error) setError(error.message)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🌤️</div>
        <h1 className={styles.title}>Lume</h1>
        <p className={styles.tagline}>Your calm mental wellness companion</p>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'signin' ? styles.active : ''}`} onClick={() => { setTab('signin'); reset() }}>Sign in</button>
          <button className={`${styles.tabBtn} ${tab === 'signup' ? styles.active : ''}`} onClick={() => { setTab('signup'); reset() }}>Sign up</button>
        </div>

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className={styles.form}>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input type="password" placeholder="Your password" value={password} onChange={e => setPw(e.target.value)} autoComplete="current-password" />
            </div>
            {error   && <div className={styles.errorBox}>{error}</div>}
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className={styles.form}>
            <div className={styles.field}>
              <label>Your name</label>
              <input type="text" placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
            </div>
            {error   && <div className={styles.errorBox}>{error}</div>}
            {success && <div className={styles.successBox}>{success}</div>}
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>
        )}

        <div className={styles.divider}><span>or continue with</span></div>

        <button className={styles.btnGoogle} onClick={handleGoogle}>
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
