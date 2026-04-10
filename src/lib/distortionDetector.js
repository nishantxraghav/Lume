/**
 * ══════════════════════════════════════════════════════════════════
 *  LUME — Cognitive Distortion Detector
 *  src/lib/distortionDetector.js
 *
 *  Detects 10 classic CBT cognitive distortions in user messages
 *  and returns targeted reframing questions for each.
 *
 *  Based on Aaron Beck's cognitive distortions framework and
 *  David Burns' "Feeling Good" classification system.
 *
 *  Public API:
 *    detectDistortions(message)
 *      → { detected: bool, distortions: Distortion[], primaryReframe: string|null }
 *
 *    buildDistortionContext(distortions)
 *      → string to inject into the AI system prompt
 *
 *  Zero latency — pure keyword + regex matching, no API calls.
 * ══════════════════════════════════════════════════════════════════
 */

// ── Distortion definitions ────────────────────────────────────────
// Each entry has:
//   id         — machine key
//   name       — CBT label shown in UI badge
//   emoji      — visual identity
//   color      — badge colour
//   triggers   — array of {pattern: RegExp, weight: 1|2|3}
//   reframes   — array of reframing questions (one chosen randomly)
//   aiContext  — brief note injected into the AI prompt so it can respond intelligently

const DISTORTIONS = [

  // ── 1. ALL-OR-NOTHING THINKING (Black & White) ───────────────
  {
    id:    'allOrNothing',
    name:  'All-or-nothing thinking',
    emoji: '⚫⚪',
    color: '#6b7280',
    colorLight: '#f4f4f5',

    triggers: [
      { pattern: /\b(always|never|every\s*time|not\s*once|without\s*exception)\b/i, weight: 2 },
      { pattern: /\b(complete(ly)?|total(ly)?|absolute(ly)?|utter(ly)?)\s+(fail|useless|wrong|stupid|hopeless|disaster)/i, weight: 3 },
      { pattern: /\b(everyone|no\s*one|nobody|everybody)\s+(hates?|ignores?|leaves?|knows?)/i, weight: 2 },
      { pattern: /\b(either|nothing)\b.{0,30}\b(or|works?|matters?)\b/i, weight: 1 },
      { pattern: /i('m|\s+am)\s+(always|never)\s+the\s+one/i, weight: 2 },
      { pattern: /\b(ruined|destroyed|completely\s+broken|total\s+failure|utter\s+disaster)\b/i, weight: 2 },
      { pattern: /\bnot\s+a\s+single\b/i, weight: 1 },
      { pattern: /\b(all|none|every|no)\s+(my|their|his|her)\s+(fault|problem|doing|choice)/i, weight: 2 },
    ],

    reframes: [
      'Is it really always, or just this time? Can you think of even one exception?',
      'Where on a scale from 0 to 10 would you honestly put this — is it really a 0 or a 10?',
      'You used the word "always" — what would a more accurate word be right now?',
      'Is this truly all bad, or are there any parts that are okay, even small ones?',
      'What would you say to a friend who used "always" or "never" about themselves?',
    ],

    aiContext: 'The user is engaging in all-or-nothing thinking, using absolute language like "always", "never", "everyone", "total failure". Gently challenge the absoluteness while validating the underlying emotion. Ask them to consider the grey area.',
  },

  // ── 2. OVERGENERALISATION ────────────────────────────────────
  {
    id:    'overgeneralisation',
    name:  'Overgeneralisation',
    emoji: '🔁',
    color: '#7c6fcd',
    colorLight: '#f0eeff',

    triggers: [
      { pattern: /\b(this\s+always\s+happens|it('s|\s+is)\s+always\s+like\s+this|same\s+thing\s+every\s+time)\b/i, weight: 3 },
      { pattern: /\bnothing\s+(ever\s+)?(works|changes|gets\s+better|helps)\b/i, weight: 3 },
      { pattern: /\bthis\s+is\s+just\s+how\s+(i\s+am|things\s+are|it\s+always\s+is|life\s+is)\b/i, weight: 2 },
      { pattern: /\bi('m|\s+am)\s+(always|constantly|forever)\s+(making|doing|being)\b/i, weight: 2 },
      { pattern: /\beveryone\s+(always|always\s+ends\s+up|eventually)\b/i, weight: 2 },
      { pattern: /\b(pattern|story\s+of\s+my\s+life|never\s+changes|keeps\s+happening)\b/i, weight: 2 },
      { pattern: /\bno\s+matter\s+what\s+i\s+do\b/i, weight: 2 },
    ],

    reframes: [
      'Is this really a permanent pattern, or might this be one difficult moment?',
      'Has there been even one time when things turned out differently? What was different then?',
      'You said "nothing ever works" — can you name one thing, however small, that has worked before?',
      'What evidence do you have that this always happens, versus just feeling that way right now?',
      'If a friend said "nothing ever changes for me" — what would you ask them?',
    ],

    aiContext: 'The user is overgeneralising from one or a few events to a sweeping conclusion ("nothing works", "this always happens"). Help them test whether the pattern is truly universal, and find exceptions.',
  },

  // ── 3. MENTAL FILTER (Negative focus) ───────────────────────
  {
    id:    'mentalFilter',
    name:  'Mental filter',
    emoji: '🔬',
    color: '#c47a3a',
    colorLight: '#fdf4e8',

    triggers: [
      { pattern: /\b(only|just)\s+(one|the)\s+(bad|negative|wrong|worst|terrible|awful)\b/i, weight: 2 },
      { pattern: /\bcan'?t\s+(stop\s+)?(thinking|focusing|dwelling)\s+(about|on)\b/i, weight: 2 },
      { pattern: /\b(ruins?|spoils?|overshadows?)\s+(everything|it\s+all|the\s+whole|my\s+(whole|entire))\b/i, weight: 3 },
      { pattern: /\beven\s+(though|if).{0,40}(still|only\s+see|focus\s+on\s+the\s+bad)\b/i, weight: 2 },
      { pattern: /\bignoring\s+the\s+(good|positive|rest)\b/i, weight: 2 },
      { pattern: /\b(fixated?|obsessed?|stuck)\s+on\b/i, weight: 1 },
      { pattern: /\ball\s+i\s+can\s+(see|think\s+about|notice)\s+is\b/i, weight: 3 },
    ],

    reframes: [
      'What else happened in that situation that you might not be giving weight to?',
      'If you put on a wider lens — what parts of the picture are you not seeing right now?',
      'You mentioned one thing that went wrong — can you think of anything that went okay?',
      'Is there a possibility you\'re zooming into one detail and zooming out from the rest?',
    ],

    aiContext: 'The user seems to be focusing exclusively on one negative detail while filtering out positive or neutral aspects. Help them widen their lens with gentle questions.',
  },

  // ── 4. DISQUALIFYING THE POSITIVE ────────────────────────────
  {
    id:    'disqualifyPositive',
    name:  'Disqualifying the positive',
    emoji: '🚫',
    color: '#b05050',
    colorLight: '#fff2f2',

    triggers: [
      { pattern: /\b(but\s+)?(that\s+doesn'?t\s+(count|matter)|it\s+doesn'?t\s+mean\s+anything)\b/i, weight: 3 },
      { pattern: /\b(it\s+was\s+)?(just\s+)?(luck|accident|fluke|coincidence|one\s+time\s+thing)\b/i, weight: 2 },
      { pattern: /\banyone\s+(could('ve|\s+have)|can|would)\s+have\s+done\s+(that|it|the\s+same)\b/i, weight: 2 },
      { pattern: /\bthey'?re?\s+(just|only)\s+(being\s+)?(nice|polite|saying\s+that)\b/i, weight: 2 },
      { pattern: /\b(don'?t|can'?t)\s+(take|accept)\s+a\s+compliment\b/i, weight: 2 },
      { pattern: /\bit\s+(wasn'?t|isn'?t)\s+really\s+(that\s+)?(good|great|impressive|much)\b/i, weight: 2 },
    ],

    reframes: [
      'What if that compliment or achievement was genuine — what would that mean for you?',
      'Why does it have to be luck? What role did your effort or skill play?',
      'You\'re quick to dismiss that — what would it feel like to actually let it count?',
      'If a friend achieved what you just did and dismissed it the same way, what would you say?',
    ],

    aiContext: 'The user is dismissing positive experiences as flukes, luck, or "not counting". Help them examine why they\'re quick to discount good things, and what it would feel like to acknowledge them.',
  },

  // ── 5. MIND READING ──────────────────────────────────────────
  {
    id:    'mindReading',
    name:  'Mind reading',
    emoji: '🧿',
    color: '#5b7abf',
    colorLight: '#edf2ff',

    triggers: [
      { pattern: /\b(i\s+know|i\s+can\s+tell|i'?m\s+sure|obviously)\s+(they|he|she|everyone)\s+(think|hate|dislike|is\s+annoyed|doesn'?t\s+like|is\s+judging|is\s+disappointed)\b/i, weight: 3 },
      { pattern: /\bthey('re|\s+are)\s+(definitely|probably|clearly)\s+(mad|upset|annoyed|angry|disappointed)\s+at\s+me\b/i, weight: 3 },
      { pattern: /\b(must\s+think|must\s+hate|must\s+find)\s+(me|i'?m|i\s+am)\b/i, weight: 2 },
      { pattern: /\bhe\s+didn'?t\s+(reply|text|call).{0,40}(must\s+(mean|be)|probably|obviously)\b/i, weight: 2 },
      { pattern: /\b(i\s+know\s+exactly|i\s+can\s+tell\s+by)\b/i, weight: 2 },
      { pattern: /\b(they|everyone)\s+(are|is)\s+(judging|laughing|talking\s+about|making\s+fun\s+of)\s+me\b/i, weight: 3 },
      { pattern: /\bshe\s+hates?\s+me\b/i, weight: 3 },
    ],

    reframes: [
      'What actual evidence do you have for what they\'re thinking? Is there another explanation?',
      'Have you considered asking them directly, rather than guessing? What\'s the worst that could happen?',
      'If the roles were reversed and you didn\'t reply right away, what would YOUR reason be?',
      'Our minds often fill in the gaps with fears rather than facts — is there a more neutral explanation?',
    ],

    aiContext: 'The user is assuming they know what others are thinking, usually negatively, without evidence. Help them distinguish between their interpretation and what they actually know for certain.',
  },

  // ── 6. FORTUNE TELLING ───────────────────────────────────────
  {
    id:    'fortuneTelling',
    name:  'Fortune telling',
    emoji: '🔮',
    color: '#8b5cf6',
    colorLight: '#f3eeff',

    triggers: [
      { pattern: /\b(it('s|\s+is)\s+going\s+to|this\s+will)\s+(fail|go\s+wrong|be\s+a\s+disaster|not\s+work|end\s+badly)\b/i, weight: 3 },
      { pattern: /\bi('m|\s+am)\s+going\s+to\s+(fail|mess\s+up|embarrass|ruin|lose)\b/i, weight: 3 },
      { pattern: /\b(i\s+know|i\s+can\s+tell)\s+(it\s+won'?t|this\s+won'?t|nothing\s+will)\b/i, weight: 2 },
      { pattern: /\b(won'?t\s+work|will\s+fail|going\s+to\s+be\s+terrible|is\s+doomed)\b/i, weight: 2 },
      { pattern: /\bno\s+point\s+(in\s+)?(even\s+)?(trying|attempting|bothering)\b/i, weight: 3 },
      { pattern: /\b(there'?s?\s+no\s+hope|it'?s?\s+hopeless|nothing\s+can\s+help)\b/i, weight: 2 },
      { pattern: /\bwhat'?s\s+the\s+point\b/i, weight: 1 },
    ],

    reframes: [
      'You\'re predicting the future — but how accurate have negative predictions like this been in the past?',
      'What\'s the best realistic outcome if you try? What\'s actually the worst — and could you survive it?',
      'What would you need to believe for trying to be worth it?',
      'Is "it will fail" a fact, or a fear dressed up as a fact?',
      'What if you\'re wrong about this one?',
    ],

    aiContext: 'The user is predicting negative future outcomes as certainties. Help them distinguish fear-based predictions from actual evidence, and explore what trying — despite uncertainty — might look like.',
  },

  // ── 7. CATASTROPHISING ───────────────────────────────────────
  {
    id:    'catastrophising',
    name:  'Catastrophising',
    emoji: '🌋',
    color: '#dc2626',
    colorLight: '#fff5f5',

    triggers: [
      { pattern: /\b(worst|most\s+awful|most\s+terrible)\s+thing\s+(that\s+)?(ever|has\s+ever|could)\b/i, weight: 3 },
      { pattern: /\b(my\s+life\s+is\s+)?(ruined|over|destroyed|finished|falling\s+apart|a\s+disaster)\b/i, weight: 3 },
      { pattern: /\b(can'?t\s+handle|can'?t\s+bear|can'?t\s+cope\s+with)\s+(this|it|anymore)\b/i, weight: 2 },
      { pattern: /\b(devastating|catastrophic|unbearable|horrifying|end\s+of\s+the\s+world)\b/i, weight: 2 },
      { pattern: /\beverything\s+is\s+(falling|going)\s+(apart|wrong|to\s+pieces|to\s+hell)\b/i, weight: 3 },
      { pattern: /\b(total|complete|utter)\s+(catastrophe|disaster|nightmare|chaos|mess)\b/i, weight: 2 },
    ],

    reframes: [
      'On a scale of 1 to 10, how bad is this truly? And in a year from now, how bad will it be?',
      'What\'s the realistic worst case — and what are the chances that actually happens?',
      'Have you been through something really hard before and come out the other side? What helped then?',
      'What would "handling this" actually look like, even imperfectly?',
    ],

    aiContext: 'The user is catastrophising — viewing the situation as a disaster and feeling they cannot cope. Help them put the situation in perspective and build a sense of agency.',
  },

  // ── 8. EMOTIONAL REASONING ───────────────────────────────────
  {
    id:    'emotionalReasoning',
    name:  'Emotional reasoning',
    emoji: '💢',
    color: '#d97706',
    colorLight: '#fefce8',

    triggers: [
      { pattern: /\bi\s+feel\s+(like\s+(a|an)\s+)?(failure|loser|idiot|burden|fraud|fake|worthless|ugly|stupid|unlovable)\b/i, weight: 3 },
      { pattern: /\bi\s+feel\s+(so|really|truly)\s+(worthless|hopeless|broken|useless|disgusting)\b/i, weight: 3 },
      { pattern: /\bif\s+i\s+feel\s+(this\s+way|like\s+this).{0,30}(must\s+be|it\s+is|has\s+to\s+be\s+true)\b/i, weight: 3 },
      { pattern: /\bi\s+(feel|know)\s+i'?m?\s+(terrible|awful|a\s+bad\s+person|broken)\b/i, weight: 2 },
      { pattern: /\bmy\s+feelings?\s+(tell|show|prove)\s+me\b/i, weight: 2 },
    ],

    reframes: [
      'Feelings are real — but are they always reliable facts about the world? What would a friend see?',
      'You feel like a failure — but what does the evidence actually say, separate from the feeling?',
      'What\'s the difference between "I feel worthless" and "I am worthless"?',
      'If your feeling was your mind\'s alarm going off — what might it actually be reacting to?',
    ],

    aiContext: 'The user is treating an emotion as proof of a fact ("I feel like a failure, therefore I am one"). Help them separate the feeling (valid) from the belief (worth examining).',
  },

  // ── 9. SHOULD STATEMENTS ─────────────────────────────────────
  {
    id:    'shouldStatements',
    name:  'Should statements',
    emoji: '📏',
    color: '#0891b2',
    colorLight: '#ecfeff',

    triggers: [
      { pattern: /\bi\s+(should|shouldn'?t|must|mustn'?t|ought\s+to|have\s+to)\s+(?!go\s+to\s+the\s+(doctor|hospital|therapist))/i, weight: 2 },
      { pattern: /\bwhy\s+can'?t\s+i\s+(just|simply|even)\b/i, weight: 2 },
      { pattern: /\bi\s+should\s+(be\s+able\s+to|know\s+better|have\s+known)\b/i, weight: 3 },
      { pattern: /\bi'?m?\s+supposed\s+to\b/i, weight: 2 },
      { pattern: /\bwhat'?s\s+wrong\s+with\s+me\b/i, weight: 2 },
      { pattern: /\bi\s+need\s+to\s+be\s+(better|stronger|different|more)\b/i, weight: 2 },
      { pattern: /\b(people|everyone|you)\s+should\s+(just|always|never|know|understand)\b/i, weight: 2 },
    ],

    reframes: [
      'Where did that "should" come from? Is it your rule, or someone else\'s you adopted?',
      'What happens when you replace "I should" with "I\'d like to" or "it would help if"?',
      'Is this a genuine need, or an expectation you\'re holding yourself to without questioning it?',
      'What would you say to a friend who beat themselves up for not meeting this same standard?',
    ],

    aiContext: 'The user is using rigid "should/must/ought to" rules that create shame and pressure. Help them examine where these rules come from and whether they are truly serving them.',
  },

  // ── 10. PERSONALISATION ──────────────────────────────────────
  {
    id:    'personalisation',
    name:  'Personalisation',
    emoji: '🎯',
    color: '#059669',
    colorLight: '#ecfdf5',

    triggers: [
      { pattern: /\b(it'?s?|this\s+is)\s+(all\s+)?(my\s+fault)\b/i, weight: 3 },
      { pattern: /\bi\s+(caused|made|caused|ruined|broke)\s+(them|him|her|it|everything|this)\b/i, weight: 2 },
      { pattern: /\bif\s+it\s+wasn'?t\s+for\s+me\b/i, weight: 2 },
      { pattern: /\bi'?m?\s+(the\s+)?(reason|cause|problem|one\s+to\s+blame)\b/i, weight: 3 },
      { pattern: /\bthey('?re|\s+are)\s+upset\s+because\s+of\s+me\b/i, weight: 2 },
      { pattern: /\bi\s+ruined\s+(everything|it|their|the)\b/i, weight: 2 },
      { pattern: /\bblame\s+myself\b/i, weight: 2 },
    ],

    reframes: [
      'What other factors might have contributed here, outside of you?',
      'You\'re taking full responsibility — but how much of this was actually in your control?',
      'Is it possible this isn\'t about you at all, and your mind is filling in the gap?',
      'What would the situation look like if you took yourself out of the equation?',
    ],

    aiContext: 'The user is taking excessive personal responsibility for events that may have many contributing factors. Help them examine what was genuinely within their control versus what was not.',
  },
]

// ── Detection engine ──────────────────────────────────────────────

/**
 * Normalise input text for matching.
 * @param {string} text
 * @returns {string}
 */
function norm(text) {
  return text.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ').trim()
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
 * Detect all cognitive distortions present in a message.
 *
 * Returns the top distortions (up to 2) sorted by trigger weight,
 * along with a single reframing question for the primary distortion.
 *
 * @param {string} message — raw user message
 * @returns {{
 *   detected:       boolean,
 *   distortions:    Array<{ id, name, emoji, color, colorLight, reframe, weight }>,
 *   primaryReframe: string|null,
 *   reframeText:    string|null   (full formatted bubble text)
 * }}
 */
export function detectDistortions(message) {
  const normalised = norm(message)
  const found = []

  for (const distortion of DISTORTIONS) {
    let totalWeight = 0
    let matched = false

    for (const { pattern, weight } of distortion.triggers) {
      if (pattern.test(normalised)) {
        totalWeight += weight
        matched = true
      }
    }

    if (matched) {
      found.push({
        id:         distortion.id,
        name:       distortion.name,
        emoji:      distortion.emoji,
        color:      distortion.color,
        colorLight: distortion.colorLight,
        reframe:    pick(distortion.reframes),
        aiContext:  distortion.aiContext,
        weight:     totalWeight,
      })
    }
  }

  if (!found.length) {
    return { detected: false, distortions: [], primaryReframe: null, reframeText: null }
  }

  // Sort by weight descending, take top 2
  found.sort((a, b) => b.weight - a.weight)
  const top = found.slice(0, 2)
  const primary = top[0]

  // Build the bubble text shown to the user
  // Short: name the distortion type + the reframe question
  const reframeText = primary.reframe

  return {
    detected:       true,
    distortions:    top,
    primaryReframe: primary.reframe,
    reframeText,
  }
}

/**
 * Build a distortion context block for injection into the AI system prompt.
 * The AI will use this to shape its reply — acknowledging the distortion
 * naturally without breaking character.
 *
 * @param {Array} distortions — from detectDistortions()
 * @returns {string}
 */
export function buildDistortionContext(distortions) {
  if (!distortions?.length) return ''

  const lines = distortions.map(d =>
    `- ${d.name}: ${d.aiContext}`
  )

  return `\n\nCognitive distortion context (use this to shape your reply — address these patterns naturally and gently, without using clinical jargon or labelling the user):
${lines.join('\n')}
In your reply: first acknowledge their feeling, then gently explore the distortion with a question or reframe. Keep it light and conversational — never lecture.`
}
