import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(null)

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes (OAuth redirect, sign-in, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Whenever session changes, load or seed the profile
  useEffect(() => {
    if (!session) { setProfile(null); return }
    loadProfile(session.user)
  }, [session])

  async function loadProfile(user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data ?? null)
  }

  async function saveProfile(displayName, goal) {
    const user = session.user
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      goal,
      streak: 1,
      last_active: today,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    if (error) throw error
    await loadProfile(user)
  }

  async function updateStreak() {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    if (profile.last_active === today) return // already updated today

    const last  = profile.last_active
    const diff  = last
      ? Math.floor((new Date(today) - new Date(last)) / 86_400_000)
      : 999
    const newStreak = diff === 1 ? (profile.streak ?? 1) + 1 : 1

    await supabase
      .from('profiles')
      .update({ streak: newStreak, last_active: today })
      .eq('id', session.user.id)

    setProfile(prev => ({ ...prev, streak: newStreak, last_active: today }))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, setProfile, saveProfile, updateStreak, signOut, loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
