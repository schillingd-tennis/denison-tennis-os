-- BP-021 — People Foundation: Person roles.
--
-- Adds a multi-role model (`roles text[]`) and optional `title` without
-- overloading `status` / `player_status`. Backfills roles from existing
-- status for rows that predate this migration.
--
-- People (including coaches) come from the Airtable import / seed pipeline —
-- this migration does not hard-code coach Person rows.
--
-- Safe to re-run: column adds are guarded; backfill only fills empty roles;
-- existing production_people rows are never deleted.

-- ---------------------------------------------------------------------------
-- 1. Schema: roles + title
-- ---------------------------------------------------------------------------

alter table public.production_people
  add column if not exists roles text[] not null default '{}';

alter table public.production_people
  add column if not exists title text;

alter table public.production_people
  drop constraint if exists production_people_roles_valid;

alter table public.production_people
  add constraint production_people_roles_valid
  check (
    roles <@ array['player', 'coach', 'alumni', 'staff']::text[]
  );

comment on column public.production_people.roles is
  'PersonRole values (player|coach|alumni|staff). Multi-valued; not derived from status/player_status.';

comment on column public.production_people.title is
  'Optional job/coaching title from Airtable (e.g. Head Coach). Displayed via PersonRoleBadge.';

create index if not exists production_people_roles_gin
  on public.production_people using gin (roles);

-- ---------------------------------------------------------------------------
-- 2. Backfill roles from status (only where still empty)
-- ---------------------------------------------------------------------------

update public.production_people
set roles = array['player']::text[]
where status = 'current'
  and (roles is null or roles = '{}'::text[]);

update public.production_people
set roles = array['alumni']::text[]
where status = 'alumni'
  and (roles is null or roles = '{}'::text[]);

comment on table public.production_people is
  'Production Person records for the People domain (Team nav /team). Mirrors src/features/people/types.ts.';
