/**
 * ══════════════════════════════════════════════════════════════════
 *  LUME — Emotional Memory System
 *  src/lib/emotionalMemory.js
 *
 *  Storage layer: Supabase `emotional_memory` table (cloud, per-user)
 *  Fallback:      localStorage JSON (offline / before auth loads)
 *
 *  What gets stored per interaction:
 *    - timestamp
 *    - mood label + emoji (from pre-breakdown detection severity)
 *    - raw user message snippet (first 120 chars)
 *    - detected solution used (music / breathing / cbt / journaling / crisis / chat)
 *    - outcome rating (null until user rates — future feature hook)
 *
 *  Public API:
 *    saveMemory(supabase, userId, data)   → saves to DB + local cache
 *    getMemory(supabase, userId)          → returns last 20 entries (newest first)
 *    detectSolution(message)              → infers which tool was used from message text
 *    buildMemoryContext(memories)         → formats memories into a system prompt snippet
 *    getLastEffectiveSolution(memories)   → returns the most recently used solution label
 *    getRecallHint(memories, currentMood) → returns a "Last time this helped" string or null
 * ══════════════════════════════════════════════════════════════════
 */

// ── Solution detection map ────────────────────────────────────────
// Keys = solution IDs, values = keyword sets that suggest the solution was used

const SOLUTION_PATTERNS = {
  breathing: {
    label:   'breathing exercise',
    emoji:   '🌬️',
    section: 'CBT Exercises',
    keywords: [
      'breath', 'breathing', '4-7-8', 'breathe', 'inhale', 'exhale',
      'box breathing', 'deep breath', 'calm down', 'breathing exercise',
    ],
  },
  music: {
    label:   'calming music',
    emoji:   '🎵',
    section: 'Music & Sounds',
    keywords: [
      'music', 'sound', 'rain', 'ocean', 'fireplace', 'nature sounds',
      'ambient', 'playlist', 'listen', 'track', 'song', 'audio',
      'white noise', 'birds', 'crickets', 'piano',
    ],
  },
  cbt: {
    label:   'thought challenge',
    emoji:   '🧠',
    section: 'CBT Exercises',
    keywords: [
      'thought', 'thinking', 'cbt', 'cognitive', 'reframe', 'challenge',
      'distortion', 'evidence', 'rational', 'negative thought',
      'thought record', 'self-compassion', 'grounding', '5-4-3-2-1',
      'body scan', 'worry time', 'mindfulness',
    ],
  },
  journaling: {
    label:   'mood journaling',
    emoji:   '📓',
    section: 'Mood Journal',
    keywords: [
      'journal', 'write', 'wrote', 'note', 'log', 'diary',
      'mood log', 'track', 'record', 'check-in', 'mood check',
    ],
  },
  crisis: {
    label:   'crisis support',
    emoji:   '🆘',
    section: 'Crisis Resources',
    keywords: [
      'helpline', 'crisis', 'hotline', 'emergency', 'call', 'icall',
      'vandrevala', 'snehi', 'nimhans', 'professional help', 'therapist',
    ],
  },
  chat: {
    label:   'talking it through',
    emoji:   '💬',
    section: null,
    keywords: [], // default fallback — any message that doesn't match above
  },
}

/**
 * Detect which solution/tool a message is related to.
 * Returns the solution object { id, label, emoji, section }.
 * Falls back to 'chat' if no specific solution is found.
 *
 * @param {string} message
 * @returns {{ id:string, label:string, emoji:string, section:string|null }}
 */
export function detectSolution(message) {
  const norm = message.toLowerCase()

  for (const [id, sol] of Object.entries(SOLUTION_PATTERNS)) {
    if (id === 'chat') continue // skip fallback in loop
    if (sol.keywords.some(kw => norm.includes(kw))) {
      return { id, ...sol }
    }
  }

  return { id: 'chat', ...SOLUTION_PATTERNS.chat }
}

// ── Mood label helper ─────────────────────────────────────────────
const SEVERITY_MOOD = {
  crisis:   { label: 'in crisis',   emoji: '🆘' },
  high:     { label: 'very low',    emoji: '😔' },
  moderate: { label: 'anxious',     emoji: '😰' },
  low:      { label: 'a bit down',  emoji: '🌧️' },
  none:     { label: 'neutral',     emoji: '😐' },
}

export function moodFromSeverity(severity) {
  return SEVERITY_MOOD[severity] ?? SEVERITY_MOOD.none
}

// ── LOCAL CACHE (localStorage) ───────────────────────────────────
const LS_KEY = 'lume_emotional_memory'
const MAX_LOCAL = 50

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeLocal(entries) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL)))
  } catch { /* quota exceeded — ignore */ }
}

// ── SAVE MEMORY ──────────────────────────────────────────────────
/**
 * Persist one emotional memory entry.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string|null} userId
 * @param {{
 *   message:   string,          raw user message
 *   severity:  string|null,     from sentimentGuard
 *   solution:  object|null,     from detectSolution() — pass null to auto-detect
 *   aiReply:   string,          what Lume replied
 * }} data
 * @returns {Promise<object>}   saved entry
 */
export async function saveMemory(sb, userId, { message, severity, solution, aiReply }) {
  const sol     = solution ?? detectSolution(message)
  const mood    = moodFromSeverity(severity ?? 'none')
  const snippet = message.slice(0, 120)

  const entry = {
    timestamp:     new Date().toISOString(),
    mood_label:    mood.label,
    mood_emoji:    mood.emoji,
    severity:      severity ?? 'none',
    solution_id:   sol.id,
    solution_label: sol.label,
    solution_emoji: sol.emoji,
    solution_section: sol.section,
    message_snippet: snippet,
    ai_reply_snippet: aiReply.slice(0, 120),
    outcome_rating:  null,   // reserved for future "Did this help?" thumbs
  }

  // ── Local cache (always, instant) ──
  const local = readLocal()
  writeLocal([entry, ...local])

  // ── Supabase (if authenticated) ──
  if (userId) {
    await sb.from('emotional_memory').insert({
      user_id: userId,
      ...entry,
    }).then(({ error }) => {
      if (error) console.warn('[EmotionalMemory] Supabase insert failed:', error.message)
    })
  }

  return entry
}

// ── GET MEMORY ───────────────────────────────────────────────────
/**
 * Retrieve the last N emotional memory entries for the user.
 * Tries Supabase first (authoritative), falls back to localStorage.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string|null} userId
 * @param {number} limit
 * @returns {Promise<object[]>}  array of entries, newest first
 */
export async function getMemory(sb, userId, limit = 20) {
  if (userId) {
    const { data, error } = await sb
      .from('emotional_memory')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (!error && data?.length) {
      // Sync to local cache so offline works too
      writeLocal(data)
      return data
    }
  }

  // Fallback: localStorage
  return readLocal().slice(0, limit)
}

// ── ANALYSIS HELPERS ─────────────────────────────────────────────

/**
 * Returns the last solution that was used when the user felt a specific
 * mood/severity (e.g. "the last time they were anxious, they used breathing").
 *
 * @param {object[]} memories
 * @param {string}   severity  — 'moderate' | 'high' | 'low' | 'crisis'
 * @returns {{ label:string, emoji:string, section:string|null } | null}
 */
export function getLastEffectiveSolution(memories, severity) {
  if (!memories?.length) return null

  // Find most recent entry matching this severity where solution !== 'chat'
  const match = memories.find(
    m => m.severity === severity && m.solution_id !== 'chat'
  )

  if (!match) return null

  return {
    label:   match.solution_label,
    emoji:   match.solution_emoji,
    section: match.solution_section,
    daysAgo: daysSince(match.timestamp),
  }
}

/**
 * Builds a short, human-readable recall hint like:
 * "Last time you felt this way, breathing exercise seemed to help. 🌬️"
 *
 * Returns null if no relevant memory exists (so the chatbot stays silent).
 *
 * @param {object[]} memories
 * @param {string}   severity
 * @returns {string|null}
 */
export function getRecallHint(memories, severity) {
  if (!memories?.length || !severity || severity === 'none') return null

  const sol = getLastEffectiveSolution(memories, severity)
  if (!sol) return null

  const when = sol.daysAgo === 0
    ? 'earlier today'
    : sol.daysAgo === 1
    ? 'yesterday'
    : `${sol.daysAgo} days ago`

  const templates = [
    `💡 Last time you felt this way (${when}), ${sol.emoji} ${sol.label} seemed to help. Would you like to try that again?`,
    `💡 Something that helped you ${when}: ${sol.emoji} ${sol.label}. Want to give it another go?`,
    `💡 I remember ${when} you found ${sol.emoji} ${sol.label} useful when you felt similar. Shall we try that?`,
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * Build a concise memory context block to inject into the AI system prompt.
 * This gives the AI awareness of the user's emotional history without
 * overwhelming the context window.
 *
 * @param {object[]} memories  — last N entries from getMemory()
 * @returns {string}
 */
export function buildMemoryContext(memories) {
  if (!memories?.length) return ''

  // Last 5 entries only — keep prompt lean
  const recent = memories.slice(0, 5)

  const lines = recent.map(m => {
    const date = new Date(m.timestamp).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    return `- ${date}: felt ${m.mood_emoji} ${m.mood_label} → used ${m.solution_emoji} ${m.solution_label}`
  })

  return `\n\nUser's recent emotional history (use this to personalise your responses — mention past solutions when relevant, but only once per conversation and only if it feels natural):\n${lines.join('\n')}`
}

// ── Utils ─────────────────────────────────────────────────────────
function daysSince(isoTimestamp) {
  const then = new Date(isoTimestamp)
  const now  = new Date()
  return Math.floor((now - then) / 86_400_000)
}
