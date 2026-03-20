# Bolt OS Blueprint

## 1) Architecture

- **apps/web**: Next.js App Router shell for chat, file tree, editor and preview panes.
- **packages/ui**: token source of truth for spacing, radius, type scale, and colors.
- **packages/ai**: multi-step orchestration (`plan -> generate -> execute -> fix -> refine`) with deterministic step outputs.
- **packages/backend**: Supabase access layer and DB contract.
- **packages/execution**: sandbox runtime abstraction and iframe adapter.

### Runtime contracts

1. UI sends prompt + project ID to AI orchestrator.
2. AI orchestrator returns step timeline + patch payload.
3. Backend persists files/messages/runs in Supabase.
4. Execution adapter runs file graph and returns diagnostics.
5. AI fix phase consumes diagnostics and emits patch refinement.

## 2) Database schema (Supabase)

- `projects`: ownership root.
- `project_files`: versioned path/content graph.
- `chat_messages`: all turns for replay.
- `execution_runs`: deterministic run history and diagnostics.

RLS policy model: only authenticated project owner can read/write all child records.

## 3) Design system

- 8px grid with hierarchy `[8,12,16,24,32]`.
- Typography tiers: display/h1/body/caption.
- Warm dark canvas with restrained blue primary accent.
- Surface layering and subtle border-only separators to reduce visual noise.

## 4) Delivery order

1. architecture contract
2. data layer
3. token system
4. static layout
5. interactive state
6. AI loop
7. execution engine
8. polish and instrumentation
