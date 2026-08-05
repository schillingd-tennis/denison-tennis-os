-- BP-025A — Normalize Person Roles & Statuses.
--
-- Roles and statuses become first-class lookup tables. production_people
-- stores role_id / status_id foreign keys. Legacy text status + roles[]
-- columns are migrated then dropped.
--
-- Fixed UUIDs match src/features/lookups/seed.ts.

-- ---------------------------------------------------------------------------
-- 1. Lookup tables
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.statuses (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

comment on table public.roles is
  'Program role lookup (BP-025A). Consumed by People and future modules.';
comment on table public.statuses is
  'Program status lookup (BP-025A). Independent of role — never inferred from role.';

insert into public.roles (id, key, label, sort_order, active) values
  ('a1000000-0000-4000-8000-000000000001', 'player',  'Player',  1, true),
  ('a1000000-0000-4000-8000-000000000002', 'coach',   'Coach',   2, true),
  ('a1000000-0000-4000-8000-000000000003', 'recruit', 'Recruit', 3, true),
  ('a1000000-0000-4000-8000-000000000004', 'alumni',  'Alumni',  4, true),
  ('a1000000-0000-4000-8000-000000000005', 'staff',   'Staff',   5, true),
  ('a1000000-0000-4000-8000-000000000006', 'family',  'Family',  6, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.statuses (id, key, label, sort_order, active) values
  ('b1000000-0000-4000-8000-000000000001', 'current', 'Current', 1, true),
  ('b1000000-0000-4000-8000-000000000002', 'former',  'Former',  2, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- 2. Add FK columns on production_people
-- ---------------------------------------------------------------------------

alter table public.production_people
  add column if not exists role_id uuid references public.roles (id);

alter table public.production_people
  add column if not exists status_id uuid references public.statuses (id);

-- ---------------------------------------------------------------------------
-- 3. Migrate legacy status → status_id (alumni → former)
-- ---------------------------------------------------------------------------

update public.production_people
set status_id = 'b1000000-0000-4000-8000-000000000001'
where status_id is null
  and status = 'current';

update public.production_people
set status_id = 'b1000000-0000-4000-8000-000000000002'
where status_id is null
  and status in ('alumni', 'former');

-- Any unexpected leftover status defaults to Current.
update public.production_people
set status_id = 'b1000000-0000-4000-8000-000000000001'
where status_id is null;

-- ---------------------------------------------------------------------------
-- 4. Migrate legacy roles[] → single role_id (priority collapse)
-- ---------------------------------------------------------------------------

-- Coach wins over other roles when multi-valued (e.g. alumni+coach).
update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000002'
where role_id is null
  and roles is not null
  and 'coach' = any (roles);

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000005'
where role_id is null
  and roles is not null
  and 'staff' = any (roles);

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000003'
where role_id is null
  and roles is not null
  and 'recruit' = any (roles);

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000001'
where role_id is null
  and roles is not null
  and 'player' = any (roles);

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000004'
where role_id is null
  and roles is not null
  and 'alumni' = any (roles);

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000006'
where role_id is null
  and roles is not null
  and 'family' = any (roles);

-- Rows with empty roles: infer from legacy status only as a last resort for
-- migration (Player+Current / Alumni+Former). Runtime never infers again.
update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000004'
where role_id is null
  and status in ('alumni', 'former');

update public.production_people
set role_id = 'a1000000-0000-4000-8000-000000000001'
where role_id is null;

-- ---------------------------------------------------------------------------
-- 5. Enforce NOT NULL + drop legacy columns
-- ---------------------------------------------------------------------------

alter table public.production_people
  alter column role_id set not null;

alter table public.production_people
  alter column status_id set not null;

alter table public.production_people
  drop constraint if exists production_people_status_check;

alter table public.production_people
  drop constraint if exists production_people_roles_valid;

drop index if exists public.production_people_roles_gin;

alter table public.production_people
  drop column if exists status;

alter table public.production_people
  drop column if exists roles;

create index if not exists production_people_role_id_idx
  on public.production_people (role_id);

create index if not exists production_people_status_id_idx
  on public.production_people (status_id);

comment on column public.production_people.role_id is
  'FK to roles — what the person is in the program (BP-025A).';
comment on column public.production_people.status_id is
  'FK to statuses — lifecycle state; never derived from role (BP-025A).';

-- ---------------------------------------------------------------------------
-- 6. Privileges (match 0005 pattern)
-- ---------------------------------------------------------------------------

grant select on table public.roles to anon, authenticated;
grant select on table public.statuses to anon, authenticated;
