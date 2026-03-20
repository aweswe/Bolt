create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  content text not null,
  language text not null,
  version integer not null default 1,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(project_id, path)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists execution_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  logs jsonb not null default '[]'::jsonb,
  diagnostics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz
);

alter table projects enable row level security;
alter table project_files enable row level security;
alter table chat_messages enable row level security;
alter table execution_runs enable row level security;

create policy "project owner access" on projects
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "project files owner access" on project_files
  using (
    exists (
      select 1
      from projects p
      where p.id = project_files.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from projects p
      where p.id = project_files.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "chat owner access" on chat_messages
  using (
    exists (
      select 1
      from projects p
      where p.id = chat_messages.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from projects p
      where p.id = chat_messages.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "execution owner access" on execution_runs
  using (
    exists (
      select 1
      from projects p
      where p.id = execution_runs.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from projects p
      where p.id = execution_runs.project_id
        and p.owner_id = auth.uid()
    )
  );
