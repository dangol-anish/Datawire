-- Datawire RLS policies (recommended for production)
--
-- IMPORTANT:
-- - Review before running in production.
-- - This assumes tables from `docs/INVITES_SQL.md` exist.
-- - Run in Supabase SQL Editor.

-- 1) pipelines
alter table public.pipelines enable row level security;

drop policy if exists "pipelines_select_public" on public.pipelines;
create policy "pipelines_select_public"
on public.pipelines
for select
to anon
using (is_public = true);

drop policy if exists "pipelines_select_authenticated" on public.pipelines;
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

drop policy if exists "pipelines_insert_owner" on public.pipelines;
create policy "pipelines_insert_owner"
on public.pipelines
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pipelines_update_owner_or_editor" on public.pipelines;
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

drop policy if exists "pipelines_delete_owner" on public.pipelines;
create policy "pipelines_delete_owner"
on public.pipelines
for delete
to authenticated
using (user_id = auth.uid());

-- 2) pipeline_collaborators
alter table public.pipeline_collaborators enable row level security;

drop policy if exists "collaborators_select_owner_or_self" on public.pipeline_collaborators;
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

drop policy if exists "collaborators_modify_owner_only" on public.pipeline_collaborators;
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

-- 3) pipeline_access_requests
alter table public.pipeline_access_requests enable row level security;

drop policy if exists "requests_insert_self" on public.pipeline_access_requests;
create policy "requests_insert_self"
on public.pipeline_access_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "requests_select_owner_or_self" on public.pipeline_access_requests;
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

drop policy if exists "requests_update_owner_only" on public.pipeline_access_requests;
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

-- 4) pipeline_invites
alter table public.pipeline_invites enable row level security;

drop policy if exists "invites_insert_owner_only" on public.pipeline_invites;
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

-- Allow authenticated users to read invites for acceptance.
-- The app does not expose an API to list invites; acceptance looks up by token hash.
drop policy if exists "invites_select_authenticated" on public.pipeline_invites;
create policy "invites_select_authenticated"
on public.pipeline_invites
for select
to authenticated
using (true);

-- NOTE:
-- If your schema had `user_id` columns as text, use the previous version of this file (with ::text casts)
-- or run `docs/MIGRATE_USER_ID_TEXT_TO_UUID.sql` first, then apply this strict-uuid version.
