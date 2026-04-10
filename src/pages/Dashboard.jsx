import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Sidebar      from '../components/Sidebar'
import MobileNav    from '../components/MobileNav'   // ← Android bottom nav
import ChatPage     from './ChatPage'
import MoodPage     from './MoodPage'
import MusicPage    from './MusicPage'
import CbtPage      from './CbtPage'
import CrisisPage   from './CrisisPage'
import InsightsPage from './InsightsPage'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { profile, updateStreak } = useAuth()
  const [moodDots, setMoodDots] = useState([])
  const [streak, setStreak]     = useState(profile?.streak ?? 1)

  useEffect(() => {
    updateStreak()
    loadRecentMoods()
  }, [])

  useEffect(() => { setStreak(profile?.streak ?? 1) }, [profile])

  async function loadRecentMoods() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('mood_logs')
      .select('emoji, label')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7)
    if (data) setMoodDots(data)
  }

  function onMoodLogged(entry) {
    setMoodDots(prev => [{ emoji: entry.emoji, label: entry.label }, ...prev].slice(0, 7))
  }

  return (
    <div className={styles.shell}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sidebar moodDots={moodDots} streak={streak} />

      <main className={styles.main}>
        <Routes>
          <Route path="/"         element={<Navigate to="/chat" replace />} />
          <Route path="/chat"     element={<ChatPage />} />
          <Route path="/mood"     element={<MoodPage onMoodLogged={onMoodLogged} />} />
          <Route path="/music"    element={<MusicPage />} />
          <Route path="/cbt"      element={<CbtPage />} />
          <Route path="/crisis"   element={<CrisisPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </main>

      {/* Mobile bottom nav — shown on Android/small screens via CSS */}
      <MobileNav />
    </div>
  )
}
