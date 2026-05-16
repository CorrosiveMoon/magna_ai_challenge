# Magna Labs Challenge — Build Plan

**Goal:** Ship a deployed, demoable AI Content Marketing Suite in 48 hours.

---

## 1. Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐         ┌────────────────────┐
│   Next.js (Vercel)  │ ──────► │  FastAPI (Render)    │ ──────► │  Gemini API        │
│   - App Router      │  HTTPS  │  - REST endpoints    │  HTTPS  │  - 2.5 Flash (text)│
│   - Supabase client │  +JWT   │  - Pydantic schemas  │         │  - 2.5 Flash Image │
│   - shadcn/ui       │         │  - Gemini SDK        │         └────────────────────┘
└─────────────────────┘         │  - Supabase admin    │
         │                       └──────────┬───────────┘
         │                                  │
         │           Supabase (Auth + Postgres + Storage)
         └──────────────────────────────────┘
                  - auth.users (managed)
                  - public.generations
                  - storage bucket: generated-images
```

**Key choices:**
- **Two-service split** keeps the FastAPI backend portable and matches the "REST API Backend" scoring criterion cleanly (no ambiguity vs. Next.js API routes counting as "backend").
- **Supabase Auth** is consumed by FastAPI via JWT verification — frontend gets the session, sends the access token in `Authorization: Bearer` header.
- **Supabase Storage** for image hosting — no S3 or Cloudinary needed.
- **Gemini single-vendor** for both text + image — one SDK, one key, one dashboard.

---

## 2. 48-Hour Timeline

### Hour 0–4 — Foundation
- Create GitHub repo (monorepo: `/frontend`, `/backend`)
- Provision: Supabase project, Gemini API key, Vercel project, Render service
- Run schema migration in Supabase SQL editor
- Scaffold Next.js + FastAPI projects, get "hello world" deployed on both platforms
- **Milestone:** Both deployed URLs respond. Auth works (login → dashboard placeholder)

### Hour 4–14 — Core Generation Loop
- FastAPI: `POST /api/generate/text` — implement all 4 content type prompts
- FastAPI: `POST /api/generate/image` — auto-prompt builder + Gemini image call + Supabase upload
- Next.js: Generation form UI (topic, tone, audience, type dropdown)
- Next.js: Results view (text + "Generate Image" button + display image)
- **Milestone:** Can generate text + image end-to-end from the UI

### Hour 14–24 — Persistence & Dashboard
- FastAPI: `GET /api/generations` (paginated) + `GET /api/generations/{id}` + `DELETE /api/generations/{id}`
- Save text on generation; save image URL after image step
- Next.js: Dashboard page with pagination, copy/download/delete actions
- RLS policies tested with two accounts
- **Milestone:** Full CRUD loop works, deployed

### Hour 24–32 — Content Improver
- FastAPI: `POST /api/improve` with 5 improvement goals
- Two-step prompt: (1) rewrite, (2) explain changes — chained
- Next.js: Improver page (textarea in, side-by-side result + explanation out)
- **Milestone:** Improver shipped + deployed

### Hour 32–40 — Bonus: PDF/DOC Export + Image Regenerate
- FastAPI: `POST /api/generations/{id}/export` with `format=pdf|docx`
- Use `reportlab` (PDF) and `python-docx` (DOCX), embed image
- Next.js: Export buttons in dashboard
- Image regenerate with style picker
- **Milestone:** All features complete, redeployed

### Hour 40–46 — Polish + Video
- README: setup steps, env vars, API docs, architecture note
- Run through all flows manually, fix obvious bugs
- Warm up backend, record 5–10 min walkthrough
- Show Claude Code sessions in video (have 2–3 clips ready from earlier)

### Hour 46–48 — Submission Buffer
- Final deploy
- Verify public access from incognito + another device
- Submit live URL + video + repo via portal

---

## 3. Data Model (Supabase / Postgres)

```sql
-- Generations table
create table public.generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('blog_post','linkedin_post','ad_copy','email')),
  topic        text not null,
  tone         text not null,
  audience     text not null,
  title        text,
  body         text not null,
  image_url    text,             -- null until image generated
  image_style  text,             -- 'photoreal' | 'illustration' | 'minimal' | '3d' | 'watercolor'
  image_prompt text,             -- the auto-built prompt, saved for debugging/regen
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

create index on public.generations (user_id, created_at desc);

-- RLS
alter table public.generations enable row level security;

create policy "users read own generations"  on public.generations
  for select using (auth.uid() = user_id);

create policy "users insert own generations" on public.generations
  for insert with check (auth.uid() = user_id);

create policy "users update own generations" on public.generations
  for update using (auth.uid() = user_id);

create policy "users delete own generations" on public.generations
  for delete using (auth.uid() = user_id);
```

**Storage:**
- Bucket name: `generated-images`
- Public read, authenticated write (writes happen via service role from backend)
- Path convention: `{user_id}/{generation_id}.png`

---

## 4. Backend Structure (FastAPI)

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, lifespan
│   ├── config.py               # Pydantic Settings, env vars
│   ├── auth.py                 # Supabase JWT verification dependency
│   ├── deps.py                 # Shared dependencies (supabase client, current_user)
│   ├── schemas/
│   │   ├── generation.py       # Pydantic models
│   │   └── improve.py
│   ├── services/
│   │   ├── gemini_text.py      # Text generation + prompts per type
│   │   ├── gemini_image.py     # Image generation + prompt builder
│   │   ├── storage.py          # Supabase Storage upload helper
│   │   └── export.py           # PDF + DOCX generators
│   ├── routers/
│   │   ├── generate.py         # /api/generate/text, /api/generate/image
│   │   ├── generations.py      # CRUD + export
│   │   └── improve.py
│   └── prompts/
│       ├── blog_post.py
│       ├── linkedin_post.py
│       ├── ad_copy.py
│       ├── email.py
│       └── improve.py
├── requirements.txt
└── README.md
```

**Key deps:** `fastapi`, `uvicorn`, `pydantic-settings`, `google-genai`, `supabase`, `python-jose[cryptography]`, `reportlab`, `python-docx`, `httpx`.

---

## 5. API Contract

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/generate/text` | ✓ | Generate text content |
| POST | `/api/generate/image` | ✓ | Generate image for an existing generation |
| GET | `/api/generations` | ✓ | List user's generations (paginated) |
| GET | `/api/generations/{id}` | ✓ | Get a single generation |
| DELETE | `/api/generations/{id}` | ✓ | Delete a generation (and its image) |
| POST | `/api/generations/{id}/export` | ✓ | Export to PDF or DOCX |
| POST | `/api/improve` | ✓ | Improve provided text |
| GET | `/health` | ✗ | Health check |

### Request/Response shapes

**POST /api/generate/text**
```json
// req
{
  "topic": "Sustainable fashion trends 2026",
  "tone": "professional",
  "audience": "Gen Z eco-conscious shoppers",
  "content_type": "linkedin_post"
}
// res
{
  "id": "uuid",
  "title": "...",
  "body": "...",
  "content_type": "linkedin_post",
  "created_at": "2026-05-15T..."
}
```

**POST /api/generate/image**
```json
// req
{ "generation_id": "uuid", "style": "photoreal" }   // style optional, defaults based on content_type
// res
{ "id": "uuid", "image_url": "https://...supabase.co/.../xxx.png", "image_style": "photoreal" }
```

**GET /api/generations?page=1&page_size=10**
```json
{
  "items": [ /* generation objects */ ],
  "page": 1,
  "page_size": 10,
  "total": 42
}
```

**POST /api/improve**
```json
// req
{
  "text": "...",
  "goal": "more_persuasive",
  "target_audience": "string, only if goal=rewrite_for_audience"
}
// res
{
  "improved_text": "...",
  "changes": ["Added urgency in opening", "Replaced passive voice", "..."]
}
```

**POST /api/generations/{id}/export**
```json
// req
{ "format": "pdf" }
// res
{ "download_url": "https://...signed-url..." }
```

**Error shape (all endpoints)**
```json
{ "error": { "code": "GEMINI_RATE_LIMIT", "message": "Try again in 30s" } }
```

---

## 6. Prompt Strategy (the 25-point lever)

The brief explicitly scores **"distinct prompt strategy per type"** — this is where to invest. Each content type gets its own system prompt with format-locked structure.

### Universal prefix (all types)
```
You are an expert content marketer. Output JSON only, matching the schema provided. No preamble, no markdown fences around the JSON.
```

### Blog Post
- **Structure:** title + intro hook + 3 H2 sections + conclusion + CTA
- **Length:** 600–900 words
- **System prompt focus:** "Optimize for engagement and shareability. Open with a question or surprising stat. Each section advances one idea. End with a clear next step."
- **Output schema:** `{title, body (markdown with H2s), meta_description}`

### LinkedIn Post
- **Structure:** strong hook line + 2–4 short paragraphs + hashtags
- **Length:** 150–300 words, line breaks for scannability
- **Focus:** "First line must stop the scroll. Use 'I' statements if tone is personal. Single CTA at end. 3–5 relevant hashtags."
- **Output schema:** `{body, hashtags: [string]}`

### Ad Copy
- **Structure:** headline (max 60 chars) + 2 body variants + 1 CTA
- **Focus:** "Sell the outcome, not the feature. Body variants test different angles (benefit-led vs. fear-of-missing-out). CTA is action-verb + value."
- **Output schema:** `{headline, body_variants: [string, string], cta}`

### Email
- **Structure:** subject line + preview text + greeting + body + sign-off + CTA
- **Length:** 150–250 words
- **Focus:** "Subject under 50 chars, no spam words ('free', 'urgent'). Preview complements subject, doesn't repeat. Personal tone. One ask per email."
- **Output schema:** `{subject, preview_text, body, cta_label, cta_url_placeholder}`

### Tone modifier
Injected into the system prompt: `Tone: {tone}. Adjust word choice, sentence rhythm, and formality accordingly.`

### Audience modifier
Injected: `Target audience: {audience}. Reference their context, pain points, and vocabulary.`

---

## 7. Image Prompt Auto-Builder

Called server-side after text generation. Pseudocode:

```
def build_image_prompt(topic, tone, content_type, style="photoreal"):
    style_directive = {
      "photoreal":    "professional photography, natural lighting, shallow depth of field",
      "illustration": "flat vector illustration, bold colors, clean lines",
      "minimal":      "minimalist composition, lots of whitespace, single focal subject",
      "3d":           "modern 3D render, soft shadows, isometric perspective",
      "watercolor":   "watercolor painting, soft edges, pastel palette",
    }[style]

    content_context = {
      "blog_post":     "editorial hero image suitable for an article header",
      "linkedin_post": "professional, on-brand social media image, square 1:1",
      "ad_copy":       "high-impact advertising visual, attention-grabbing",
      "email":         "warm, inviting header image for an email campaign",
    }[content_type]

    return (
        f"{content_context}. Subject: {topic}. "
        f"Mood matches tone '{tone}'. "
        f"Style: {style_directive}. "
        f"No text or typography in the image. High quality, 1024x1024."
    )
```

---

## 8. Frontend Structure (Next.js)

```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # auth guard, nav
│   │   ├── generate/page.tsx       # main generation form
│   │   ├── dashboard/page.tsx      # history grid
│   │   ├── improve/page.tsx        # text improver
│   │   └── generations/[id]/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn components
│   ├── GenerationForm.tsx
│   ├── ResultCard.tsx
│   ├── ImageStylePicker.tsx
│   └── ExportMenu.tsx
├── lib/
│   ├── supabase.ts                 # browser client
│   ├── api.ts                      # fetch wrapper, attaches JWT
│   └── types.ts
└── package.json
```

**Routing:**
- `/login` — Supabase Auth UI
- `/generate` — main form, lands here after login
- `/dashboard` — history
- `/improve` — content improver
- `/generations/[id]` — single view (also used for export trigger)

---

## 9. Claude Code Workflow Plan

Three sessions to capture for the video (15 pts):

1. **Architecture planning** (Hour 0–1)
   - Open Claude Code, paste the challenge brief
   - Have it lay out the file structure, generate the SQL migration, scaffold the FastAPI skeleton
   - Capture: the planning conversation + initial generated files

2. **Prompt iteration** (Hour 8–10)
   - Show iterating on a content type prompt — generate output, critique, refine
   - This directly maps to the "prompt strategy" scoring criterion
   - Capture: 2–3 iteration rounds in the terminal

3. **Debugging session** (whenever something breaks)
   - Pick a real bug — RLS misconfiguration, JWT validation, image upload failure
   - Show Claude Code diagnosing + fixing
   - Capture: error → diagnosis → patch → verification

**Tip:** Use `script` or terminal recorder (asciinema / OBS terminal capture) so you don't have to re-do these for the video.

---

## 10. Deployment Checklist

### Pre-flight (Hour 0)
- [ ] GitHub repo created, both folders pushed
- [ ] Supabase project + schema migrated
- [ ] Vercel project linked to repo, root = `/frontend`
- [ ] Render service linked, root = `/backend`, build = `pip install -r requirements.txt`, start = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Gemini API key in paid tier (otherwise image gen fails)

### Before video recording (Hour 44)
- [ ] All env vars set on Vercel + Render
- [ ] CORS allows the Vercel domain
- [ ] Hit `/health` to warm up the backend
- [ ] Test full flow in incognito with a fresh account
- [ ] README finalized

### Before submission (Hour 47)
- [ ] Live URL opens from a phone (mobile responsive check)
- [ ] Video uploaded (YouTube unlisted or Loom)
- [ ] GitHub repo public
- [ ] Architecture note attached if writing one

---

## 11. Video Script Outline (5–10 min)

1. **[0:00–0:30]** Intro — what the product does, stack overview
2. **[0:30–2:30]** Live demo: generate a blog post → generate matching image → save → view in dashboard
3. **[2:30–4:00]** Show all 4 content types side by side, highlight distinct outputs
4. **[4:00–5:00]** Content improver demo with explanation output
5. **[5:00–6:00]** Export to PDF demo
6. **[6:00–8:00]** Claude Code clips: architecture planning + prompt iteration + a debug
7. **[8:00–9:00]** Quick code walkthrough: show the prompt-per-type files, the FastAPI routes
8. **[9:00–9:30]** Wrap, mention what you'd build next (the optional architecture note's content)

---

## 12. Cost Estimate

Conservative estimate for 48h build + demo:
- Text generation: ~200 calls × ~1.5k output tokens avg = ~300k output tokens × $2.50/1M = **$0.75**
- Image generation: ~80 images × $0.039 = **$3.12**
- **Total: ~$4** — keep a $10 buffer on the Gemini account.

---

## 13. Monorepo Folder Structure

Single repo, two deployable roots. Vercel points to `/frontend`, Render points to `/backend`.

```
magna_ai/
├── frontend/                             # Next.js → Vercel
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                # auth guard + nav
│   │   │   ├── generate/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── improve/page.tsx
│   │   │   └── generations/[id]/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                           # shadcn components
│   │   ├── GenerationForm.tsx
│   │   ├── ResultCard.tsx
│   │   ├── ImageStylePicker.tsx
│   │   └── ExportMenu.tsx
│   ├── lib/
│   │   ├── supabase.ts                   # browser client
│   │   ├── api.ts                        # fetch wrapper, attaches JWT
│   │   └── types.ts
│   ├── .env.local
│   └── package.json
│
├── backend/                              # FastAPI → Render
│   ├── app/
│   │   ├── main.py                       # FastAPI app, CORS, lifespan
│   │   ├── config.py                     # Pydantic Settings, env vars
│   │   ├── auth.py                       # Supabase JWT verification dependency
│   │   ├── deps.py                       # Shared dependencies
│   │   ├── schemas/
│   │   │   ├── generation.py
│   │   │   └── improve.py
│   │   ├── services/
│   │   │   ├── gemini_text.py
│   │   │   ├── gemini_image.py
│   │   │   ├── storage.py
│   │   │   └── export.py
│   │   ├── routers/
│   │   │   ├── generate.py               # POST /api/generate/text|image
│   │   │   ├── generations.py            # CRUD + export
│   │   │   └── improve.py
│   │   └── prompts/
│   │       ├── blog_post.py
│   │       ├── linkedin_post.py
│   │       ├── ad_copy.py
│   │       ├── email.py
│   │       └── improve.py
│   ├── requirements.txt
│   └── .env
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # generations table + RLS (see §3)
│
├── plan.md
├── requirements.md
└── README.md
```
