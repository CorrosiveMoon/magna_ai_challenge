# Magna Labs Challenge — Requirements

**Project:** AI Content Marketing Suite
**Timeline:** 48 hours
**Stack:** Next.js (frontend) + FastAPI (backend) + Supabase (Auth + Postgres + Storage) + Gemini (LLM + image)

---

## 1. Functional Requirements

### FR-1: AI Content Generator (25 pts — LLM & Prompt Quality)
- User inputs: `topic`, `tone`, `target_audience`, `content_type`
- `content_type` must support **4 types**: `blog_post`, `linkedin_post`, `ad_copy`, `email` (brief requires ≥3, ship 4 for safety margin)
- Each type has a **distinct system prompt** with format-specific structure (see `plan.md` §6)
- Output is polished, ready-to-publish text returned as structured JSON: `{title, body, metadata}`
- Generation must complete in <15s end-to-end

### FR-2: AI Image Generator — Per Post (20 pts)
- One-click generation after text is created
- Backend **auto-builds the visual prompt** from `topic + tone + content_type` (no user prompt input on first generation)
- Calls **Gemini 2.5 Flash Image** (`gemini-2.5-flash-image`)
- Image rendered alongside the text
- Regenerate button with **style picker** (photoreal, illustration, minimal, 3D render, watercolor) — required for regenerate UX, also covers the "image style picker" bonus implicitly
- Image saved to Supabase Storage; URL stored with the generation record

### FR-3: Content History & Dashboard (15 pts — Frontend/UI)
- Dashboard lists all generations for the logged-in user
- Each entry shows: text preview, paired image, content type, timestamp
- Actions per entry: **view**, **copy text**, **download image**, **export to PDF/DOC**, **delete**
- **Pagination**: 10 per page, server-side
- Fast load: <1s for first paint on cached navigation

### FR-4: AI Content Improver
- User pastes existing text + selects improvement goal: `shorter`, `more_persuasive`, `more_formal`, `seo_optimized`, `rewrite_for_audience`
- For `rewrite_for_audience`, user provides target audience as a free-text field
- Returns: `{improved_text, explanation_of_changes}`
- Explanation is a short bullet list (3–5 items), not a paragraph

### FR-5: REST API Backend (20 pts)
- **All AI calls server-side.** Frontend never touches Gemini directly.
- Clean REST conventions, documented in README
- See `plan.md` §5 for the full endpoint contract
- All endpoints return consistent error shape: `{error: {code, message, details?}}`
- Rate limiting per user (simple in-memory or Supabase-backed counter)

### FR-6: Claude Code Workflow (15 pts)
- Use Claude Code throughout development
- Record at minimum: 1 architecture planning session, 1 debugging session, 1 prompt-iteration session
- Show these in the video walkthrough

### FR-7 (Bonus): Export to PDF/DOC (+ up to 10 pts)
- From dashboard entry → "Export" button → choose PDF or DOCX
- PDF includes: title, body text, embedded generated image, timestamp
- DOCX same content, generated server-side
- Returns a download URL or streams the file

---

## 2. Non-Functional Requirements

### Performance
- Text generation: p95 <15s
- Image generation: p95 <20s
- Dashboard load: <1s after initial auth
- Backend cold start (Render/Railway free tier): acceptable up to 30s, warn user via loading state

### Security
- All Gemini API keys server-side only
- Supabase service role key never exposed to frontend (only anon key for auth)
- Row-Level Security (RLS) on `generations` table — users see only their own data
- FastAPI validates Supabase JWT on every protected endpoint
- CORS locked to deployed frontend domain in production

### Reliability
- Graceful failure on Gemini API errors (retry once, then user-facing error)
- Image generation failure does not block text save — text is persisted before image is requested

### Deployment
- Frontend: **Vercel**
- Backend: **Render** or **Railway** (FastAPI service)
- DB + Storage + Auth: **Supabase** (cloud-hosted)
- Live URL stays publicly accessible **for at least 7 days post-submission**

### Code Quality
- Backend: Python 3.11+, FastAPI, Pydantic models for request/response
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui
- README with: setup, env vars, API docs (auto-generated from FastAPI `/docs` OpenAPI is acceptable + a manual summary), architecture note
- One-page architecture note (optional submission item — worth doing)

---

## 3. Out of Scope (Explicit)

To prevent scope creep during 48h:

- ❌ Brand voice settings (skipped — only PDF/DOC bonus is in scope)
- ❌ Multi-user collaboration / sharing
- ❌ Scheduled posting / actual publishing to social platforms
- ❌ Analytics / engagement tracking
- ❌ A/B testing of generated content
- ❌ Streaming responses (use blocking requests — simpler, fits the 48h)
- ❌ Mobile-native app (responsive web only)
- ❌ Image editing / variations beyond regenerate-with-style
- ❌ Custom Gemini fine-tuning

---

## 4. Environment Variables

### Backend (`.env`)
```
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
ALLOWED_ORIGINS=http://localhost:3000,https://<your-vercel-domain>
RATE_LIMIT_PER_MIN=20
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

---

## 5. Acceptance Criteria (Testable)

| ID | Criterion |
|----|-----------|
| AC-1 | User can sign up via Supabase Auth (email or Google OAuth) and reach the dashboard |
| AC-2 | User can generate text for all 4 content types; each produces format-appropriate output |
| AC-3 | "Generate Image" button produces an image within 20s and pairs it with the text on screen |
| AC-4 | Regenerating with a different style returns a visibly different image |
| AC-5 | Dashboard shows past generations, paginated, with text + image |
| AC-6 | Content improver returns improved text + a bulleted explanation of changes |
| AC-7 | All Gemini calls happen server-side (verifiable via browser network tab — no `generativelanguage.googleapis.com` calls) |
| AC-8 | User can export any generation to PDF and DOCX with the image embedded |
| AC-9 | Deployed app is reachable from a public URL |
| AC-10 | README documents setup, env vars, and API endpoints |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini image API rate limits during demo | Use paid tier from day 1, ~$5 budget covers everything |
| Render/Railway cold starts hurt demo | Hit the backend with a warm-up ping before recording video |
| Supabase RLS misconfigured → users see others' data | Test with 2 accounts before deploy |
| Scope creep on UI polish | Use shadcn/ui defaults — do not custom-design components |
| Video runs over 10 min | Script the walkthrough beforehand; rehearse once |
| 48h timer pressure on bonus | PDF/DOC export is the last task; cut if running out of time |
