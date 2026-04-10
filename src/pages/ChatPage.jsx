import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase, geminiChat as aiChat }   from '../lib/supabase'
import { analyseMessage }                    from '../lib/sentimentGuard'
import {
  saveMemory, getMemory, detectSolution,
  buildMemoryContext, getRecallHint,
}                                            from '../lib/emotionalMemory'
import {
  PERSONALITY_MODES, loadMode, saveMode, getModePromptLayer,
}                                            from '../lib/personalityModes'
import PersonalityToggle                     from '../components/PersonalityToggle'
import { detectDistortions, buildDistortionContext } from '../lib/distortionDetector'
import {
  speakText, stopSpeaking, isSpeaking as ttsPlaying,
  startListening, stopListening,
  speechRecognitionSupported,
  voiceForMood, cleanForTTS,
}                                            from '../lib/voiceEngine'           // ← Feature 6
import VoiceToggle                           from '../components/VoiceToggle'    // ← Feature 6 UI
import { useAuth } from '../context/AuthContext'
import styles from './ChatPage.module.css'

const QUICK = [
  { label: '😰 Feeling anxious',    text: "I'm feeling anxious right now. Can you help?" },
  { label: '🌬️ Breathing exercise', text: 'Guide me through a breathing exercise.' },
  { label: '🎵 Suggest music',       text: 'Suggest some calming music for my current mood.' },
  { label: '🔄 Challenge a thought', text: "Help me challenge a negative thought I'm having." },
]

// ── System prompt builder ─────────────────────────────────────────
function makeSystemMsg(profile, memoryContext = '', modeId = 'therapist', distortionContext = '', voiceMode = false) {
  const goalMap = {
    anxiety: 'managing anxiety and stress',
    mood:    'tracking moods and emotions',
    cbt:     'exploring CBT techniques',
    support: 'finding emotional support',
    all:     'full wellness — anxiety, mood, CBT, and support',
  }
  const modeLayer = getModePromptLayer(modeId)

  // ── Voice mode modifier: shorter, more natural spoken sentences ──
  const voiceLayer = voiceMode
    ? `\n\nVOICE MODE ACTIVE: Your response will be read aloud. Write for the ear, not the eye. Use short, natural sentences. Avoid lists, parentheses, URLs, and anything that sounds unnatural when spoken. Aim for under 80 words.`
    : ''

  return {
    role: 'system',
    content: `You are Lume, a mental health wellness companion.
The user's name is ${profile.display_name}. Their primary focus is: ${goalMap[profile.goal] ?? 'general wellness'}.

Core rules:
- Keep replies under 200 words unless doing a guided exercise.
- Never diagnose or replace professional care. For serious concerns, gently recommend professional help.
- If you detect crisis signals, set aside the current personality mode, speak with deep compassion, and direct the user to the Crisis Resources section.
- When the user asks for music, suggest the Music & Sounds section.
- Use plain prose with line breaks. No markdown headers, no bullet points, no asterisks.
- Always respond as Lume only.
- When you mention a past helpful solution, keep it to one sentence.
${modeLayer}${voiceLayer}${memoryContext}${distortionContext}`,
  }
}

// ── Voice mode persistence ────────────────────────────────────────
const LS_VOICE_KEY = 'lume_voice_mode'
function loadVoiceMode() {
  try { return localStorage.getItem(LS_VOICE_KEY) === 'true' } catch { return false }
}
function saveVoiceMode(v) {
  try { localStorage.setItem(LS_VOICE_KEY, String(v)) } catch {}
}

// ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { profile } = useAuth()
  const location    = useLocation()

  const [messages,    setMessages]    = useState([])
  const [history,     setHistory]     = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [welcomed,    setWelcomed]    = useState(false)
  const [modeId,      setModeId]      = useState(() => loadMode())

  // ── Voice mode state ─────────────────────────────────────────────
  const [voiceMode,    setVoiceMode]    = useState(() => loadVoiceMode())
  const [isListening,  setIsListening]  = useState(false)
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false)
  const [interimText,  setInterimText]  = useState('')
  const srSupported = speechRecognitionSupported()

  const recentUserMsgs  = useRef([])
  const memoriesRef     = useRef([])
  const memoryCtxRef    = useRef('')
  const recallShownRef  = useRef(false)
  const userIdRef       = useRef(null)
  const currentSeverity = useRef(null)   // track latest severity for voice profile
  const bottomRef       = useRef(null)
  const inputRef        = useRef(null)
  const modeIdRef       = useRef(modeId)
  const voiceModeRef    = useRef(voiceMode)

  useEffect(() => { modeIdRef.current = modeId },     [modeId])
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])

  // Cleanup TTS + STT on unmount
  useEffect(() => () => { stopSpeaking(); stopListening() }, [])

  useEffect(() => {
    if (profile && !welcomed) { setWelcomed(true); bootChat() }
  }, [profile])

  useEffect(() => {
    if (location.state?.autoSend && welcomed) {
      sendMessage(location.state.autoSend)
      window.history.replaceState({}, '')
    }
  }, [location.state, welcomed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Boot ──────────────────────────────────────────────────────────
  async function bootChat() {
    const { data: { user } } = await supabase.auth.getUser()
    userIdRef.current = user?.id ?? null
    const mems = await getMemory(supabase, userIdRef.current, 20)
    memoriesRef.current = mems
    memoryCtxRef.current = buildMemoryContext(mems)
    await initChat()
  }

  async function initChat() {
    const sys = makeSystemMsg(profile, memoryCtxRef.current, modeIdRef.current, '', voiceModeRef.current)
    const goalMap = {
      anxiety:'managing anxiety and stress', mood:'tracking your moods',
      cbt:'exploring CBT techniques', support:'finding emotional support',
      all:'your full wellness journey',
    }
    const hour  = new Date().getHours()
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const mode  = PERSONALITY_MODES[modeIdRef.current]

    const initPrompt = {
      role: 'user',
      content: `${greet}! Greet ${profile.display_name} warmly, introduce yourself as Lume, mention you help with ${goalMap[profile.goal] ?? 'their wellness'}, and ask how they feel. 3–4 sentences. Apply the ${mode.label} style from the first word.`,
    }

    try {
      const reply = await aiChat([sys, initPrompt])
      setMessages([{ role: 'ai', text: reply, time: now() }])
      setHistory([sys, initPrompt, { role: 'assistant', content: reply }])
      // Speak welcome if voice mode is already on
      if (voiceModeRef.current) speakReply(reply, null)
    } catch {
      const fallback = `Hi ${profile.display_name}! I'm Lume, your calm wellness companion. How are you feeling right now?`
      setMessages([{ role: 'ai', text: fallback, time: now() }])
      setHistory([sys, { role: 'assistant', content: fallback }])
    }
  }

  // ── Voice mode toggle ─────────────────────────────────────────────
  function handleVoiceToggle() {
    const next = !voiceMode
    saveVoiceMode(next)
    setVoiceMode(next)
    if (!next) {
      stopSpeaking()
      stopListening()
      setIsListening(false)
      setIsSpeakingTTS(false)
    }
    setMessages(prev => [...prev, {
      role:      'system-notice',
      text:      next ? '🎙️ Voice Therapy Mode on — Lume will speak her responses' : '💬 Switched back to text mode',
      time:      now(),
      modeColor: next ? '#5f8f6e' : '#7a7470',
      modeLight: next ? '#f0f7f2' : '#f4f1ec',
    }])
  }

  // ── TTS playback ──────────────────────────────────────────────────
  // Chooses voice profile based on current emotional severity
  async function speakReply(text, severity) {
    if (!voiceModeRef.current) return
    const profile = voiceForMood(severity ?? currentSeverity.current ?? null)
    const clean   = cleanForTTS(text, 480)
    setIsSpeakingTTS(true)
    try {
      await speakText(clean, profile, { volume: 0.92, playbackRate: 0.88 })
    } catch (err) {
      console.warn('[Voice] TTS failed, continuing in text mode:', err.message)
      // Text is already shown — graceful fallback, no user-visible error
    } finally {
      setIsSpeakingTTS(false)
    }
  }

  // ── Mic button handler ────────────────────────────────────────────
  function handleMicPress() {
    if (isListening) {
      stopListening()
      setIsListening(false)
      setInterimText('')
      return
    }
    stopSpeaking()
    setIsSpeakingTTS(false)
    setInterimText('')
    startListening({
      onStart:   () => setIsListening(true),
      onEnd:     () => { setIsListening(false); setInterimText('') },
      onInterim: (t) => setInterimText(t),
      onResult:  (transcript) => {
        setInterimText('')
        setIsListening(false)
        if (transcript.trim()) sendMessage(transcript.trim())
      },
      onError: (msg) => {
        setIsListening(false)
        setInterimText('')
        setMessages(prev => [...prev, {
          role: 'system-notice',
          text: `🎙️ ${msg}`,
          time: now(),
          modeColor: '#c46b6b',
          modeLight: '#fff5f5',
        }])
      },
    })
  }

  // ── Personality mode change ───────────────────────────────────────
  function handleModeChange(newModeId) {
    if (newModeId === modeId) return
    saveMode(newModeId)
    setModeId(newModeId)
    const newMode = PERSONALITY_MODES[newModeId]
    setMessages(prev => [...prev, {
      role: 'system-notice',
      text: `${newMode.emoji} Switched to ${newMode.label} mode — ${newMode.tagline}`,
      time: now(),
      modeColor: newMode.color,
      modeLight: newMode.colorLight,
    }])
  }

  // ════════════════════════════════════════════════════════════════
  //  sendMessage — Features 1 + 2 + 4 + 5 + 6 (voice)
  // ════════════════════════════════════════════════════════════════
  async function sendMessage(text) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    // Stop any TTS playing before user sends new message
    stopSpeaking()
    setIsSpeakingTTS(false)

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    setMessages(prev => [...prev, { role: 'user', text: msg, time: now() }])
    setLoading(true)

    // Feature 1: Sentiment
    const { triggered, severity, supportText } = analyseMessage(msg, recentUserMsgs.current)
    recentUserMsgs.current = [...recentUserMsgs.current, msg].slice(-3)
    currentSeverity.current = severity  // store for voice profile selection

    // Feature 5: Distortions
    const distortionResult = detectDistortions(msg)
    const distortionContext = distortionResult.detected ? buildDistortionContext(distortionResult.distortions) : ''

    // Feature 2: Recall hint
    let recallHint = null
    if (triggered && !recallShownRef.current && memoriesRef.current.length) {
      recallHint = getRecallHint(memoriesRef.current, severity)
      if (recallHint) recallShownRef.current = true
    }

    await new Promise(r => setTimeout(r, 280))

    // Support bubble (Feature 1)
    if (triggered && supportText) {
      setMessages(prev => [...prev, {
        role: 'ai', text: supportText, time: now(), isSupportMsg: true, severity,
      }])
      // Speak support message in voice mode (soft/calm voice for distress)
      if (voiceModeRef.current) await speakReply(supportText, severity)
      await new Promise(r => setTimeout(r, 180))
    }

    // Recall hint bubble (Feature 2)
    if (recallHint) {
      await new Promise(r => setTimeout(r, 240))
      setMessages(prev => [...prev, { role: 'ai', text: recallHint, time: now(), isMemoryHint: true }])
      await new Promise(r => setTimeout(r, 200))
    }

    // Distortion reframe bubble (Feature 5)
    if (distortionResult.detected && distortionResult.reframeText) {
      await new Promise(r => setTimeout(r, 260))
      const primary = distortionResult.distortions[0]
      setMessages(prev => [...prev, {
        role: 'ai', text: distortionResult.reframeText, time: now(),
        isDistortionFrame: true,
        distortions: distortionResult.distortions,
        distortionColor: primary.color,
        distortionLight: primary.colorLight,
      }])
      await new Promise(r => setTimeout(r, 220))
    }

    // Build history with updated system prompt (includes voice mode flag + distortions)
    const currentMode = modeIdRef.current
    const freshSys    = makeSystemMsg(profile, memoryCtxRef.current, currentMode, distortionContext, voiceModeRef.current)
    const historyWithMode = [freshSys, ...history.slice(1), { role: 'user', content: msg }]

    try {
      const reply = await aiChat(historyWithMode)

      setMessages(prev => [...prev, { role: 'ai', text: reply, time: now(), modeId: currentMode }])
      setHistory([...historyWithMode, { role: 'assistant', content: reply }])

      // ── Feature 6: Speak the AI reply ─────────────────────────────
      // Uses emotion-based voice profile. Fire-and-forget (text shown regardless).
      if (voiceModeRef.current) speakReply(reply, severity)

      // Feature 2: Save memory
      const solution = detectSolution(msg + ' ' + reply)
      const newEntry = await saveMemory(supabase, userIdRef.current, {
        message: msg, severity: severity ?? 'none', solution, aiReply: reply,
      })
      memoriesRef.current = [newEntry, ...memoriesRef.current].slice(0, 20)

      // Persist chat
      supabase.auth.getUser().then(({ data }) => {
        if (!data?.user) return
        const rows = [
          { user_id: data.user.id, role: 'user',      message: msg   },
          { user_id: data.user.id, role: 'assistant', message: reply },
        ]
        if (triggered && supportText) {
          rows.splice(1, 0, { user_id: data.user.id, role: 'assistant', message: supportText })
        }
        supabase.from('chat_history').insert(rows)
      })

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `I'm having a moment — please try again in a second. 🌤️\n\n(${err.message})`,
        time: now(),
      }])
    }

    setLoading(false)
    if (!voiceModeRef.current) inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }
  function autoResize(e) {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'
  }

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const currentModeObj = PERSONALITY_MODES[modeId]

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <h2>{greet}, {profile?.display_name} 👋</h2>
        <div className={styles.headerRight}>
          <PersonalityToggle currentMode={modeId} onChange={handleModeChange} disabled={loading} />
          <div className={styles.status}><span className={styles.dot} />Online</div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {messages.map((m, i) => {
          if (m.role === 'system-notice') {
            return (
              <div key={i} className={styles.systemNotice} style={{ background: m.modeLight, borderColor: m.modeColor + '44' }}>
                <span style={{ color: m.modeColor }}>{m.text}</span>
              </div>
            )
          }

          const msgMode    = m.modeId ? PERSONALITY_MODES[m.modeId] : null
          const avatarEmoji = m.isMemoryHint ? '💡' : m.isDistortionFrame ? '🔎' : msgMode?.avatarEmoji ?? '🌤️'

          return (
            <div
              key={i}
              className={[
                styles.msg,
                m.role === 'user' ? styles.user : styles.ai,
                m.isSupportMsg      ? styles.supportMsg      : '',
                m.isMemoryHint      ? styles.memoryHint       : '',
                m.isDistortionFrame ? styles.distortionFrame  : '',
              ].join(' ')}
            >
              <div
                className={styles.msgAvatar}
                style={m.isDistortionFrame ? {
                  background: `linear-gradient(135deg, ${m.distortionLight ?? '#f0f4f8'}, ${m.distortionColor ?? '#888'}33)`,
                } : msgMode && m.role === 'ai' ? {
                  background: `linear-gradient(135deg, ${msgMode.colorLight}, ${msgMode.colorBorder})`,
                } : {}}
              >
                {m.role === 'ai'
                  ? avatarEmoji
                  : profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : '🙂'}
              </div>

              <div className={styles.msgInner}>
                {m.isSupportMsg && m.severity && (
                  <div className={`${styles.severityBadge} ${styles[`badge_${m.severity}`]}`}>
                    {m.severity === 'crisis' && '🆘 Crisis support'}
                    {m.severity === 'high'   && '💛 I notice you'}
                    {m.severity === 'moderate' && '🌿 I\'m with you'}
                    {m.severity === 'low'    && '🌤️ Checking in'}
                  </div>
                )}
                {m.isMemoryHint && (
                  <div className={`${styles.severityBadge} ${styles.badge_memory}`}>🧠 From your history</div>
                )}
                {m.isDistortionFrame && m.distortions?.length > 0 && (
                  <div className={styles.distortionBadges}>
                    {m.distortions.map(d => (
                      <span key={d.id} className={styles.distortionBadge}
                        style={{ background: d.colorLight, color: d.color, borderColor: d.color + '55' }}>
                        {d.emoji} {d.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className={[
                  styles.bubble,
                  m.isSupportMsg      ? styles.supportBubble    : '',
                  m.isMemoryHint      ? styles.memoryBubble     : '',
                  m.isDistortionFrame ? styles.distortionBubble : '',
                ].join(' ')} style={m.isDistortionFrame ? {
                  borderColor: m.distortionColor + '55',
                  background: `linear-gradient(135deg, ${m.distortionLight}, ${m.distortionLight}cc)`,
                } : {}}>
                  {m.text.split('\n').map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                </div>
                <div className={styles.msgTime}>{m.time}</div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className={`${styles.msg} ${styles.ai}`}>
            <div className={styles.msgAvatar}
              style={{ background: `linear-gradient(135deg, ${currentModeObj.colorLight}, ${currentModeObj.colorBorder})` }}>
              {currentModeObj.avatarEmoji}
            </div>
            <div className={styles.typing}><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className={styles.inputArea}>
        {/* Voice toggle + mic UI */}
        <div className={styles.voiceRow}>
          <VoiceToggle
            voiceMode={voiceMode}
            onToggle={handleVoiceToggle}
            isListening={isListening}
            isSpeaking={isSpeakingTTS}
            interimText={interimText}
            onMicPress={handleMicPress}
            disabled={loading}
            supported={srSupported}
          />
        </div>

        {/* Text input (hidden in voice mode, still functional for fallback) */}
        {!voiceMode && (
          <>
            <div className={styles.quickActions}>
              {QUICK.map(q => (
                <button key={q.label} className={styles.quickBtn} onClick={() => sendMessage(q.text)}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className={styles.inputRow}>
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onInput={autoResize}
                placeholder={
                  modeId === 'coach'    ? 'What are you going to do about it?'
                  : modeId === 'analyst' ? 'Describe the situation objectively…'
                  : 'How are you feeling right now…'
                }
                rows={1}
              />
              <button
                className={styles.sendBtn}
                style={{ background: `linear-gradient(135deg, ${currentModeObj.color}, ${currentModeObj.color}cc)` }}
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >➤</button>
            </div>
          </>
        )}

        {/* Voice mode: show quick actions as tap buttons */}
        {voiceMode && !isListening && !isSpeakingTTS && (
          <div className={styles.quickActions} style={{ justifyContent: 'center' }}>
            {QUICK.map(q => (
              <button key={q.label} className={styles.quickBtn} onClick={() => sendMessage(q.text)}>
                {q.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
