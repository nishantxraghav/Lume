import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  speakBreathPhase, prewarmBreathingAudio,
  stopSpeaking, speechRecognitionSupported,
}                                       from '../lib/voiceEngine'   // ← Feature 6
import styles from './CbtPage.module.css'

const EXERCISES = [
  { icon:'🌬️', title:'4-7-8 Breathing',    desc:'Calm your nervous system with this powerful breathing pattern.',        duration:'5 min', action:'breathing'   },
  { icon:'📝', title:'Thought Record',       desc:'Identify and gently challenge unhelpful thought patterns.',             duration:'10 min', action:'thought'    },
  { icon:'🧘', title:'Body Scan',            desc:'A grounding mindfulness exercise to release tension head to toe.',      duration:'8 min',  action:'bodyscan'   },
  { icon:'🪞', title:'Self-Compassion',      desc:"Speak to yourself with the kindness you'd offer a dear friend.",       duration:'7 min',  action:'compassion' },
  { icon:'📋', title:'Worry Time',           desc:'Schedule your worries and free the rest of your day from rumination.', duration:'5 min',  action:'worry'      },
  { icon:'🌈', title:'5-4-3-2-1 Grounding', desc:'Use your five senses to anchor yourself firmly to the present moment.', duration:'3 min',  action:'grounding'  },
]

// ── Breathing phases with matching voice phrase keys ──────────────
const BREATH_PHASES = [
  { text:'Inhale',  secs:4,  cls:'inhale',  instruction:'Breathe in slowly through your nose…',  voiceKey:'inhale' },
  { text:'Hold',    secs:7,  cls:'hold',    instruction:'Hold gently — don\'t strain…',           voiceKey:'hold'   },
  { text:'Exhale',  secs:8,  cls:'exhale',  instruction:'Breathe out slowly through your mouth…', voiceKey:'exhale' },
]

export default function CbtPage() {
  const navigate = useNavigate()
  const [screen,      setScreen]      = useState('grid')
  const [phase,       setPhase]       = useState(0)
  const [count,       setCount]       = useState(0)
  const [running,     setRunning]     = useState(false)
  const [voiceBreath, setVoiceBreath] = useState(true)   // voice breathing ON by default
  const [ttsReady,    setTtsReady]    = useState(false)  // prewarm status

  const timerRef     = useRef(null)
  const speakingRef  = useRef(false)   // prevent overlapping TTS calls
  const phaseRef     = useRef(0)       // latest phase without stale closure

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    stopSpeaking()
  }, [])

  // ── Prewarm audio cache when user enters breathing screen ────────
  // Calls ElevenLabs once per session per phrase, then cached forever
  function enterBreathing() {
    setScreen('breathing')
    if (!ttsReady) {
      prewarmBreathingAudio('calm')   // fire-and-forget
      setTtsReady(true)
    }
  }

  function startExercise(action) {
    if (action === 'breathing') { enterBreathing(); return }
    const map = {
      thought:   'Guide me through a thought record — help me identify and challenge an unhelpful thought.',
      bodyscan:  'Guide me through a body scan mindfulness exercise from feet to head.',
      compassion:'Guide me through a self-compassion exercise — help me speak to myself kindly.',
      worry:     'Help me do a worry time exercise — I want to schedule and contain my worries.',
      grounding: 'Guide me through the 5-4-3-2-1 grounding exercise using all five senses.',
    }
    navigate('/chat', { state: { autoSend: map[action] } })
  }

  // ── Speak a phase instruction, non-blocking ───────────────────────
  async function speakPhase(voiceKey) {
    if (!voiceBreath || speakingRef.current) return
    speakingRef.current = true
    try {
      await speakBreathPhase(voiceKey)
    } catch {
      // Fail silently — text instructions always shown
    } finally {
      speakingRef.current = false
    }
  }

  // ── Breathing timer logic ─────────────────────────────────────────
  function startBreathing() {
    phaseRef.current = 0
    setPhase(0); setCount(BREATH_PHASES[0].secs); setRunning(true)
    speakPhase('ready')
    setTimeout(() => runPhase(0, BREATH_PHASES[0].secs), 1800)
  }

  function runPhase(p, c) {
    if (c === BREATH_PHASES[p].secs) {
      // Phase just started — speak its instruction
      speakPhase(BREATH_PHASES[p].voiceKey)
    }
    if (c === 0) {
      const next = (p + 1) % 3
      phaseRef.current = next
      setPhase(next)
      setCount(BREATH_PHASES[next].secs)
      runPhase(next, BREATH_PHASES[next].secs)
      return
    }
    setCount(c)
    timerRef.current = setTimeout(() => {
      if (phaseRef.current === p) runPhase(p, c - 1)
    }, 1000)
  }

  function pauseBreathing() {
    clearTimeout(timerRef.current)
    stopSpeaking()
    speakingRef.current = false
    setRunning(false)
  }

  function stopBreathing() {
    pauseBreathing()
    setScreen('grid')
    setPhase(0)
    setCount(0)
  }

  const bp = BREATH_PHASES[phase]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>CBT Exercises</h2>
        <p>Evidence-based tools to gently reshape how you think and feel.</p>
      </header>

      <div className={styles.body}>
        {screen === 'grid' && (
          <div className={styles.grid}>
            {EXERCISES.map(ex => (
              <div key={ex.action} className={styles.card} onClick={() => startExercise(ex.action)}>
                <div className={styles.exIcon}>{ex.icon}</div>
                <h4>{ex.title}</h4>
                <p>{ex.desc}</p>
                <div className={styles.dur}>⏱ {ex.duration}</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'breathing' && (
          <div className={styles.breathWrap}>
            <div className={styles.breathHeader}>
              <h3 className={styles.breathTitle}>4-7-8 Breathing</h3>
              {/* Voice breathing toggle */}
              <button
                className={`${styles.voiceBreathToggle} ${voiceBreath ? styles.voiceBreathOn : ''}`}
                onClick={() => {
                  setVoiceBreath(v => !v)
                  if (voiceBreath) stopSpeaking()
                }}
                title={voiceBreath ? 'Turn off voice guidance' : 'Turn on voice guidance'}
              >
                {voiceBreath ? '🔊 Voice on' : '🔇 Voice off'}
              </button>
            </div>

            <p className={styles.breathSub}>Follow the circle — breathe in for 4, hold for 7, out for 8</p>

            <div className={styles.circleWrap}>
              <div className={`${styles.circle} ${running ? styles[bp.cls] : ''}`}>
                {running ? bp.text : 'Ready'}
              </div>
            </div>

            {running && (
              <>
                <div className={styles.countdown}>{count}</div>
                <p className={styles.instruction}>{bp.instruction}</p>
              </>
            )}

            {!running && ttsReady && (
              <p className={styles.preloadNote}>🎙️ Voice guidance ready</p>
            )}

            <div className={styles.breathBtns}>
              {!running
                ? <button className={styles.startBtn} onClick={startBreathing}>Start</button>
                : <button className={styles.startBtn} style={{ background: 'var(--text-soft)' }} onClick={pauseBreathing}>Pause</button>
              }
              <button className={styles.backBtn} onClick={stopBreathing}>← Back to exercises</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
