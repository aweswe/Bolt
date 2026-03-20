# Bolt OS MVP (Bolt.new-style builder)

A monorepo prototype for prompt-to-app generation with a streamed reasoning loop, persisted project state, and execution logs.

## Current stage

**Stage: MVP Alpha (buildable, not production-hardened).**

What works now:
- Prompt -> streamed NDJSON events (`step`, `files`, `patch`, `execution`, `error`) via `POST /api/orchestrate`.
- AI provider chain: Gemini (`gemini-2.5-flash`) -> Vercel AI Gateway -> offline fallback.
- Best-effort persistence of chat/files/runs to Supabase (when env + schema are configured).
- Sandbox execution adapter returning deterministic logs/status payload.

What is not finished yet:
- Monaco editor integration (current panel is a code view placeholder).
- Real browser/worker runtime (current execution adapter is a minimal iframe simulation).
- Auth and tenant-scoped project picker in the frontend.
- CI test suite and full production observability.

## Monorepo structure

- `apps/web` - Next.js App Router UI + API routes
- `packages/ai` - multi-step orchestration + provider integration
- `packages/backend` - Supabase helpers + schema
- `packages/execution` - runtime adapter abstraction
- `packages/ui` - design tokens

## Quick start

1. Install dependencies

```bash
pnpm install
```

2. Configure env

```bash
cp .env.example .env
```

Set at least one generation provider:
- Preferred: `GEMINI_API_KEY` (+ optional `GEMINI_MODEL=gemini-2.5-flash`)
- Optional fallback: `AI_GATEWAY_API_KEY` (+ optional `AI_GATEWAY_MODEL`)

For persistence, also set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

3. (Optional but recommended) apply Supabase schema
- Run `packages/backend/supabase/schema.sql` in your Supabase SQL editor.

4. Run web app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Import repo into Vercel.
2. Set **Root Directory** to `apps/web` (or configure monorepo build accordingly).
3. Add environment variables from `.env.example`.
4. Ensure Supabase schema has been applied.
5. Deploy.

## Is it ready to build apps now?

**Yes for MVP experimentation**, where you want to:
- prompt for a starter app,
- inspect generated files,
- see streamed orchestration state,
- and run basic execution logs.

**Not yet for production-grade reliability** without the unfinished items above.

## API contract (`/api/orchestrate`)

Request body:

```json
{
  "projectId": "uuid",
  "prompt": "Build a dashboard app"
}
```

NDJSON response events:
- `step`
- `files`
- `patch`
- `execution`
- `error`

## Notes

If provider/network access is blocked, the system falls back to an offline template response so the UI flow still works end-to-end.
