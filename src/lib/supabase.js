import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jgefpxyasdxcpkwkqsby.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZWZweHlhc2R4Y3Brd2txc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDg2NjgsImV4cCI6MjA4MjkyNDY2OH0.Yam27AeBliCyWged8nl2k0Y4iI1NYFpnUWWKyClhx4A'
)

// ── Groq API (free, fast — llama-3.3-70b) ──────────────────────────────────
const GROQ_KEY = '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'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Accepts OpenAI-format messages: [{role:'system'|'user'|'assistant', content:string}]
 * Also transparently handles legacy Gemini format (parts:[{text}]).
 * Returns the assistant reply as a string.
 */
export async function geminiChat(history) {
  // Normalise message shapes
  const messages = history.map((msg, i) => {
    let role = msg.role === 'model' ? 'assistant' : msg.role

    let content = ''
    if (typeof msg.content === 'string') {
      content = msg.content
    } else if (Array.isArray(msg.parts)) {
      content = msg.parts.map(p => p.text ?? '').join('')
    }

    // First user turn → treat as system prompt
    if (i === 0 && role === 'user') role = 'system'

    return { role, content }
  })

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 512,
      temperature: 0.75,
    }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error))
  return data.choices?.[0]?.message?.content?.trim()
    ?? "I'm here for you. Could you share a bit more?"
}
