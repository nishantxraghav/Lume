import { NavLink } from 'react-router-dom'
import styles from './MobileNav.module.css'

const NAV = [
  { to: '/chat',     icon: '💬', label: 'Chat'     },
  { to: '/mood',     icon: '📊', label: 'Mood'     },
  { to: '/insights', icon: '✨', label: 'Insights' },
  { to: '/music',    icon: '🎵', label: 'Music'    },
  { to: '/cbt',      icon: '🧠', label: 'Exercises'},
]

/**
 * MobileNav — bottom tab bar shown only on mobile/Android (≤768px).
 * Hidden on desktop via CSS (display:none by default, display:flex at ≤768px).
 */
export default function MobileNav() {
  return (
    <nav id="mobile-nav" className={styles.nav} style={{ display: 'none' }}>
      {NAV.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.tabIcon}>{n.icon}</span>
          <span className={styles.tabLabel}>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
