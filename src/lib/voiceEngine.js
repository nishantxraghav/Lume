/**
 * ══════════════════════════════════════════════════════════════════
 *  LUME — Voice Engine (ElevenLabs TTS + Web Speech API STT)
 *  src/lib/voiceEngine.js
 *
 *  Handles all voice I/O for Voice Therapy Mode:
 *    - Text → Speech via ElevenLabs API
 *    - Speech → Text via Web Speech API (no API cost)
 *    - Emotion-based voice selection (calm / soft / standard)
 *    - In-memory audio cache to avoid re-fetching repeated phrases
 *    - Pre-baked breathing instructions (no API call at runtime)
 *    - Graceful fallback — text is always shown even if TTS fails
 *
 *  API Key: stored only in this file (client-side).
 *  For production → move to backend proxy or env variable.
 * ══════════════════════════════════════════════════════════════════
 */

// ── ElevenLabs Config ─────────────────────────────────────────────
const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY'  // ← Replace with your key
const ELEVENLABS_URL     = 'https://api.elevenlabs.io/v1/text-to-speech'

/**
 * Voice IDs for different emotional tones.
 * Replace these with your preferred ElevenLabs voices.
 * Find IDs at: https://elevenlabs.io/voice-library
 *
 * Recommended free voices:
 *   Rachel  → 21m00Tcm4TlvDq8ikWAM  (calm, warm)
 *   Elli    → MF3mGyEYCl7XYWbV9V6O  (soft, gentle)
 *   Adam    → pNInz6obpgDQGcFmaJgB  (clear, steady)
 *   Bella   → EXAVITQu4vr4xnSDxMaL  (soothing)
 */
export const VOICE_PROFILES = {
  calm: {
    voiceId:  '21m00Tcm4TlvDq8ikWAM',  // Rachel — warm, unhurried
    label:    'Calm',
    settings: { stability: 0.80, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
  },
  soft: {
    voiceId:  'EXAVITQu4vr4xnSDxMaL',  // Bella — soft, supportive
    label:    'Soft',
    settings: { stability: 0.85, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
  },
  steady: {
    voiceId:  'pNInz6obpgDQGcFmaJgB',  // Adam — clear, grounded
    label:    'Steady',
    settings: { stability: 0.75, similarity_boost: 0.70, style: 0.20, use_speaker_boost: true },
  },
}

/**
 * Map mood/severity → voice profile.
 * anxious → calm voice (slow, reassuring)
 * low/high → soft voice (gentle, warm)
 * default → steady
 */
export function voiceForMood(severity) {
  if (severity === 'moderate' || severity === 'low') return 'calm'  // anxious → calm
  if (severity === 'high' || severity === 'crisis')  return 'soft'  // low/crisis → soft
  return 'steady'                                                    // default
}

// ── In-memory audio cache ─────────────────────────────────────────
// key: `${voiceId}::${text}` → Blob URL string
const audioCache = new Map()

// Track current playback so we can stop it on demand
let currentAudio = null

/**
 * Convert text to speech via ElevenLabs and return a playable Blob URL.
 * Caches results so identical text+voice never hits the API twice.
 *
 * @param {string} text
 * @param {string} profileKey — key in VOICE_PROFILES
 * @returns {Promise<string>} Blob URL
 */
export async function textToSpeechUrl(text, profileKey = 'steady') {
  const profile  = VOICE_PROFILES[profileKey] ?? VOICE_PROFILES.steady
  const cacheKey = `${profile.voiceId}::${text.slice(0, 200)}`

  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)

  const res = await fetch(`${ELEVENLABS_URL}/${profile.voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2',  // lowest latency model
      voice_settings: profile.settings,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`ElevenLabs TTS failed: ${res.status} — ${err}`)
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  audioCache.set(cacheKey, url)
  return url
}

/**
 * Play text as speech. Returns a promise that resolves when playback ends.
 * Automatically stops any currently playing audio first.
 *
 * @param {string} text
 * @param {string} profileKey
 * @param {object} opts
 * @param {number} opts.volume       — 0–1
 * @param {number} opts.playbackRate — 0.5–2.0 (0.85 = slightly slow = calmer)
 * @returns {Promise<void>}
 */
export async function speakText(text, profileKey = 'steady', opts = {}) {
  stopSpeaking() // stop any current playback

  const url   = await textToSpeechUrl(text, profileKey)
  const audio = new Audio(url)
  audio.volume      = opts.volume      ?? 0.90
  audio.playbackRate = opts.playbackRate ?? 0.90  // slightly slower = calmer

  currentAudio = audio

  return new Promise((resolve, reject) => {
    audio.onended  = () => { currentAudio = null; resolve() }
    audio.onerror  = (e) => { currentAudio = null; reject(e) }
    audio.play().catch(reject)
  })
}

/**
 * Stop any currently playing TTS audio immediately.
 */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * Check if TTS is currently playing.
 * @returns {boolean}
 */
export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused
}

// ── Pre-baked breathing audio ─────────────────────────────────────
// These are the exact phrases used in the breathing exercise.
// We pre-generate them once at first use and cache them permanently.
// No API call after the first time per session.

export const BREATHING_PHRASES = {
  inhale: 'Breathe in slowly… through your nose…',
  hold:   'Hold gently… stay still…',
  exhale: 'Breathe out slowly… through your mouth…',
  ready:  'Find a comfortable position. We will begin in a moment.',
  done:   'Beautiful. You did wonderfully. Take a moment to notice how you feel.',
}

/**
 * Warm up the breathing phrase cache — call this when the user
 * enters the breathing screen, before they hit Start.
 * Fires-and-forgets (no await needed).
 *
 * @param {string} profileKey
 */
export function prewarmBreathingAudio(profileKey = 'calm') {
  for (const phrase of Object.values(BREATHING_PHRASES)) {
    textToSpeechUrl(phrase, profileKey).catch(() => {})  // silent fail — text always shown
  }
}

/**
 * Speak a breathing phase instruction.
 * Uses the calm voice profile and slightly slower playback rate.
 *
 * @param {'inhale'|'hold'|'exhale'|'ready'|'done'} phase
 * @returns {Promise<void>}
 */
export async function speakBreathPhase(phase) {
  const text = BREATHING_PHRASES[phase]
  if (!text) return
  await speakText(text, 'calm', { volume: 0.85, playbackRate: 0.80 })
}

// ── Web Speech API (Speech → Text) ───────────────────────────────
let recognitionInstance = null

/**
 * Check if the browser supports speech recognition.
 * @returns {boolean}
 */
export function speechRecognitionSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

/**
 * Start listening for speech input.
 * Returns a cleanup function to stop listening.
 *
 * @param {object} callbacks
 * @param {function(string)} callbacks.onResult     — called with final transcript
 * @param {function(string)} callbacks.onInterim    — called with interim transcript
 * @param {function(string)} callbacks.onError      — called with error message
 * @param {function}         callbacks.onStart      — called when listening starts
 * @param {function}         callbacks.onEnd        — called when listening stops
 * @returns {function} stopFn — call to stop recognition
 */
export function startListening({ onResult, onInterim, onError, onStart, onEnd }) {
  if (!speechRecognitionSupported()) {
    onError?.('Speech recognition is not supported in this browser. Try Chrome.')
    return () => {}
  }

  stopListening() // stop any existing instance

  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
  const recognition = new SR()

  recognition.continuous     = false   // single utterance mode
  recognition.interimResults = true    // show partial results
  recognition.lang           = 'en-US'
  recognition.maxAlternatives = 1

  recognition.onstart  = () => onStart?.()
  recognition.onend    = () => { recognitionInstance = null; onEnd?.() }

  recognition.onresult = (event) => {
    let interim = ''
    let final   = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) final += transcript
      else interim += transcript
    }

    if (interim) onInterim?.(interim)
    if (final)   onResult?.(final.trim())
  }

  recognition.onerror = (event) => {
    const messages = {
      'no-speech':         'No speech detected. Tap the mic and try again.',
      'audio-capture':     'Microphone not found. Check your device settings.',
      'not-allowed':       'Microphone access denied. Please allow it in your browser.',
      'network':           'Network error during speech recognition.',
      'aborted':           'Listening stopped.',
    }
    onError?.(messages[event.error] ?? `Speech error: ${event.error}`)
  }

  recognitionInstance = recognition
  recognition.start()

  return () => stopListening()
}

/**
 * Stop any active speech recognition.
 */
export function stopListening() {
  if (recognitionInstance) {
    recognitionInstance.abort()
    recognitionInstance = null
  }
}

// ── Utility: strip markdown for cleaner TTS ───────────────────────
/**
 * Clean text before sending to TTS:
 *   - Strip markdown symbols
 *   - Expand common abbreviations
 *   - Limit length to avoid long API calls
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
export function cleanForTTS(text, maxChars = 500) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')     // bold
    .replace(/\*(.*?)\*/g, '$1')          // italic
    .replace(/`(.*?)`/g, '$1')           // code
    .replace(/#{1,6}\s/g, '')            // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
    .replace(/\n{3,}/g, '\n\n')          // collapse excess newlines
    .replace(/\s{2,}/g, ' ')             // collapse spaces
    .trim()
    .slice(0, maxChars)                  // hard cap — avoids huge API calls
}
