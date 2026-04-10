import { useState, useRef, useEffect } from 'react'
import { PERSONALITY_MODES } from '../lib/personalityModes'
import styles from './PersonalityToggle.module.css'

/**
 * PersonalityToggle
 *
 * Renders a compact mode-selector pill in the chat header.
 * Clicking it opens a popover with the three mode cards.
 *
 * Props:
 *   currentMode  {string}  — active mode id
 *   onChange     {fn}      — called with new mode id when user picks one
 *   disabled     {boolean} — grayed out while AI is thinking
 */
export default function PersonalityToggle({ currentMode, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const mode = PERSONALITY_MODES[currentMode]

  // Close popover when clicking outside
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(id) {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className={styles.wrap} ref={ref}>
      {/* Trigger pill */}
      <button
        className={`${styles.pill} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        title="Change personality mode"
        aria-expanded={open}
      >
        <span className={styles.pillEmoji}>{mode.emoji}</span>
        <span className={styles.pillLabel}>{mode.label}</span>
        <svg
          className={`${styles.pillChevron} ${open ? styles.open : ''}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>Choose your companion style</span>
            <span className={styles.popoverSub}>Changes take effect on next message</span>
          </div>

          <div className={styles.modeCards}>
            {Object.values(PERSONALITY_MODES).map(m => (
              <button
                key={m.id}
                className={`${styles.modeCard} ${currentMode === m.id ? styles.active : ''}`}
                style={currentMode === m.id ? {
                  borderColor: m.colorBorder,
                  background: m.colorLight,
                } : {}}
                onClick={() => select(m.id)}
              >
                {/* Active check */}
                {currentMode === m.id && (
                  <div className={styles.activeCheck} style={{ background: m.color }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                )}

                <div className={styles.modeEmoji} style={{ color: m.color }}>{m.emoji}</div>
                <div className={styles.modeInfo}>
                  <div className={styles.modeLabel} style={ currentMode === m.id ? { color: m.color } : {} }>
                    {m.label}
                  </div>
                  <div className={styles.modeTagline}>{m.tagline}</div>
                  <div className={styles.modeDesc}>{m.description}</div>
                  <div className={styles.modeExample} style={{ borderLeftColor: m.color }}>
                    {m.exampleReply}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
