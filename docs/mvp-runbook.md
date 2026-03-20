# MVP Runbook

## Required environment variables

Copy `.env.example` values into your runtime environment.

### Generation provider (primary)
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.

### Generation provider (fallback)
- `AI_GATEWAY_API_KEY`: API key for Vercel AI Gateway.
- `AI_GATEWAY_MODEL`: defaults to `anthropic/claude-3-5-sonnet`.

### Persistence
- `AI_GATEWAY_API_KEY`: API key for Vercel AI Gateway.
- `AI_GATEWAY_MODEL`: model route, default is `anthropic/claude-3-5-sonnet`.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key for server-side inserts.

## API flow

1. `POST /api/orchestrate`
2. Streams NDJSON events (`step`, `files`, `patch`, `execution`, `error`)
3. Writes generated files to Supabase when available.
4. Executes generated entry in sandbox adapter and emits execution logs.

## Provider selection behavior

1. Gemini (`GEMINI_API_KEY`) is attempted first.
2. Vercel AI Gateway (`AI_GATEWAY_API_KEY`) is attempted second.
3. Offline fallback template is used if no provider is reachable.

## What to configure next

- Replace `IframeSandboxAdapter` with real Sandpack or worker runtime.
- Replace placeholder editor block with Monaco.
- Add auth/session ownership and real project picker.
