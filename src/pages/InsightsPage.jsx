import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchInsightsData, computeInsights, MOOD_META, SOLUTION_META } from '../lib/insightsEngine'
import { useAuth } from '../context/AuthContext'
import styles from './InsightsPage.module.css'

export default function InsightsPage() {
  const { profile } = useAuth()
  const [insights, setInsights] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [tab,      setTab]      = useState('overview') // 'overview' | 'mood' | 'activity' | 'time'

  useEffect(() => { loadInsights() }, [])

  async function loadInsights() {
    setLoading(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { moodLogs, memories, error: fetchErr } = await fetchInsightsData(supabase, user.id)
      if (fetchErr) throw fetchErr
      setInsights(computeInsights(moodLogs, memories))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />
  if (error)   return <ErrorState error={error} onRetry={loadInsights} />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2>Your Insights</h2>
          <p>Patterns from your emotional journey — updated in real time.</p>
        </div>
        <button className={styles.refreshBtn} onClick={loadInsights} title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </header>

      {/* Sub-tabs */}
      <div className={styles.subTabs}>
        {[
          { id: 'overview', label: '📊 Overview'  },
          { id: 'mood',     label: '😊 Mood'      },
          { id: 'activity', label: '✨ Activity'   },
          { id: 'time',     label: '🕐 Timing'    },
        ].map(t => (
          <button
            key={t.id}
            className={`${styles.subTab} ${tab === t.id ? styles.subTabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {!insights.hasData ? (
          <EmptyState />
        ) : (
          <>
            {tab === 'overview' && <OverviewTab insights={insights} profile={profile} />}
            {tab === 'mood'     && <MoodTab     insights={insights} />}
            {tab === 'activity' && <ActivityTab insights={insights} />}
            {tab === 'time'     && <TimeTab     insights={insights} />}
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════
function OverviewTab({ insights, profile }) {
  const { mostCommonMood, worstTimeOfDay, bestTimeOfDay, mostEffectiveActivity,
          streakInsight, energyTrend, weeklyMoodChart, summary, moodTrend, dataPoints } = insights

  return (
    <div className={`${styles.grid} stagger`}>
      {/* AI Summary banner */}
      <div className={`${styles.card} ${styles.summaryCard} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <div className={styles.summaryInner}>
          <span className={styles.summaryIcon}>✨</span>
          <div className={styles.summaryText}>{summary}</div>
        </div>
        <div className={styles.summaryMeta}>
          Based on {dataPoints} data point{dataPoints !== 1 ? 's' : ''} ·{' '}
          <span className={styles[`trend_${moodTrend}`]}>
            {moodTrend === 'improving' ? '📈 Mood improving' : moodTrend === 'declining' ? '📉 Harder stretch' : '→ Stable'}
          </span>
        </div>
      </div>

      {/* Weekly chart */}
      <div className={`${styles.card} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <h3 className={styles.cardTitle}>7-Day Mood Map</h3>
        <WeeklyChart days={weeklyMoodChart} />
      </div>

      {/* Stat cards row */}
      {mostCommonMood && (
        <StatCard
          icon={mostCommonMood.emoji}
          label="Most common mood"
          value={mostCommonMood.label}
          sub={`${mostCommonMood.percentage}% of check-ins`}
          color={MOOD_META[mostCommonMood.label]?.color}
          trend={mostCommonMood.trend}
        />
      )}

      {worstTimeOfDay && (
        <StatCard
          icon={worstTimeOfDay.emoji}
          label="Hardest time of day"
          value={worstTimeOfDay.label}
          sub={worstTimeOfDay.desc}
          color="#8899bb"
          accent
        />
      )}

      {mostEffectiveActivity && (
        <StatCard
          icon={mostEffectiveActivity.emoji}
          label="Most used activity"
          value={mostEffectiveActivity.label}
          sub={`Used ${mostEffectiveActivity.count} time${mostEffectiveActivity.count !== 1 ? 's' : ''}`}
          color={mostEffectiveActivity.color}
        />
      )}

      {energyTrend && (
        <StatCard
          icon={energyTrend.emoji}
          label="Average energy"
          value={`${energyTrend.average} / 10`}
          sub={energyTrend.label}
          color="#7aaa88"
          trend={energyTrend.trend}
        />
      )}

      {streakInsight && (
        <StatCard
          icon="🌿"
          label="Calm day streak"
          value={`${streakInsight.current} day${streakInsight.current !== 1 ? 's' : ''}`}
          sub={`Longest: ${streakInsight.longest} days`}
          color="#5f8f6e"
        />
      )}

      {bestTimeOfDay && (
        <StatCard
          icon={bestTimeOfDay.emoji}
          label="Best time of day"
          value={bestTimeOfDay.label}
          sub={bestTimeOfDay.desc}
          color="#6db87a"
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
//  MOOD TAB
// ══════════════════════════════════════════════════
function MoodTab({ insights }) {
  const { moodDistribution, mostCommonMood, weeklyMoodChart } = insights
  const total = moodDistribution.reduce((s, m) => s + m.count, 0)

  return (
    <div className={`${styles.grid} stagger`}>
      {/* Mood distribution bars */}
      <div className={`${styles.card} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <h3 className={styles.cardTitle}>Mood Distribution</h3>
        <p className={styles.cardSub}>How you've been feeling across all check-ins</p>
        <div className={styles.distBars}>
          {moodDistribution.map(m => (
            <div key={m.label} className={styles.distRow}>
              <div className={styles.distLabel}>
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </div>
              <div className={styles.distBarWrap}>
                <div
                  className={styles.distBar}
                  style={{ width: `${m.percentage}%`, background: m.color }}
                />
              </div>
              <div className={styles.distPct}>{m.percentage}%</div>
              <div className={styles.distCount}>{m.count}×</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly mood heatmap */}
      <div className={`${styles.card} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <h3 className={styles.cardTitle}>This Week, Day by Day</h3>
        <WeeklyChart days={weeklyMoodChart} showEmoji />
      </div>

      {/* Top mood callout */}
      {mostCommonMood && (
        <div className={`${styles.card} ${styles.moodCallout} anim-fadeUp`} style={{ gridColumn: '1 / -1', borderColor: MOOD_META[mostCommonMood.label]?.color + '66' }}>
          <span style={{ fontSize: 48 }}>{mostCommonMood.emoji}</span>
          <div>
            <div className={styles.moodCalloutLabel}>Your most frequent mood</div>
            <div className={styles.moodCalloutValue}>{mostCommonMood.label}</div>
            <div className={styles.moodCalloutSub}>{mostCommonMood.percentage}% of all check-ins</div>
          </div>
          <TrendBadge trend={mostCommonMood.trend} />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
//  ACTIVITY TAB
// ══════════════════════════════════════════════════
function ActivityTab({ insights }) {
  const { activityBreakdown, mostEffectiveActivity } = insights

  return (
    <div className={`${styles.grid} stagger`}>
      {/* Most used activity highlight */}
      {mostEffectiveActivity && (
        <div
          className={`${styles.card} ${styles.activityHero} anim-fadeUp`}
          style={{ gridColumn: '1 / -1', borderColor: mostEffectiveActivity.color + '55' }}
        >
          <div className={styles.actHeroIcon}>{mostEffectiveActivity.emoji}</div>
          <div className={styles.actHeroInfo}>
            <div className={styles.actHeroLabel}>Most reached-for tool</div>
            <div className={styles.actHeroValue}>{mostEffectiveActivity.label}</div>
            <div className={styles.actHeroSub}>
              Used in {mostEffectiveActivity.usageRate}% of tracked sessions · {mostEffectiveActivity.count} time{mostEffectiveActivity.count !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Activity breakdown */}
      <div className={`${styles.card} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <h3 className={styles.cardTitle}>Activity Breakdown</h3>
        <p className={styles.cardSub}>How you've been supporting yourself</p>

        {/* Stacked bar */}
        <div className={styles.stackedBar}>
          {activityBreakdown.map(a => (
            <div
              key={a.id}
              className={styles.stackSegment}
              style={{ width: `${a.percentage}%`, background: a.color }}
              title={`${a.label}: ${a.percentage}%`}
            />
          ))}
        </div>
        <div className={styles.stackLegend}>
          {activityBreakdown.map(a => (
            <div key={a.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: a.color }} />
              <span>{a.emoji} {a.label}</span>
              <span className={styles.legendPct}>{a.percentage}%</span>
            </div>
          ))}
        </div>

        {/* Individual cards */}
        <div className={styles.activityCards}>
          {activityBreakdown.map((a, i) => (
            <div key={a.id} className={styles.actCard} style={{ borderColor: a.color + '44' }}>
              <div className={styles.actCardRank} style={{ color: a.color }}>#{i+1}</div>
              <div className={styles.actCardEmoji}>{a.emoji}</div>
              <div className={styles.actCardLabel}>{a.label}</div>
              <div className={styles.actCardBar}>
                <div style={{ width: `${a.percentage}%`, background: a.color, height: '100%', borderRadius: 4, transition: 'width 1s var(--ease-out)' }} />
              </div>
              <div className={styles.actCardPct}>{a.percentage}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  TIME TAB
// ══════════════════════════════════════════════════
function TimeTab({ insights }) {
  const { worstTimeOfDay, bestTimeOfDay } = insights

  const timeBlocks = [
    { id: 'earlyMorning', emoji: '🌅', label: 'Early morning', desc: '5am – 8am'  },
    { id: 'morning',      emoji: '☀️', label: 'Morning',       desc: '8am – 12pm' },
    { id: 'afternoon',    emoji: '🌤️', label: 'Afternoon',     desc: '12pm – 5pm' },
    { id: 'evening',      emoji: '🌆', label: 'Evening',       desc: '5pm – 9pm'  },
    { id: 'night',        emoji: '🌙', label: 'Night',         desc: '9pm – 12am' },
    { id: 'lateNight',    emoji: '🌃', label: 'Late night',    desc: '12am – 5am' },
  ]

  return (
    <div className={`${styles.grid} stagger`}>
      {/* Worst time callout */}
      {worstTimeOfDay && (
        <div className={`${styles.card} ${styles.timeCallout} ${styles.worstTime} anim-fadeUp`}>
          <div className={styles.timeCalloutIcon}>{worstTimeOfDay.emoji}</div>
          <div>
            <div className={styles.timeCalloutBadge} style={{ background: '#fff0f0', color: '#c46b6b', border: '1px solid #f0c4c4' }}>
              😔 Hardest time
            </div>
            <div className={styles.timeCalloutValue}>{worstTimeOfDay.label}</div>
            <div className={styles.timeCalloutSub}>{worstTimeOfDay.desc} · {worstTimeOfDay.totalEntries} check-in{worstTimeOfDay.totalEntries !== 1 ? 's' : ''}</div>
            <p className={styles.timeCalloutTip}>
              Consider scheduling a calming activity or breathing exercise during this window.
            </p>
          </div>
        </div>
      )}

      {/* Best time callout */}
      {bestTimeOfDay && (
        <div className={`${styles.card} ${styles.timeCallout} ${styles.bestTime} anim-fadeUp`}>
          <div className={styles.timeCalloutIcon}>{bestTimeOfDay.emoji}</div>
          <div>
            <div className={styles.timeCalloutBadge} style={{ background: '#f0f7f2', color: '#3a6448', border: '1px solid var(--accent-light)' }}>
              😊 Best time
            </div>
            <div className={styles.timeCalloutValue}>{bestTimeOfDay.label}</div>
            <div className={styles.timeCalloutSub}>{bestTimeOfDay.desc} · {bestTimeOfDay.totalEntries} check-in{bestTimeOfDay.totalEntries !== 1 ? 's' : ''}</div>
            <p className={styles.timeCalloutTip}>
              This is when you tend to feel your best — a good time for creative or social activities.
            </p>
          </div>
        </div>
      )}

      {/* 24h visual timeline */}
      <div className={`${styles.card} anim-fadeUp`} style={{ gridColumn: '1 / -1' }}>
        <h3 className={styles.cardTitle}>24-Hour Emotional Map</h3>
        <p className={styles.cardSub}>A rough guide to how your energy moves through the day</p>
        <div className={styles.timeline}>
          {timeBlocks.map(block => {
            const isWorst = worstTimeOfDay?.id === block.id
            const isBest  = bestTimeOfDay?.id  === block.id
            return (
              <div
                key={block.id}
                className={`${styles.timeBlock} ${isWorst ? styles.worstBlock : ''} ${isBest ? styles.bestBlock : ''}`}
              >
                <div className={styles.timeBlockEmoji}>{block.emoji}</div>
                <div className={styles.timeBlockLabel}>{block.label}</div>
                <div className={styles.timeBlockDesc}>{block.desc}</div>
                {isWorst && <div className={styles.timeBlockTag} style={{ background: '#fff0f0', color: '#c46b6b' }}>Lowest</div>}
                {isBest  && <div className={styles.timeBlockTag} style={{ background: '#f0f7f2', color: '#3a6448' }}>Highest</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════
function StatCard({ icon, label, value, sub, color, trend, accent }) {
  return (
    <div className={`${styles.card} ${styles.statCard} anim-fadeUp`}
      style={{ borderTopColor: color ?? 'var(--accent)' }}>
      <div className={styles.statIcon} style={{ color }}>{icon}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
      {trend && <TrendBadge trend={trend} />}
    </div>
  )
}

function TrendBadge({ trend }) {
  if (!trend || trend === 'stable') return null
  return (
    <div className={`${styles.trendBadge} ${styles[`trend_${trend}`]}`}>
      {trend === 'up' || trend === 'improving' ? '↑ Up' : '↓ Down'}
    </div>
  )
}

function WeeklyChart({ days, showEmoji }) {
  const maxVal = 5
  return (
    <div className={styles.weeklyChart}>
      {days.map((d, i) => (
        <div key={i} className={styles.dayCol}>
          <div className={styles.dayBarWrap}>
            {d.avgValence != null ? (
              <div
                className={styles.dayBar}
                style={{
                  height: `${(d.avgValence / maxVal) * 100}%`,
                  background: d.color,
                  animationDelay: `${i * 80}ms`,
                }}
                title={`${d.dominantMood ?? ''} (avg ${d.avgValence?.toFixed(1)})`}
              >
                {showEmoji && d.dominantEmoji && (
                  <span className={styles.dayBarEmoji}>{d.dominantEmoji}</span>
                )}
              </div>
            ) : (
              <div className={styles.dayBarEmpty} />
            )}
          </div>
          <div className={styles.dayLabel}>{d.label}</div>
          {d.logCount > 0 && <div className={styles.dayCount}>{d.logCount}</div>}
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📊</div>
      <h3>No data yet</h3>
      <p>Start logging your moods and chatting with Lume. Your insights will appear here as patterns emerge — usually after 3–5 check-ins.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonHeader} />
      <div className={styles.body} style={{ padding: '28px 32px' }}>
        <div className={styles.grid}>
          {[1,2,3,4,5,6].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div className={styles.page}>
      <div className={styles.errorState}>
        <div>⚠️</div>
        <h3>Couldn't load insights</h3>
        <p>{error}</p>
        <button onClick={onRetry}>Try again</button>
      </div>
    </div>
  )
}
