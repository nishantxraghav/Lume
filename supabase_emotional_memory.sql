-- ═══════════════════════════════════════════════════════════
--  LUME — Feature 2: Emotional Memory System
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

create table if not exists public.emotional_memory (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null,

  -- When it happened
  timestamp          timestamptz not null default now(),

  -- Mood at time of interaction
  mood_label         text,          -- e.g. "anxious", "very low", "neutral"
  mood_emoji         text,          -- e.g. "😰"
  severity           text,          -- 'crisis' | 'high' | 'moderate' | 'low' | 'none'

  -- What solution was used
  solution_id        text,          -- 'breathing' | 'music' | 'cbt' | 'journaling' | 'chat' | 'crisis'
  solution_label     text,          -- e.g. "breathing exercise"
  solution_emoji     text,          -- e.g. "🌬️"
  solution_section   text,          -- e.g. "CBT Exercises" (for deep-link nudges)

  -- Message snippets (first 120 chars only — not storing full messages here)
  message_snippet    text,
  ai_reply_snippet   text,

  -- Future: thumbs up/down on whether it helped
  outcome_rating     integer,       -- null | 1 (helped) | -1 (didn't help)

  created_at         timestamptz default now()
);

-- Index for fast user queries sorted by recency
create index if not exists emotional_memory_user_time
  on public.emotional_memory(user_id, timestamp desc);

-- Index for filtering by mood/severity (for recall hints)
create index if not exists emotional_memory_severity
  on public.emotional_memory(user_id, severity, timestamp desc);

-- RLS
alter table public.emotional_memory enable row level security;

create policy "Users can read own memory"
  on public.emotional_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert own memory"
  on public.emotional_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own memory"
  on public.emotional_memory for update
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
--  Verify tables exist
-- ═══════════════════════════════════════════════════════════
-- select table_name from information_schema.tables
--   where table_schema = 'public'
--   order by table_name;
