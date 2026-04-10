import { useState, useRef, useEffect } from 'react'
import styles from './MusicPage.module.css'

/*
  Real audio: all from Pixabay (CC0 / royalty-free), verified to match their names.
  freesound.org CDN / pixabay CDN direct mp3 links.
*/
const TRACKS = [
  {
    id: 1,
    emoji: '🌊', title: 'Ocean Waves', desc: 'Gentle coastal surf rolling in',
    mood: 'calm', color: ['#a8d8ea', '#6fb3d2'],
    src: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1e01c26dc3.mp3',
  },
  {
    id: 2,
    emoji: '🌧️', title: 'Soft Rain', desc: 'Light rain on leaves & earth',
    mood: 'anxiety', color: ['#b8d4be', '#7aaa88'],
    src: 'https://cdn.pixabay.com/download/audio/2022/05/13/audio_1808fbf07a.mp3',
  },
  {
    id: 3,
    emoji: '🔥', title: 'Fireplace', desc: 'Warm crackling wood fire',
    mood: 'low', color: ['#f2c98a', '#e07b39'],
    src: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_e21d20d3e1.mp3',
  },
  {
    id: 4,
    emoji: '🎹', title: 'Piano Calm', desc: 'Gentle meditation piano keys',
    mood: 'calm', color: ['#d4c5f9', '#9b87d1'],
    src: 'https://cdn.pixabay.com/download/audio/2024/02/28/audio_e0ee635bf9.mp3',
  },
  {
    id: 5,
    emoji: '🌲', title: 'Forest Birds', desc: 'Dawn chorus in a woodland',
    mood: 'amazing', color: ['#b8e6c1', '#5a9e6b'],
    src: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f29571b.mp3',
  },
  {
    id: 6,
    emoji: '🌙', title: 'Night Crickets', desc: 'Peaceful summer night insects',
    mood: 'okay', color: ['#c5cff5', '#6272c8'],
    src: 'https://cdn.pixabay.com/download/audio/2022/09/09/audio_a90cd2c39e.mp3',
  },
]

const AMBIENT = [
  {
    id: 7,
    emoji: '🌬️', title: 'Wind Chimes', desc: 'Soft breeze through bamboo chimes',
    color: ['#f9e4b7', '#d4a843'],
    src: 'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3',
  },
  {
    id: 8,
    emoji: '⛈️', title: 'Thunderstorm', desc: 'Rain & distant rolling thunder',
    color: ['#c5c9e8', '#6870b4'],
    src: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_7d9f8d5df5.mp3',
  },
  {
    id: 9,
    emoji: '🏞️', title: 'River Stream', desc: 'Babbling mountain brook water',
    color: ['#aaddee', '#3a9dbf'],
    src: 'https://cdn.pixabay.com/download/audio/2022/06/07/audio_26ea9fcb07.mp3',
  },
  {
    id: 10,
    emoji: '🌊', title: 'Deep Underwater', desc: 'Serene submarine ambience',
    color: ['#7ec8d8', '#1e6f8a'],
    src: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3',
  },
  {
    id: 11,
    emoji: '☁️', title: 'White Noise', desc: 'Pure calming white noise blanket',
    color: ['#dde4ec', '#8fa5bf'],
    src: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_3b48e14ca9.mp3',
  },
]

export default function MusicPage() {
  const [playing, setPlaying] = useState(null)
  const [paused,  setPaused]  = useState(false)
  const [volume,  setVolume]  = useState(0.55)
  const [progress, setProgress] = useState(0)
  const audioRef   = useRef(new Audio())
  const progressRaf = useRef(null)

  useEffect(() => {
    const a = audioRef.current
    a.volume = volume
    a.addEventListener('timeupdate', updateProgress)
    return () => {
      a.removeEventListener('timeupdate', updateProgress)
      a.pause()
    }
  }, [])

  function updateProgress() {
    const a = audioRef.current
    if (a.duration) setProgress((a.currentTime / a.duration) * 100)
  }

  function playTrack(track) {
    const a = audioRef.current
    if (playing === track.id && !paused) { a.pause(); setPaused(true); return }
    if (playing === track.id &&  paused) { a.play(); setPaused(false); return }
    a.src = track.src
    a.loop = true
    a.volume = volume
    a.play().catch(() => {})
    setPlaying(track.id)
    setPaused(false)
  }

  function stop() {
    audioRef.current.pause()
    audioRef.current.src = ''
    setPlaying(null); setPaused(false); setProgress(0)
  }

  function handleVolume(v) {
    setVolume(v); audioRef.current.volume = v
  }

  const all = [...TRACKS, ...AMBIENT]
  const cur = all.find(t => t.id === playing)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2>Music & Sounds</h2>
          <p>Curated soundscapes matched to your mood — grounding, calming, healing.</p>
        </div>
        {cur && (
          <div className={styles.nowPlaying}>
            <span className={styles.npDot} />
            <span>{cur.title}</span>
          </div>
        )}
      </header>

      <div className={`${styles.body} ${cur ? styles.hasPlayer : ''}`}>
        <SectionLabel>Mood-matched tracks</SectionLabel>
        <div className={`${styles.grid} stagger`}>
          {TRACKS.map(t => (
            <TrackCard key={t.id} track={t}
              isPlaying={playing === t.id && !paused}
              isPaused={playing === t.id && paused}
              onClick={() => playTrack(t)} />
          ))}
        </div>

        <SectionLabel style={{ marginTop: 12 }}>Nature & Ambient</SectionLabel>
        <div className={`${styles.grid} stagger`}>
          {AMBIENT.map(t => (
            <TrackCard key={t.id} track={t}
              isPlaying={playing === t.id && !paused}
              isPaused={playing === t.id && paused}
              tag="ambient"
              onClick={() => playTrack(t)} />
          ))}
        </div>
      </div>

      {cur && (
        <div className={styles.playerBar}>
          <div
            className={styles.playerProgress}
            style={{ width: progress + '%' }}
          />
          <div className={styles.playerGrad} style={{
            background: `linear-gradient(135deg, ${cur.color[0]}22, ${cur.color[1]}33)`
          }} />
          <span className={styles.playerArt}>{cur.emoji}</span>
          <div className={styles.playerInfo}>
            <div className={styles.playerTitle}>{cur.title}</div>
            <div className={styles.playerDesc}>{cur.desc}</div>
          </div>
          <div className={styles.playerControls}>
            <button className={`${styles.ctrlBtn} ${styles.playPause}`}
              onClick={() => playTrack(cur)}>
              {paused ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              )}
            </button>
            <button className={styles.ctrlBtn} onClick={stop} title="Stop">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
            </button>
          </div>
          <div className={styles.volRow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-soft)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <input type="range" min={0} max={1} step={0.02} value={volume}
              onChange={e => handleVolume(parseFloat(e.target.value))} />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children, style }) {
  return <div className="sectionLabel" style={style}>{children}</div>
}

function TrackCard({ track, isPlaying, isPaused, onClick, tag }) {
  const active = isPlaying || isPaused
  return (
    <div
      className={`${styles.trackCard} ${active ? styles.active : ''}`}
      onClick={onClick}
    >
      {/* Animated gradient background */}
      <div className={styles.trackArt} style={{
        background: `linear-gradient(145deg, ${track.color[0]}, ${track.color[1]})`
      }}>
        <span className={styles.trackEmoji}>{track.emoji}</span>
        {isPlaying && <div className={styles.waveRing} />}
        {isPlaying && <div className={styles.waveRing} style={{ animationDelay: '0.5s' }} />}
        <div className={styles.playOverlay}>
          {isPlaying ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          )}
        </div>
      </div>

      <div className={styles.trackInfo}>
        <div className={styles.trackTitle}>{track.title}</div>
        <div className={styles.trackDesc}>{track.desc}</div>
        <span className={styles.moodTag} style={{
          background: track.color[0] + '55',
          color: track.color[1],
          border: `1px solid ${track.color[1]}44`
        }}>
          {tag ?? track.mood}
        </span>
      </div>

      {isPlaying && (
        <div className={styles.barsWrap}>
          <Bars />
        </div>
      )}
    </div>
  )
}

function Bars() {
  return (
    <div className={styles.bars}>
      {[0,1,2,3].map(i => (
        <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}
