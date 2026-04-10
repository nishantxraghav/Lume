/**
 * ══════════════════════════════════════════════════════════════════
 *  LUME — Insights Analytics Engine
 *  src/lib/insightsEngine.js
 *
 *  Pure computation layer — no side effects, no API calls.
 *  Takes raw data from Supabase (mood_logs + emotional_memory)
 *  and returns structured insight objects the UI renders directly.
 *
 *  Exports:
 *    fetchInsightsData(supabase, userId) → raw data from both tables
 *    computeInsights(moodLogs, memories) → full insights object
 *
 *  Insight categories:
 *    1. moodDistribution   — how often each mood appears (pie/bar)
 *    2. mostCommonMood     — single top mood with trend vs last week
 *    3. worstTimeOfDay     — hour buckets (morning/afternoon/evening/night)
 *    4. mostEffectiveActivity — which solution has most entries (proxy for use)
 *    5. weeklyMoodChart    — last 7 days, one mood dot per day
 *    6. streakInsight      — longest calm streak (days without crisis/high severity)
 *    7. energyTrend        — average energy level over time from mood_logs
 *    8. summary            — one-sentence AI-style natural language summary
 * ══════════════════════════════════════════════════════════════════
 */

// ── Constants ─────────────────────────────────────────────────────

const TIME_BUCKETS = [
  { id: 'earlyMorning', label: 'Early morning', range: [5, 8],   emoji: '🌅', desc: '5am – 8am'  },
  { id: 'morning',      label: 'Morning',        range: [8, 12],  emoji: '☀️', desc: '8am – 12pm' },
  { id: 'afternoon',    label: 'Afternoon',      range: [12, 17], emoji: '🌤️', desc: '12pm – 5pm' },
  { id: 'evening',      label: 'Evening',        range: [17, 21], emoji: '🌆', desc: '5pm – 9pm'  },
  { id: 'night',        label: 'Night',          range: [21, 24], emoji: '🌙', desc: '9pm – 12am' },
  { id: 'lateNight',    label: 'Late night',     range: [0, 5],   emoji: '🌃', desc: '12am – 5am' },
]

const MOOD_ORDER = ['Amazing', 'Good', 'Okay', 'Low', 'Anxious', 'Frustrated']

const MOOD_META = {
  Amazing:    { emoji: '😄', color: '#6db87a', valence: 5 },
  Good:       { emoji: '😊', color: '#7aaa88', valence: 4 },
  Okay:       { emoji: '😐', color: '#a0a8b0', valence: 3 },
  Low:        { emoji: '😔', color: '#8899bb', valence: 2 },
  Anxious:    { emoji: '😰', color: '#c4a040', valence: 1 },
  Frustrated: { emoji: '😤', color: '#c07070', valence: 1 },
}

const SEVERITY_VALENCE = {
  none:     5,
  low:      3,
  moderate: 2,
  high:     1,
  crisis:   0,
}

const SOLUTION_META = {
  breathing:  { label: 'Breathing exercise', emoji: '🌬️', color: '#7aaa88' },
  music:      { label: 'Calming music',       emoji: '🎵', color: '#8899d4' },
  cbt:        { label: 'Thought challenge',   emoji: '🧠', color: '#c4a040' },
  journaling: { label: 'Mood journaling',     emoji: '📓', color: '#a07abd' },
  crisis:     { label: 'Crisis support',      emoji: '🆘', color: '#c46b6b' },
  chat:       { label: 'Talking it through',  emoji: '💬', color: '#70a8c0' },
}

// ── Data Fetcher ───────────────────────────────────────────────────

/**
 * Fetch raw data from Supabase for the insights engine.
 * Returns { moodLogs, memories, error }
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} userId
 */
export async function fetchInsightsData(sb, userId) {
  try {
    const [moodRes, memRes] = await Promise.all([
      sb.from('mood_logs')
        .select('id, emoji, label, energy, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),

      sb.from('emotional_memory')
        .select('id, mood_label, mood_emoji, severity, solution_id, solution_label, solution_emoji, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(200),
    ])

    return {
      moodLogs: moodRes.data ?? [],
      memories: memRes.data ?? [],
      error:    moodRes.error ?? memRes.error ?? null,
    }
  } catch (err) {
    return { moodLogs: [], memories: [], error: err }
  }
}

// ── Main Compute ───────────────────────────────────────────────────

/**
 * Compute all insights from raw data.
 * Pure function — deterministic given the same inputs.
 *
 * @param {object[]} moodLogs  — from mood_logs table
 * @param {object[]} memories  — from emotional_memory table
 * @returns {InsightsResult}
 */
export function computeInsights(moodLogs, memories) {
  const hasData = moodLogs.length > 0 || memories.length > 0

  return {
    hasData,
    dataPoints:         moodLogs.length + memories.length,
    moodDistribution:   computeMoodDistribution(moodLogs),
    mostCommonMood:     computeMostCommonMood(moodLogs),
    worstTimeOfDay:     computeWorstTimeOfDay(moodLogs, memories),
    bestTimeOfDay:      computeBestTimeOfDay(moodLogs, memories),
    mostEffectiveActivity: computeMostEffectiveActivity(memories),
    activityBreakdown:  computeActivityBreakdown(memories),
    weeklyMoodChart:    computeWeeklyMoodChart(moodLogs),
    energyTrend:        computeEnergyTrend(moodLogs),
    streakInsight:      computeCalmStreak(memories),
    moodTrend:          computeMoodTrend(moodLogs),
    summary:            computeSummary(moodLogs, memories),
    lastUpdated:        new Date().toISOString(),
  }
}

// ── 1. Mood Distribution ──────────────────────────────────────────
function computeMoodDistribution(moodLogs) {
  if (!moodLogs.length) return []

  const counts = {}
  for (const log of moodLogs) {
    counts[log.label] = (counts[log.label] ?? 0) + 1
  }

  const total = moodLogs.length

  return MOOD_ORDER
    .filter(label => counts[label] > 0)
    .map(label => ({
      label,
      emoji:      MOOD_META[label]?.emoji ?? '😐',
      color:      MOOD_META[label]?.color ?? '#aaa',
      count:      counts[label] ?? 0,
      percentage: Math.round(((counts[label] ?? 0) / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

// ── 2. Most Common Mood ───────────────────────────────────────────
function computeMostCommonMood(moodLogs) {
  if (!moodLogs.length) return null

  const dist = computeMoodDistribution(moodLogs)
  if (!dist.length) return null

  const top = dist[0]

  // Trend: compare this week vs last week
  const now      = new Date()
  const oneWeek  = 7 * 86_400_000
  const thisWeek = moodLogs.filter(l => new Date(l.created_at) > new Date(now - oneWeek))
  const lastWeek = moodLogs.filter(l => {
    const t = new Date(l.created_at)
    return t > new Date(now - 2 * oneWeek) && t <= new Date(now - oneWeek)
  })

  const thisRate = thisWeek.length
    ? thisWeek.filter(l => l.label === top.label).length / thisWeek.length
    : null
  const lastRate = lastWeek.length
    ? lastWeek.filter(l => l.label === top.label).length / lastWeek.length
    : null

  let trend = 'stable'
  if (thisRate !== null && lastRate !== null) {
    if (thisRate > lastRate + 0.1) trend = 'up'
    else if (thisRate < lastRate - 0.1) trend = 'down'
  }

  return { ...top, trend }
}

// ── 3. Worst Time of Day ──────────────────────────────────────────
function computeWorstTimeOfDay(moodLogs, memories) {
  // Build hour → average valence map from mood_logs
  const bucketScores = {}   // { bucketId: { sum, count } }

  for (const log of moodLogs) {
    const hour    = new Date(log.created_at).getHours()
    const bucket  = timeBucket(hour)
    const valence = MOOD_META[log.label]?.valence ?? 3
    if (!bucketScores[bucket]) bucketScores[bucket] = { sum: 0, count: 0 }
    bucketScores[bucket].sum   += valence
    bucketScores[bucket].count += 1
  }

  // Also factor in distress-level memories
  for (const mem of memories) {
    const hour   = new Date(mem.timestamp).getHours()
    const bucket = timeBucket(hour)
    const val    = SEVERITY_VALENCE[mem.severity] ?? 5
    if (!bucketScores[bucket]) bucketScores[bucket] = { sum: 0, count: 0 }
    bucketScores[bucket].sum   += val
    bucketScores[bucket].count += 1
  }

  if (!Object.keys(bucketScores).length) return null

  // Lowest average valence = worst time
  let worst = null
  let worstAvg = Infinity

  for (const [id, { sum, count }] of Object.entries(bucketScores)) {
    const avg = sum / count
    if (avg < worstAvg) { worstAvg = avg; worst = id }
  }

  const meta = TIME_BUCKETS.find(b => b.id === worst)
  const score = Math.round(worstAvg * 10) / 10   // 0–5

  return meta ? { ...meta, avgValence: score, totalEntries: bucketScores[worst].count } : null
}

// ── 4. Best Time of Day ───────────────────────────────────────────
function computeBestTimeOfDay(moodLogs, memories) {
  const bucketScores = {}

  for (const log of moodLogs) {
    const hour    = new Date(log.created_at).getHours()
    const bucket  = timeBucket(hour)
    const valence = MOOD_META[log.label]?.valence ?? 3
    if (!bucketScores[bucket]) bucketScores[bucket] = { sum: 0, count: 0 }
    bucketScores[bucket].sum   += valence
    bucketScores[bucket].count += 1
  }

  if (!Object.keys(bucketScores).length) return null

  let best = null
  let bestAvg = -Infinity

  for (const [id, { sum, count }] of Object.entries(bucketScores)) {
    const avg = sum / count
    if (avg > bestAvg) { bestAvg = avg; best = id }
  }

  const meta = TIME_BUCKETS.find(b => b.id === best)
  const score = Math.round(bestAvg * 10) / 10

  return meta ? { ...meta, avgValence: score, totalEntries: bucketScores[best].count } : null
}

// ── 5. Most Effective Activity ─────────────────────────────────────
function computeMostEffectiveActivity(memories) {
  if (!memories.length) return null

  // Count usage of each solution (excluding 'chat' as it's the default)
  const counts = {}
  for (const mem of memories) {
    const id = mem.solution_id
    if (!id || id === 'chat') continue
    counts[id] = (counts[id] ?? 0) + 1
  }

  if (!Object.keys(counts).length) return null

  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  const meta  = SOLUTION_META[topId]

  return {
    id:    topId,
    label: meta?.label ?? topId,
    emoji: meta?.emoji ?? '✨',
    color: meta?.color ?? '#aaa',
    count: counts[topId],
    totalSessions: memories.length,
    usageRate: Math.round((counts[topId] / memories.length) * 100),
  }
}

// ── 6. Activity Breakdown ─────────────────────────────────────────
function computeActivityBreakdown(memories) {
  if (!memories.length) return []

  const counts = {}
  for (const mem of memories) {
    const id = mem.solution_id ?? 'chat'
    counts[id] = (counts[id] ?? 0) + 1
  }

  const total = memories.length

  return Object.entries(counts)
    .map(([id, count]) => ({
      id,
      label:      SOLUTION_META[id]?.label ?? id,
      emoji:      SOLUTION_META[id]?.emoji ?? '✨',
      color:      SOLUTION_META[id]?.color ?? '#aaa',
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

// ── 7. Weekly Mood Chart ──────────────────────────────────────────
function computeWeeklyMoodChart(moodLogs) {
  const days = []
  const now  = new Date()

  for (let i = 6; i >= 0; i--) {
    const date     = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr  = date.toLocaleDateString('en-IN', { weekday: 'short' })
    const dayStart = new Date(date.setHours(0,0,0,0))
    const dayEnd   = new Date(date.setHours(23,59,59,999))

    const dayLogs = moodLogs.filter(l => {
      const t = new Date(l.created_at)
      return t >= dayStart && t <= dayEnd
    })

    let avgValence = null
    let dominantMood = null
    let dominantEmoji = null

    if (dayLogs.length) {
      avgValence = dayLogs.reduce((s, l) => s + (MOOD_META[l.label]?.valence ?? 3), 0) / dayLogs.length
      // most frequent mood that day
      const mc = dayLogs.reduce((acc, l) => {
        acc[l.label] = (acc[l.label] ?? 0) + 1; return acc
      }, {})
      dominantMood  = Object.entries(mc).sort((a,b) => b[1]-a[1])[0][0]
      dominantEmoji = MOOD_META[dominantMood]?.emoji ?? '😐'
    }

    days.push({
      label:        dateStr,
      date:         new Date(dayStart).toISOString(),
      logCount:     dayLogs.length,
      avgValence,
      dominantMood,
      dominantEmoji,
      color:        avgValence ? valenceColor(avgValence) : '#e0dbd4',
    })
  }

  return days
}

// ── 8. Energy Trend ───────────────────────────────────────────────
function computeEnergyTrend(moodLogs) {
  if (!moodLogs.length) return null

  const withEnergy = moodLogs.filter(l => l.energy != null)
  if (!withEnergy.length) return null

  const avg = withEnergy.reduce((s, l) => s + l.energy, 0) / withEnergy.length
  const recent5  = withEnergy.slice(0, 5)
  const older5   = withEnergy.slice(5, 10)

  const recentAvg = recent5.length ? recent5.reduce((s,l) => s+l.energy, 0)/recent5.length : avg
  const olderAvg  = older5.length  ? older5.reduce((s,l) => s+l.energy, 0)/older5.length   : avg

  const trend = recentAvg > olderAvg + 0.5 ? 'up'
    : recentAvg < olderAvg - 0.5 ? 'down'
    : 'stable'

  return {
    average: Math.round(avg * 10) / 10,
    trend,
    recentAvg: Math.round(recentAvg * 10) / 10,
    label: avg >= 7 ? 'High energy' : avg >= 4 ? 'Moderate energy' : 'Low energy',
    emoji: avg >= 7 ? '⚡' : avg >= 4 ? '🔋' : '🪫',
  }
}

// ── 9. Calm Streak ────────────────────────────────────────────────
function computeCalmStreak(memories) {
  if (!memories.length) return { current: 0, longest: 0 }

  // Sort oldest → newest
  const sorted = [...memories].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  let longest = 0
  let current = 0
  let lastDate = null

  for (const mem of sorted) {
    const isCalm = !['crisis', 'high'].includes(mem.severity)
    const date   = new Date(mem.timestamp).toDateString()

    if (isCalm) {
      if (lastDate === date) continue   // same day, don't double count
      current++
      lastDate = date
      if (current > longest) longest = current
    } else {
      current = 0
      lastDate = null
    }
  }

  return { current, longest }
}

// ── 10. Mood Trend ────────────────────────────────────────────────
function computeMoodTrend(moodLogs) {
  if (moodLogs.length < 4) return 'neutral'

  const recent = moodLogs.slice(0, Math.floor(moodLogs.length / 2))
  const older  = moodLogs.slice(Math.floor(moodLogs.length / 2))

  const recentAvg = recent.reduce((s, l) => s + (MOOD_META[l.label]?.valence ?? 3), 0) / recent.length
  const olderAvg  = older.reduce( (s, l) => s + (MOOD_META[l.label]?.valence ?? 3), 0) / older.length

  if (recentAvg > olderAvg + 0.4) return 'improving'
  if (recentAvg < olderAvg - 0.4) return 'declining'
  return 'stable'
}

// ── 11. Natural Language Summary ──────────────────────────────────
function computeSummary(moodLogs, memories) {
  if (!moodLogs.length && !memories.length) {
    return "Start logging your moods and chatting with Lume — your personalised insights will appear here."
  }

  const top    = computeMostCommonMood(moodLogs)
  const worst  = computeWorstTimeOfDay(moodLogs, memories)
  const best   = computeMostEffectiveActivity(memories)
  const trend  = computeMoodTrend(moodLogs)
  const streak = computeCalmStreak(memories)

  const parts = []

  if (top) {
    parts.push(
      trend === 'improving' ? `Your mood has been improving — ${top.emoji} ${top.label} is your most frequent feeling lately.`
      : trend === 'declining' ? `You've had a harder stretch recently. ${top.emoji} ${top.label} has been your most common mood.`
      : `Your most frequent mood has been ${top.emoji} ${top.label}.`
    )
  }

  if (worst) {
    parts.push(`You tend to feel lowest during the ${worst.label.toLowerCase()} (${worst.desc}).`)
  }

  if (best) {
    parts.push(`${best.emoji} ${best.label} has been your go-to support tool — you've reached for it ${best.count} time${best.count !== 1 ? 's' : ''}.`)
  }

  if (streak.current > 2) {
    parts.push(`You've had ${streak.current} calm days in a row — that's worth acknowledging. 🌿`)
  }

  return parts.join(' ') || "Keep logging your moods — insights will grow richer over time."
}

// ── Utils ──────────────────────────────────────────────────────────
function timeBucket(hour) {
  for (const b of TIME_BUCKETS) {
    const [s, e] = b.range
    if (s < e) { if (hour >= s && hour < e) return b.id }
    else        { if (hour >= s || hour < e) return b.id }  // midnight wrap
  }
  return 'night'
}

function valenceColor(v) {
  // 1 (low) → warm red, 5 (high) → accent green
  if (v >= 4.5) return '#6db87a'
  if (v >= 3.5) return '#7aaa88'
  if (v >= 2.5) return '#a0a8b0'
  if (v >= 1.5) return '#8899bb'
  return '#c07070'
}

export { MOOD_META, SOLUTION_META, TIME_BUCKETS }
