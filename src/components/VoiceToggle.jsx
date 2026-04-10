import { useState, useEffect, useRef } from 'react'
import { speechRecognitionSupported } from '../lib/voiceEngine'
import styles from './VoiceToggle.module.css'

/**
 * VoiceToggle
 *
 * Renders:
 *   1. A Text/Voice mode toggle pill in the chat input area
 *   2. A pulsing microphone button (when in voice mode)
 *   3. Interim transcript display while listening
 *
 * Props:
 *   voiceMode        {boolean}          — current mode
 *   onToggle         {fn}               — toggle voice/text mode
 *   onTranscript     {fn(text)}         — called when user finishes speaking
 *   isListening      {boolean}          — mic is active
 *   isSpeaking       {boolean}          — TTS is playing
 *   interimText      {string}           — partial speech result
 *   onMicPress       {fn}               — start/stop listening
 *   disabled         {boolean}          — disabled during AI response
 *   supported        {boolean}          — speech recognition available
 */
export default function VoiceToggle({
  voiceMode, onToggle, isListening, isSpeaking,
  interimText, onMicPress, disabled, supported,
}) {
  return (
    <div className={styles.wrap}>
      {/* ── Mode toggle pill ── */}
      <div className={styles.modePill}>
        <button
          className={`${styles.modeBtn} ${!voiceMode ? styles.active : ''}`}
          onClick={() => voiceMode && onToggle()}
          title="Text mode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Text
        </button>
        <button
          className={`${styles.modeBtn} ${voiceMode ? styles.active : ''}`}
          onClick={() => !voiceMode && onToggle()}
          title={supported ? 'Voice therapy mode' : 'Speech recognition not supported in this browser'}
          disabled={!supported}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Voice
          {!supported && <span className={styles.unsupported}> ✕</span>}
        </button>
      </div>

      {/* ── Mic button (voice mode only) ── */}
      {voiceMode && supported && (
        <div className={styles.micWrap}>
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className={styles.speakingBar}>
              <div className={styles.speakingIcon}>🔊</div>
              <div className={styles.speakingWave}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} className={styles.wave} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span>Lume is speaking…</span>
            </div>
          )}

          {/* Interim transcript */}
          {isListening && interimText && (
            <div className={styles.interim}>
              <span className={styles.interimDot} />
              {interimText}
            </div>
          )}

          {/* Mic button */}
          <button
            className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
            onClick={onMicPress}
            disabled={disabled || isSpeaking}
            title={isListening ? 'Stop listening' : 'Tap to speak'}
          >
            {isListening ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
            {isListening && <div className={styles.pulse} />}
            {isListening && <div className={styles.pulse2} />}
          </button>

          <div className={styles.micLabel}>
            {isListening ? 'Listening — tap to stop' : 'Tap to speak'}
          </div>
        </div>
      )}
    </div>
  )
}
