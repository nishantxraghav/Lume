import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/chat',     icon: '💬', label: 'Chat with Lume'  },
  { to: '/mood',     icon: '📊', label: 'Mood Journal'    },
  { to: '/insights', icon: '✨', label: 'Insights'        },
  { to: '/music',    icon: '🎵', label: 'Music & Sounds'  },
  { to: '/cbt',      icon: '🧠', label: 'CBT Exercises'   },
  { to: '/crisis',   icon: '🆘', label: 'Crisis Resources' },
]

const GOAL_LABELS = {
  anxiety: 'Managing anxiety',
  mood:    'Mood tracking',
  cbt:     'CBT techniques',
  support: 'Emotional support',
  all:     'Full wellness journey',
}

export default function Sidebar({ moodDots, streak }) {
  const { profile, signOut } = useAuth()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoMark}>🌤️</div>
        <span>Lume</span>
      </div>

      <div className={styles.userChip}>
        <div className={styles.avatar}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" />
            : '🙂'}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{profile?.display_name ?? 'Friend'}</div>
          <div className={styles.userSub}>{GOAL_LABELS[profile?.goal] ?? 'Wellness journey'}</div>
        </div>
        <button className={styles.logoutBtn} onClick={signOut} title="Sign out">↩</button>
      </div>

      <div className={styles.streakCard}>
        <span className={styles.streakIcon}>🔥</span>
        <div>
          <div className={styles.streakNum}>{streak}</div>
          <div className={styles.streakLabel}>day streak — keep going!</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>Menu</div>
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{n.icon}</span>
            <span className={styles.navLabel}>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {moodDots.length > 0 && (
        <div className={styles.moodMini}>
          <div className={styles.moodMiniLabel}>Recent moods</div>
          <div className={styles.moodDots}>
            {moodDots.slice(0, 7).map((d, i) => (
              <span key={i} className={styles.moodDot} title={d.label}>
                {d.emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
