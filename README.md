# 🌤️ Lume — Mental Wellness Companion

A personalised React mental health chatbot powered by **Gemini AI** and **Supabase**.

---

## Stack
- **React 18 + Vite** — fast, modern frontend
- **Gemini 2.0 Flash** — AI chat responses
- **Supabase** — auth (email + Google OAuth), mood logs, chat history, streaks
- **React Router v6** — page navigation
- **CSS Modules** — scoped, maintainable styles

---

## 1 — Supabase Setup

### Create tables
Go to **Supabase Dashboard → SQL Editor → New query**, paste and run:

```sql
-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text,
  streak integer default 1,
  last_active date,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Mood logs
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  emoji text, label text, energy integer, note text,
  created_at timestamptz default now()
);
alter table public.mood_logs enable row level security;
create policy "own mood select" on public.mood_logs for select using (auth.uid() = user_id);
create policy "own mood insert" on public.mood_logs for insert with check (auth.uid() = user_id);

-- Chat history
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('user','assistant')),
  message text,
  created_at timestamptz default now()
);
alter table public.chat_history enable row level security;
create policy "own chat select" on public.chat_history for select using (auth.uid() = user_id);
create policy "own chat insert" on public.chat_history for insert with check (auth.uid() = user_id);
```

### Enable Google OAuth
1. Supabase Dashboard → **Authentication → Providers → Google** → toggle ON
2. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. **Authorised redirect URI**: `https://jgefpxyasdxcpkwkqsby.supabase.co/auth/v1/callback`
4. Paste Client ID & Secret into Supabase
5. In Supabase → **Authentication → URL Configuration**, add your site URL (e.g. `http://localhost:5173`)

---

## 2 — Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 3 — Deploy (Vercel / Netlify)

```bash
npm run build
# Upload the dist/ folder
```

After deploying, update the **Site URL** and **Redirect URLs** in Supabase → Authentication → URL Configuration to your production domain.

---

## Project Structure

```
src/
  lib/
    supabase.js        ← Supabase client + Gemini helper
  context/
    AuthContext.jsx    ← Session, profile, streak state
  components/
    Sidebar.jsx        ← Navigation sidebar
    Loading.jsx        ← Loading screen
  pages/
    AuthPage.jsx       ← Sign in / Sign up / Google OAuth
    OnboardPage.jsx    ← First-time profile setup
    Dashboard.jsx      ← App shell with routing
    ChatPage.jsx       ← Gemini AI chat
    MoodPage.jsx       ← Mood logging + history
    MusicPage.jsx      ← Mood-matched soundscapes
    CbtPage.jsx        ← CBT exercises + breathing
    CrisisPage.jsx     ← Crisis helpline resources
  index.css            ← Global CSS variables + animations
  main.jsx             ← Entry point
```
