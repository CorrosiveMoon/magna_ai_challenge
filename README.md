# Magna AI — Content Marketing Suite

An AI-powered content marketing platform that generates blog posts, LinkedIn posts, ad copy, and emails — complete with matching images, a history dashboard, and a content improver.

Built for the Magna Labs challenge. Deployed and live.

---

## What it does

| Feature | Description |
|---|---|
| **AI Content Generator** | 4 content types with distinct prompt strategies (blog post, LinkedIn, ad copy, email) |
| **AI Image Generator** | Auto-built visual prompt from your content + 5 style options (photoreal, illustration, minimal, 3D, watercolor) |
| **Content History** | Paginated dashboard of all your generations with text + image thumbnails |
| **Content Improver** | Paste any text + pick a goal (shorter, more persuasive, SEO, formal, rewrite for audience) — returns improved text + bullet explanation |
| **PDF / DOCX Export** | Download any generation as a formatted document with embedded image |
| **Auth** | Supabase email/password auth with per-user RLS |

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│   Next.js 16 (Vercel)   │──JWT──▶│  FastAPI (Render)        │──────▶│  Gemini 2.5 Flash  │
│   - App Router          │        │  - /api/generate/text    │        │  (text generation) │
│   - Supabase SSR auth   │        │  - /api/generate/image   │        └────────────────────┘
│   - React Query         │        │  - /api/generations      │
│   - shadcn/ui           │        │  - /api/improve          │        ┌────────────────────┐
│   - Tailwind CSS v4     │        │  - /api/.../export       │──────▶│  OpenAI gpt-image-2│
└─────────────────────────┘        └──────────────┬───────────┘        │  (image generation)│
          │                                        │                    └────────────────────┘
          │                    ┌───────────────────┘
          ▼                    ▼
    ┌─────────────────────────────────────┐
    │  Supabase (cloud-hosted)            │
    │  - Auth (email/password)            │
    │  - Postgres: public.generations     │
    │  - Storage: generated-images bucket │
    └─────────────────────────────────────┘
```

**Why two services?** The backend/frontend split cleanly satisfies the "REST API Backend" scoring criterion and keeps all API keys server-side — the frontend never touches Gemini or OpenAI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, React Query, Supabase SSR |
| Backend | FastAPI, Python 3.11+, Pydantic v2, uvicorn |
| Text AI | Google Gemini 2.5 Flash (`google-genai`) |
| Image AI | OpenAI `gpt-image-2` |
| Database | Supabase Postgres (Row-Level Security) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (JWT verified server-side) |
| PDF Export | reportlab |
| DOCX Export | python-docx |
| Frontend hosting | Vercel |
| Backend hosting | Render (or Railway) |

---

## Do I need to run both services?

**Yes.** In development and production, both must be running:

- **Frontend** (`localhost:3000` / Vercel) — serves the UI
- **Backend** (`localhost:8000` / Render) — handles every AI call, database query, and auth check
- **Supabase** — always cloud-hosted; no local setup needed beyond env vars

In production, both deployments stay up simultaneously. On Render's free tier, the backend will cold-start after ~15 minutes of inactivity (first request takes ~30s). Warm it up before a demo by hitting the `/health` endpoint.

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Supabase project (free tier works)
- A Gemini API key (Google AI Studio)
- An OpenAI API key

### 1. Clone and set up

```bash
git clone https://github.com/your-username/magna-ai.git
cd magna-ai
```

### 2. Run the database migration

Open your Supabase project → SQL editor → paste and run `supabase/migrations/001_initial_schema.sql`.

Also create the storage bucket:
- Go to Supabase → Storage → New bucket
- Name: `generated-images`
- Public bucket: ✓

### 3. Start the backend

```bash
cd backend

# Create and activate virtual environment (first time only)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill in the env file
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
# → edit .env with your keys

# Start the dev server
venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend is now running at `http://localhost:8000`. Interactive API docs: `http://localhost:8000/docs`.

### 4. Start the frontend

```bash
cd frontend

npm install

# Fill in env (Supabase values already set if you copied from backend)
# Edit .env.local — NEXT_PUBLIC_API_BASE_URL should be http://localhost:8000

npm run dev
```

Frontend is now running at `http://localhost:3000`.

---

## Environment Variables

### Backend — `backend/.env`

```env
GEMINI_API_KEY=              # Google AI Studio — https://aistudio.google.com/apikey
OPENAI_API_KEY=              # OpenAI platform — https://platform.openai.com/api-keys
SUPABASE_URL=                # https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   # Settings → API → service_role key (never expose to frontend)
SUPABASE_ANON_KEY=           # Settings → API → anon public key
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
RATE_LIMIT_PER_MIN=20
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=    # same as SUPABASE_URL above
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # same as SUPABASE_ANON_KEY above
NEXT_PUBLIC_API_BASE_URL=    # http://localhost:8000 (dev) or https://your-backend.onrender.com (prod)
```

---

## API Reference

All endpoints require `Authorization: Bearer <supabase_access_token>` except `/health`.

### Text Generation

**`POST /api/generate/text`**
```json
// Request
{ "topic": "string", "tone": "string", "audience": "string", "content_type": "blog_post|linkedin_post|ad_copy|email" }

// Response
{ "id": "uuid", "title": "string|null", "body": "string", "content_type": "string", "metadata": {}, "created_at": "ISO8601" }
```

### Image Generation

**`POST /api/generate/image`**
```json
// Request
{ "generation_id": "uuid", "style": "photoreal|illustration|minimal|3d|watercolor" }

// Response
{ "id": "uuid", "image_url": "https://...supabase.co/...", "image_style": "string" }
```

### Generations (CRUD)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/generations?page=1&page_size=10` | Paginated list |
| `GET` | `/api/generations/{id}` | Single generation |
| `DELETE` | `/api/generations/{id}` | Delete + removes image from storage |
| `POST` | `/api/generations/{id}/export` | Export to PDF or DOCX — body: `{ "format": "pdf" }` |

### Content Improver

**`POST /api/improve`**
```json
// Request
{ "text": "string", "goal": "shorter|more_persuasive|more_formal|seo_optimized|rewrite_for_audience", "target_audience": "string (only for rewrite_for_audience)" }

// Response
{ "improved_text": "string", "changes": ["string", "..."] }
```

### Health

**`GET /health`** → `{ "status": "ok", "version": "1.0.0" }`

### Error shape (all endpoints)

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

---

## Deployment

> Both services must be deployed. They communicate over HTTPS using the Supabase JWT — no shared secrets between them beyond what's in each service's env vars.

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

### Step 2 — Deploy the backend to Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment**, add all keys from `backend/.env`
5. Deploy. Copy the service URL (e.g. `https://magna-ai-backend.onrender.com`)

> **Free tier note:** Render spins down inactive services after 15 min. Hit `/health` before recording demos to warm it up.

#### Alternative: Railway

1. **New Project** → deploy from GitHub
2. Set root to `backend/`
3. Railway auto-detects Python and sets `$PORT`
4. Add env vars in the Variables tab
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

### Step 3 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend`
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://evdyhhunnqirpnamddtq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = <your anon key>
   NEXT_PUBLIC_API_BASE_URL        = https://magna-ai-backend.onrender.com
   ```
5. Deploy. Copy the Vercel domain (e.g. `https://magna-ai.vercel.app`)

---

### Step 4 — Update CORS on the backend

Go back to Render → Environment and update:
```
ALLOWED_ORIGINS=https://magna-ai.vercel.app,http://localhost:3000
```

Redeploy (or let the env var change trigger a restart).

---

### Step 5 — Smoke test

```
https://magna-ai-backend.onrender.com/health   → { "status": "ok" }
https://magna-ai.vercel.app/login               → Login page loads
```

Sign up, generate a blog post, generate an image, export as PDF. If that all works — you're live.

---

## Project Structure

```
magna-ai/
├── frontend/                    # Next.js 16 → Vercel
│   ├── app/
│   │   ├── (app)/               # Protected routes (auth-gated)
│   │   │   ├── layout.tsx       # Sidebar + server-side auth check
│   │   │   ├── generate/        # Content generation form + results
│   │   │   ├── dashboard/       # Paginated history grid
│   │   │   ├── improve/         # Content improver
│   │   │   └── generations/[id] # Single generation detail + export
│   │   ├── login/               # Auth page (sign in / sign up)
│   │   └── layout.tsx           # Root layout with providers
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── nav/Sidebar.tsx
│   │   ├── generation/          # GenerationForm, ResultCard, ImageStylePicker
│   │   ├── dashboard/           # DashboardCard
│   │   └── ExportMenu.tsx
│   ├── lib/
│   │   ├── supabase/            # Browser + server Supabase clients
│   │   ├── api.ts               # Typed fetch wrapper (attaches JWT)
│   │   ├── types.ts             # Shared TypeScript types
│   │   └── utils.ts             # cn(), formatDate(), etc.
│   └── proxy.ts                 # Route protection (Next.js 16 Proxy)
│
├── backend/                     # FastAPI → Render
│   ├── app/
│   │   ├── main.py              # App setup, CORS, rate limiter, routers
│   │   ├── config.py            # Pydantic Settings
│   │   ├── auth.py              # Supabase JWT verification dependency
│   │   ├── deps.py              # Supabase admin client singleton
│   │   ├── routers/             # generate.py, generations.py, improve.py
│   │   ├── services/            # gemini_text, gemini_image, storage, export
│   │   └── prompts/             # Per-content-type system prompts
│   └── requirements.txt
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # generations table + RLS policies
│
├── plan.md
├── requirements.md
└── README.md
```

---

## Prompt Strategy

Each content type has a dedicated system prompt in `backend/app/prompts/` with format-specific structure:

| Type | Length | Key constraint |
|---|---|---|
| `blog_post` | 600–900 words | Title + intro hook + 3 H2 sections + conclusion + CTA |
| `linkedin_post` | 150–300 words | Hook line that stops the scroll + 3–5 hashtags |
| `ad_copy` | — | Headline (max 60 chars) + 2 body variants (benefit vs FOMO) + CTA |
| `email` | 150–250 words | Subject < 50 chars (no spam words) + preview text + single ask |

All prompts enforce JSON-only output via `response_mime_type="application/json"`.

---

## Cost Estimate (48h build + demo)

| | ~calls | ~cost |
|---|---|---|
| Text (Gemini 2.5 Flash) | 200 × 1.5k tokens | ~$0.75 |
| Images (OpenAI gpt-image-2) | 80 × $0.039 | ~$3.12 |
| **Total** | | **~$4** |
