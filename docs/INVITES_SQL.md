# Invitation System — Required Supabase Tables

This repo implements an **invite-link** collaboration model (viewer/editor) using NextAuth for login and Supabase Postgres for persistence.

These tables are required in your Supabase database for the invite system to work.

## 1) `pipeline_collaborators`

Stores per-user access to a pipeline.

```sql
create table if not exists public.pipeline_collaborators (
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pipeline_id, user_id)
);

create index if not exists pipeline_collaborators_user_id_idx
  on public.pipeline_collaborators (user_id);
```

## 2) `pipeline_invites`

Reusable invite links. Stores only a **hash** of the raw token.

```sql
create table if not exists public.pipeline_invites (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  created_by uuid not null,
  role text not null check (role in ('viewer', 'editor')),
  token_hash text not null unique,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_invites_pipeline_id_idx
  on public.pipeline_invites (pipeline_id);
```

## 3) `pipeline_access_requests`

Viewers can request editor access; the owner can approve/deny.

```sql
create table if not exists public.pipeline_access_requests (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  user_id uuid not null,
  requested_role text not null check (requested_role in ('editor')),
  status text not null check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, user_id, status)
);

create index if not exists pipeline_access_requests_pipeline_id_idx
  on public.pipeline_access_requests (pipeline_id);
```

Notes:
- This app currently uses `SUPABASE_SERVICE_ROLE_KEY` on the server, so RLS is bypassed. You can still add RLS later.
- `created_by` and `user_id` are expected to be **Supabase Auth UUIDs** (the app maps NextAuth logins to Supabase UUIDs).

