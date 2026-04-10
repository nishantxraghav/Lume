/**
 * ══════════════════════════════════════════════════════
 *  LUME — Pre-Breakdown Detection Middleware
 *  sentimentGuard.js
 *
 *  Analyses every incoming user message BEFORE the main
 *  AI reply is generated. If a negative / distress pattern
 *  is detected it returns a short, warm supportive message
 *  that is shown immediately — giving the user an instant
 *  human-feeling acknowledgement while the full AI reply
 *  is being fetched in the background.
 *
 *  Flow inside ChatPage.sendMessage():
 *    1. User sends message
 *    2. analyseMessage(msg) → { triggered, supportText, severity }
 *    3. If triggered → show supportText bubble instantly (no loading delay)
 *    4. Fetch normal AI reply (already in progress)
 *    5. Append normal AI reply as second bubble
 *
 *  This module is PURELY frontend — no extra API calls.
 *  Detection is keyword + pattern based (fast, zero latency).
 * ══════════════════════════════════════════════════════
 */

// ── Severity levels ────────────────────────────────────
//   'crisis'   → self-harm / suicidal signals
//   'high'     → emotional breakdown / despair
//   'moderate' → sadness / anxiety / burnout
//   'low'      → mild negativity / stress

const PATTERNS = [
  // ── CRISIS (always triggers, regardless of other rules) ──
  {
    severity: 'crisis',
    keywords: [
      'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
      'not worth living', 'no reason to live', 'better off dead',
      'hurt myself', 'self harm', 'cutting myself', 'overdose',
      'don\'t want to be here anymore', 'wish i was dead',
    ],
    responses: [
      "I hear you, and I'm really glad you're talking to me right now. What you're feeling matters deeply — please know you're not alone in this. I'd gently encourage you to reach out to the Crisis Resources section (in the left menu) where trained people are ready to support you right now. 💙",
      "Thank you for trusting me with this. What you're going through sounds incredibly painful, and you deserve real support. Please take a look at the Crisis Resources in the sidebar — there are people available right now who truly want to help. I'm here with you. 💙",
    ],
  },

  // ── HIGH ────────────────────────────────────────────
  {
    severity: 'high',
    keywords: [
      'can\'t take it anymore', 'breaking down', 'falling apart',
      'I give up', 'given up', 'hopeless', 'worthless', 'nobody cares',
      'no one cares', 'completely alone', 'utterly alone', 'all alone',
      'hate myself', 'hate my life', 'life is pointless', 'meaningless',
      'nothing matters', 'feel empty', 'feeling empty', 'numb inside',
      'so much pain', 'unbearable', 'can\'t cope', 'can\'t handle',
      'tired of fighting', 'exhausted from trying', 'lost all hope',
      'everything is falling apart', 'feel like a burden',
      'no one would miss me', 'disappear',
    ],
    responses: [
      "I can feel the weight in your words, and I want you to know — I'm right here with you. You don't have to carry this alone. 💛",
      "That sounds really, really hard. I'm so glad you're sharing this with me. Take a breath — I'm not going anywhere. 💛",
      "What you're feeling is valid, and it takes courage to say it. I'm here, fully present with you. 💛",
    ],
  },

  // ── MODERATE ────────────────────────────────────────
  {
    severity: 'moderate',
    keywords: [
      // Exhaustion / burnout
      'tired of everything', 'so exhausted', 'drained', 'burned out',
      'burnt out', 'worn out', 'running on empty',
      // Sadness / crying
      'feel like crying', 'been crying', 'crying all day', 'so sad',
      'deeply sad', 'overwhelmed', 'feel overwhelmed',
      // Anxiety / panic
      'panic attack', 'having a panic', 'anxiety attack', 'can\'t breathe',
      'heart racing', 'constantly anxious', 'so anxious', 'very anxious',
      // Low / depressed
      'feeling low', 'really low', 'feeling down', 'really down',
      'depressed', 'feel depressed', 'feeling depressed', 'feel numb',
      'feeling numb', 'emotionally numb', 'feel disconnected',
      // Stress
      'so stressed', 'extremely stressed', 'under so much pressure',
      'can\'t sleep', 'not sleeping', 'insomnia', 'nightmares',
      // Loneliness
      'so lonely', 'very lonely', 'feel lonely', 'feeling isolated',
      'no one understands', 'nobody understands',
    ],
    responses: [
      "You seem to be carrying a lot right now. I'm here with you — let's take this one moment at a time. 🌿",
      "I notice things feel heavy for you today. That's okay — you don't have to figure it all out right now. I'm listening. 🌿",
      "It sounds like you're going through a tough stretch. I'm glad you reached out. Take a breath — I'm right here. 🌿",
      "That sounds really draining. I want you to know you're seen and heard. 🌿",
    ],
  },

  // ── LOW ─────────────────────────────────────────────
  {
    severity: 'low',
    keywords: [
      'not great', 'not doing well', 'not okay', 'feeling off',
      'bit sad', 'kind of sad', 'a little sad', 'kind of down',
      'a little down', 'bit anxious', 'slightly anxious',
      'nervous', 'worried', 'stressed out', 'bit stressed',
      'tired today', 'feeling tired', 'a bit low',
      'hard day', 'rough day', 'bad day', 'not my day',
      'feeling meh', 'bit overwhelmed', 'struggling a bit',
      'overthinking', 'can\'t stop thinking',
    ],
    responses: [
      "It sounds like today's been a bit tough. I'm here — tell me more about what's going on. 🌤️",
      "I'm picking up that things feel a little off for you right now. I'm here and I'm listening. 🌤️",
      "Even small struggles deserve acknowledgement. I'm glad you're talking to me. 🌤️",
    ],
  },
]

/**
 * Normalise text: lowercase, collapse whitespace, strip punctuation edges.
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return text.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ').trim()
}

/**
 * Check whether a keyword (phrase) appears in the normalised message.
 * Uses word-boundary-aware matching so "pain" doesn't match "Spain".
 * @param {string} normMsg
 * @param {string} keyword
 * @returns {boolean}
 */
function matchesKeyword(normMsg, keyword) {
  // For multi-word phrases, simple includes is fine (boundaries implicit)
  if (keyword.includes(' ')) return normMsg.includes(keyword)
  // Single word — wrap in word boundaries via regex
  const re = new RegExp(`(?<![a-z])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`)
  return re.test(normMsg)
}

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Analyse a user message for pre-breakdown signals.
 *
 * @param {string} message  — raw user input
 * @param {string[]} recentMessages — last 2-3 user messages for pattern continuity
 * @returns {{
 *   triggered: boolean,
 *   severity: 'crisis'|'high'|'moderate'|'low'|null,
 *   supportText: string|null
 * }}
 */
export function analyseMessage(message, recentMessages = []) {
  const norm = normalise(message)

  // Also check rolling context (last 2 user messages) for sustained distress
  const contextNorm = recentMessages.slice(-2).map(normalise).join(' ')

  for (const pattern of PATTERNS) {
    const hitInCurrent = pattern.keywords.some(kw => matchesKeyword(norm, kw))
    // For LOW severity, also check if context compounds it
    const hitInContext =
      pattern.severity === 'moderate' &&
      pattern.keywords.some(kw => matchesKeyword(contextNorm, kw))

    if (hitInCurrent || hitInContext) {
      return {
        triggered:   true,
        severity:    pattern.severity,
        supportText: pick(pattern.responses),
      }
    }
  }

  return { triggered: false, severity: null, supportText: null }
}

/**
 * Returns true if the severity warrants appending a crisis resource nudge
 * to the normal AI reply (not the support message — the main reply).
 * @param {'crisis'|'high'|'moderate'|'low'|null} severity
 * @returns {boolean}
 */
export function isCrisisLevel(severity) {
  return severity === 'crisis'
}
