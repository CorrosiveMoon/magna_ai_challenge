# Magna AI — Content Marketing Suite

AI-powered content generation platform. Write blog posts, LinkedIn posts, ad copy, and email campaigns in seconds — with matching images, a history dashboard, and a content improver.

**Live:** [magna-ai.vercel.app](https://magna-ai.vercel.app) · **API docs:** [magna-ai-backend.onrender.com/docs](https://magna-ai-backend.onrender.com/docs)

---

## Features

- **4 content types** — blog post, LinkedIn post, ad copy, email — each with a distinct prompt strategy and output schema
- **AI image generation** — auto-built visual prompt from your content; 5 style options (photoreal, illustration, minimal, 3D render, watercolor)
- **Content improver** — rewrite for a specific goal (shorter, more persuasive, formal, SEO-optimised, or new audience) with a bullet explanation of every change
- **Dashboard** — paginated history of all generations with thumbnail previews, copy, download, and delete
- **PDF / DOCX export** — formatted document with embedded image, generated server-side
- **Auth** — Supabase email/password with per-user Row-Level Security

---

## Architecture

```
┌──────────────────────────┐   HTTPS + JWT   ┌─────────────────────────────┐
│   Next.js 16  (Vercel)   │ ─────────────▶  │   FastAPI  (Render)         │
│                          │                  │                             │
│  - App Router            │                  │  /api/generate/text         │
│  - Supabase SSR auth     │                  │  /api/generate/image        │
│  - React Query           │                  │  /api/generations (CRUD)    │
│  - shadcn/ui + Tailwind  │                  │  /api/improve               │
└──────────────────────────┘                  │  /api/generations/{id}/     │
            │                                 │    export                   │
            │                                 └────────────┬────────────────┘
            │                                              │
            │                              ┌───────────────┼───────────────┐
            │                              ▼               ▼               ▼
            │                       Gemini 2.5        OpenAI          Supabase
            │                       Flash             gpt-image-2     Storage
            │                       (text)            (images)        (image files)
            │
            ▼
      Supabase Auth + Postgres
      public.generations (RLS)
```

The frontend never contacts an AI provider directly — all keys live server-side in the FastAPI service. The Supabase JWT issued at login is forwarded in the `Authorization` header and verified by the backend on every request.

---

## Stack

| | |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, React Query, Supabase SSR |
| **Backend** | FastAPI, Python 3.11, Pydantic v2, uvicorn, slowapi |
| **Text AI** | Google Gemini 2.5 Flash (`google-genai`) |
| **Image AI** | OpenAI `gpt-image-2` |
| **Database** | Supabase Postgres with Row-Level Security |
| **File storage** | Supabase Storage (`generated-images` bucket) |
| **Auth** | Supabase Auth — JWT verified server-side via `supabase.auth.get_user()` |
| **Export** | reportlab (PDF), python-docx (DOCX) |

---

## Local Development

### Prerequisites

- Node.js 20+, npm
- Python 3.11+
- A [Supabase](https://supabase.com) project
- [Gemini API key](https://aistudio.google.com/apikey) (Google AI Studio)
- [OpenAI API key](https://platform.openai.com/api-keys)

### Database setup

In your Supabase project → **SQL Editor**, run the migration:

```sql
-- supabase/migrations/001_initial_schema.sql
```

Then create the storage bucket: **Storage → New bucket → `generated-images` → Public**.

### Backend

```bash
cd backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# Create .env (see Environment Variables below)

venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

npm install

# Fill in frontend/.env.local (see Environment Variables below)

npm run dev
```

App at `http://localhost:3000`.

---

## Environment Variables

### `backend/.env`

```env
GEMINI_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=                  # https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=     # service_role secret — never sent to the browser
SUPABASE_ANON_KEY=
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_PER_MIN=20
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## API Reference

Every protected endpoint requires `Authorization: Bearer <supabase_access_token>`.

### POST `/api/generate/text`

```json
// request
{
  "topic": "Sustainable fashion trends 2026",
  "tone": "Professional",
  "audience": "Gen Z eco-conscious shoppers",
  "content_type": "linkedin_post"
}

// response
{
  "id": "uuid",
  "title": "string | null",
  "body": "string",
  "content_type": "linkedin_post",
  "metadata": {},
  "created_at": "2026-05-16T10:00:00Z"
}
```

`content_type` — `blog_post` · `linkedin_post` · `ad_copy` · `email`

---

### POST `/api/generate/image`

```json
// request
{ "generation_id": "uuid", "style": "photoreal" }

// response
{ "id": "uuid", "image_url": "https://...supabase.co/...", "image_style": "photoreal" }
```

`style` — `photoreal` · `illustration` · `minimal` · `3d` · `watercolor`

The image prompt is auto-built server-side from the generation's topic, tone, and content type.

---

### GET `/api/generations`

```
?page=1&page_size=10
```

```json
{
  "items": [ /* generation objects */ ],
  "page": 1,
  "page_size": 10,
  "total": 42
}
```

---

### GET `/api/generations/{id}`
### DELETE `/api/generations/{id}`

Delete also removes the image from Supabase Storage. Returns `204 No Content`.

---

### POST `/api/generations/{id}/export`

```json
// request
{ "format": "pdf" }
```

Streams the file directly. `Content-Disposition: attachment; filename="generation-{id}.pdf"`.

`format` — `pdf` · `docx`

---

### POST `/api/improve`

```json
// request
{
  "text": "...",
  "goal": "more_persuasive",
  "target_audience": "required only when goal=rewrite_for_audience"
}

// response
{
  "improved_text": "...",
  "changes": [
    "Added urgency in the opening line",
    "Replaced passive constructions with active voice",
    "Strengthened the CTA with a concrete value proposition"
  ]
}
```

`goal` — `shorter` · `more_persuasive` · `more_formal` · `seo_optimized` · `rewrite_for_audience`

---

### GET `/health`

Unauthenticated. Returns `{ "status": "ok", "version": "1.0.0" }`. Use this to warm up the backend before a demo.

---

### Error shape

All errors use a consistent envelope:

```json
{ "error": { "code": "GEMINI_RATE_LIMIT", "message": "Try again in 30s" } }
```

---

## Prompt Strategy

Each content type has its own system prompt in `backend/app/prompts/` that enforces a specific JSON output schema. Gemini is called with `response_mime_type="application/json"` to guarantee parseable responses.

| Type | Length | Format |
|---|---|---|
| `blog_post` | 600–900 words | Title + intro hook + 3 H2 sections + conclusion + CTA |
| `linkedin_post` | 150–300 words | Scroll-stopping hook line + short paragraphs + 3–5 hashtags |
| `ad_copy` | — | Headline ≤60 chars + 2 body variants (benefit-led vs. FOMO) + CTA |
| `email` | 150–250 words | Subject ≤50 chars + preview text + body + single CTA |

Tone and audience are injected as modifiers into every prompt.

---

## Deployment

### Backend → Render

1. **New Web Service** → connect repo → **Root Directory:** `backend`
2. **Runtime:** Python 3 · **Build:** `pip install -r requirements.txt` · **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add all `backend/.env` keys under **Environment**
4. Deploy → copy the service URL

**Railway alternative:** same settings; Railway auto-detects Python and injects `$PORT`.

### Frontend → Vercel

1. **Add New Project** → import repo → **Root Directory:** `frontend`
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_API_BASE_URL   →  https://your-backend.onrender.com
   ```
4. Deploy → copy the Vercel domain

### After both are deployed

Update `ALLOWED_ORIGINS` in the backend's environment to include your Vercel domain, then redeploy:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

---

## Project Structure

```
magna-ai/
├── frontend/                        # Next.js 16 → Vercel
│   ├── app/
│   │   ├── (app)/                   # Auth-gated routes
│   │   │   ├── layout.tsx           # Sidebar + server-side auth check
│   │   │   ├── generate/page.tsx    # Generation form + live result
│   │   │   ├── dashboard/page.tsx   # Paginated history grid
│   │   │   ├── improve/page.tsx     # Content improver
│   │   │   └── generations/[id]/page.tsx
│   │   ├── login/page.tsx
│   │   └── layout.tsx               # Root layout + providers
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── nav/Sidebar.tsx
│   │   ├── generation/              # GenerationForm, ResultCard, ImageStylePicker
│   │   ├── dashboard/DashboardCard.tsx
│   │   └── ExportMenu.tsx
│   ├── lib/
│   │   ├── supabase/                # Browser + server Supabase clients
│   │   ├── api.ts                   # Typed fetch wrapper (attaches JWT)
│   │   ├── types.ts                 # TypeScript types mirroring backend schemas
│   │   └── utils.ts
│   └── proxy.ts                     # Route protection (Next.js 16)
│
├── backend/                         # FastAPI → Render
│   ├── app/
│   │   ├── main.py                  # App, CORS, rate limiter, routers
│   │   ├── auth.py                  # JWT verification via Supabase admin client
│   │   ├── routers/                 # generate.py · generations.py · improve.py
│   │   ├── services/                # gemini_text · gemini_image · storage · export
│   │   └── prompts/                 # Per-content-type system prompts
│   └── requirements.txt
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql   # generations table + RLS policies
```
