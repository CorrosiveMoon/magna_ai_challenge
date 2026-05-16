# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Magna AI Content Suite — a FastAPI backend + (planned) Next.js frontend for AI-driven content marketing. All AI calls are server-side only; the frontend never touches Gemini or OpenAI directly.

## Backend Development

All backend work happens inside `backend/`. The venv lives at `backend/venv/` — **always use that interpreter, not the system Python.**

```bash
# Start dev server (run from backend/)
cd backend
venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Run smoke tests (server must be running on port 8000)
cd backend
venv\Scripts\python test_api.py

# Install / sync dependencies
cd backend
venv\Scripts\pip install -r requirements.txt
```

Interactive API docs are at `http://127.0.0.1:8000/docs` when the server is running.

## Environment

`backend/.env` is the authoritative env file for the server — config.py reads it via pydantic-settings. Required keys:

```
GEMINI_API_KEY
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
ALLOWED_ORIGINS      # comma-separated
RATE_LIMIT_PER_MIN   # default 20
```

## Architecture

### Request flow

```
Client
  → FastAPI router  (routers/)
    → auth.get_current_user()   — calls Supabase admin client to verify JWT
    → service function          (services/)
      → Gemini/OpenAI API       (gemini_text.py / gemini_image.py)
      → Supabase DB             via deps.get_supabase_admin()
      → Supabase Storage        (storage.py)
```

### Key design decisions

**Auth**: `auth.get_current_user()` calls `supabase.auth.get_user(token)` with the service role key — no local JWT secret needed. The rate limiter (`main.py`) extracts `sub` from the JWT header via `jose.jwt.get_unverified_claims` to rate-limit per user ID, not per IP.

**Supabase client**: `deps.get_supabase_admin()` is a module-level singleton using the service role key. It bypasses RLS — all user-scoping is done explicitly with `.eq("user_id", current_user["id"])` in every query. Use `.limit(1).execute()` instead of `.single()` or `.maybe_single()` — both of those throw or return `None` (not an object) when no rows match in supabase-py v2.x.

**Gemini client**: `services/gemini_client.py` holds the `genai.Client` singleton shared by text and image services. All SDK calls are sync — wrap them in `asyncio.get_event_loop().run_in_executor(None, lambda: ...)` inside async route handlers.

**Image generation**: Currently uses OpenAI (`gpt-image-2`, returns `b64_json`). The full Gemini implementation (`gemini-2.5-flash-image` via `generate_content` with `response_modalities=["IMAGE"]`) is preserved as a commented block at the bottom of `services/gemini_image.py` for rollback.

**Content normalization**: `routers/generate.py::_normalize()` maps raw AI JSON to `(title, body)` for each content type. `ad_copy` uses `headline` as title; `linkedin_post` appends hashtags to body; `email` composes subject/preview/CTA into body. The full raw AI response is always stored in the `metadata` JSONB column and returned in responses.

**Retry logic**: Both `gemini_text.generate_text()` and `gemini_image.generate_image()` retry once after 3 seconds on any exception before surfacing the error as a 502.

### Prompt system

Each content type has its own module in `prompts/` exposing `SYSTEM_PROMPT` and `build_user_prompt(topic, tone, audience)`. The system prompt enforces JSON-only output; `response_mime_type="application/json"` is set on all Gemini calls. All 4 content types return different JSON schemas (see `plan.md §6`).

### Database

Single table: `public.generations` — user-scoped with RLS. Migration is in `supabase/migrations/001_initial_schema.sql`. The storage bucket `generated-images` is public-read; images are stored at `{user_id}/{generation_id}.png`.

## Frontend Development

The frontend lives in `frontend/`. It is a Next.js 16 app (App Router, Tailwind CSS v4, shadcn/ui, React Query, Supabase SSR).

```bash
# Start dev server (run from frontend/)
cd frontend
npm run dev          # → http://localhost:3000

# Production build check
cd frontend
npm run build
```

`frontend/.env.local` is the authoritative env file for the frontend. Required keys:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL      # http://localhost:8000 in dev
```

### Frontend architecture notes

**Auth flow**: `proxy.ts` (Next.js 16's renamed middleware) runs on every request. It calls `supabase.auth.getUser()` to refresh the session and redirects unauthenticated users to `/login`. The `(app)/layout.tsx` does a server-side double-check via `createClient()` (server).

**API calls**: `lib/api.ts` attaches the Supabase JWT (`session.access_token`) to every request as `Authorization: Bearer`. The frontend never calls Gemini or OpenAI directly.

**Next.js 16 conventions**: `params` in page components is a `Promise<{...}>` — always `await params` or use `React.use(params)`. The file-system proxy is `proxy.ts` (not `middleware.ts`).

**State**: React Query for all server state (generations list, single generation). Local `useState` for form inputs and UI state only.

### Key frontend files

| File | Purpose |
|---|---|
| `proxy.ts` | Route protection — redirects to `/login` if no session |
| `app/(app)/layout.tsx` | Server-side auth guard + sidebar layout |
| `lib/api.ts` | Typed fetch wrapper for all backend calls |
| `lib/types.ts` | Shared TypeScript types (mirrors backend Pydantic schemas) |
| `components/generation/GenerationForm.tsx` | Main content generation form |
| `components/generation/ResultCard.tsx` | Displays generated text + image generation flow |
| `components/generation/ImageStylePicker.tsx` | 5-style picker grid |
| `components/ExportMenu.tsx` | PDF/DOCX download dropdown |
| `components/dashboard/DashboardCard.tsx` | Dashboard grid card with actions |
