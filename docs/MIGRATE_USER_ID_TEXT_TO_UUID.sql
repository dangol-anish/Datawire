-- Datawire schema cleanup: migrate user_id columns from text -> uuid (and keep RLS working)
--
-- Your current schema has:
-- - public.pipelines.user_id: text (UUID strings)
-- - public.pipeline_collaborators.user_id: text (UUID strings)
--
-- This script:
-- 1) Drops RLS policies that depend on these columns (otherwise Postgres blocks the type change)
-- 2) Migrates the columns to uuid + adds FK constraints to auth.users(id)
-- 3) Recreates RLS policies (strict uuid version)
--
-- Safe to run only if all existing values are valid UUID strings.
--
-- Run in Supabase SQL editor as a single query.

begin;

-- Drop ALL RLS policies on affected tables.
-- Supabase UI or previous iterations may have created policies with different names
-- (e.g. "Users can read own pipelines"), and Postgres blocks type changes until those
-- policies are removed.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'pipelines',
        'pipeline_collaborators',
        'pipeline_access_requests',
        'pipeline_invites'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 1) pipelines.user_id text -> uuid
alter table public.pipelines
  drop constraint if exists pipelines_user_id_fkey;

alter table public.pipelines
  alter column user_id type uuid using (user_id::uuid);

alter table public.pipelines
  add constraint pipelines_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists pipelines_user_id_idx on public.pipelines (user_id);

-- 2) pipeline_collaborators.user_id text -> uuid
alter table public.pipeline_collaborators
  drop constraint if exists pipeline_collaborators_pkey;

drop index if exists public.pipeline_collaborators_user_id_idx;

alter table public.pipeline_collaborators
  alter column user_id type uuid using (user_id::uuid);

alter table public.pipeline_collaborators
  add constraint pipeline_collaborators_pkey primary key (pipeline_id, user_id);

alter table public.pipeline_collaborators
  drop constraint if exists pipeline_collaborators_user_id_fkey;

alter table public.pipeline_collaborators
  add constraint pipeline_collaborators_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists pipeline_collaborators_user_id_idx
  on public.pipeline_collaborators (user_id);

-- Re-enable RLS (no-op if already enabled)
alter table public.pipelines enable row level security;
alter table public.pipeline_collaborators enable row level security;
alter table public.pipeline_access_requests enable row level security;
alter table public.pipeline_invites enable row level security;

-- Recreate RLS policies (strict uuid version)
create policy "pipelines_select_public"
on public.pipelines
for select
to anon
using (is_public = true);

create policy "pipelines_select_authenticated"
on public.pipelines
for select
to authenticated
using (
  is_public = true
  or user_id = auth.uid()
  or exists (
    select 1 from public.pipeline_collaborators pc
    where pc.pipeline_id = pipelines.id
      and pc.user_id = auth.uid()
  )
);

create policy "pipelines_insert_owner"
on public.pipelines
for insert
to authenticated
with check (user_id = auth.uid());

create policy "pipelines_update_owner_or_editor"
on public.pipelines
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.pipeline_collaborators pc
    where pc.pipeline_id = pipelines.id
      and pc.user_id = auth.uid()
      and pc.role = 'editor'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.pipeline_collaborators pc
    where pc.pipeline_id = pipelines.id
      and pc.user_id = auth.uid()
      and pc.role = 'editor'
  )
);

create policy "pipelines_delete_owner"
on public.pipelines
for delete
to authenticated
using (user_id = auth.uid());

create policy "collaborators_select_owner_or_self"
on public.pipeline_collaborators
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.pipelines p
    where p.id = pipeline_collaborators.pipeline_id
      and p.user_id = auth.uid()
  )
);

create policy "collaborators_modify_owner_only"
on public.pipeline_collaborators
for all
to authenticated
using (
  exists (
    select 1 from public.pipelines p
    where p.id = pipeline_collaborators.pipeline_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.pipelines p
    where p.id = pipeline_collaborators.pipeline_id
      and p.user_id = auth.uid()
  )
);

create policy "requests_insert_self"
on public.pipeline_access_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "requests_select_owner_or_self"
on public.pipeline_access_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.pipelines p
    where p.id = pipeline_access_requests.pipeline_id
      and p.user_id = auth.uid()
  )
);

create policy "requests_update_owner_only"
on public.pipeline_access_requests
for update
to authenticated
using (
  exists (
    select 1 from public.pipelines p
    where p.id = pipeline_access_requests.pipeline_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.pipelines p
    where p.id = pipeline_access_requests.pipeline_id
      and p.user_id = auth.uid()
  )
);

create policy "invites_insert_owner_only"
on public.pipeline_invites
for insert
to authenticated
with check (
  exists (
    select 1 from public.pipelines p
    where p.id = pipeline_invites.pipeline_id
      and p.user_id = auth.uid()
  )
);

create policy "invites_select_authenticated"
on public.pipeline_invites
for select
to authenticated
using (true);

commit;
