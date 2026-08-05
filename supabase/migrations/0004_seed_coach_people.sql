-- BP-021 — Development seed: David Schilling + Andy Mackler as Person rows.
--
-- Temporary seed for local/staging testing until Airtable Title + id sync is
-- fully settled. Uses reserved stable ids that the import pipeline reuses
-- (scripts/import/knownPeople.ts) so later imports update these rows instead
-- of creating player-* duplicates.
--
-- Verified fields only (from Airtable Players.csv). Unknown fields left null.
-- Safe to re-run. Does not delete unrelated people; removes only the legacy
-- player-* ids for these two if they were created by an earlier import.

-- Ensure roles/title columns exist (no-op if 0003 already applied).
alter table public.production_people
  add column if not exists roles text[] not null default '{}';

alter table public.production_people
  add column if not exists title text;

-- David Schilling — Head Coach
insert into public.production_people (
  id,
  created_at,
  updated_at,
  status,
  roles,
  title,
  first_name,
  last_name,
  date_of_birth,
  cell_phone,
  denison_email,
  city,
  state,
  country,
  denison_id,
  relationships
)
values (
  'person-david-schilling',
  '2026-07-22T07:11:00.000Z',
  now(),
  'current',
  array['coach']::text[],
  'Head Coach',
  'David',
  'Schilling',
  '1967-03-27',
  '(614) 886-3558',
  'schillingd@denison.edu',
  'Columbus',
  'OH',
  'USA',
  'D01224395',
  '[]'::jsonb
)
on conflict (id) do update set
  status = excluded.status,
  roles = excluded.roles,
  title = excluded.title,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  date_of_birth = coalesce(excluded.date_of_birth, public.production_people.date_of_birth),
  cell_phone = coalesce(excluded.cell_phone, public.production_people.cell_phone),
  denison_email = coalesce(excluded.denison_email, public.production_people.denison_email),
  city = coalesce(excluded.city, public.production_people.city),
  state = coalesce(excluded.state, public.production_people.state),
  country = coalesce(excluded.country, public.production_people.country),
  denison_id = coalesce(excluded.denison_id, public.production_people.denison_id),
  updated_at = now();

-- Andy Mackler — Assistant Coach (also alumni player in Airtable)
insert into public.production_people (
  id,
  created_at,
  updated_at,
  status,
  roles,
  title,
  first_name,
  last_name,
  date_of_birth,
  cell_phone,
  denison_email,
  city,
  state,
  country,
  major,
  minor,
  denison_id,
  player_status,
  relationships
)
values (
  'person-andy-mackler',
  '2026-01-08T06:43:00.000Z',
  now(),
  'alumni',
  array['alumni', 'coach']::text[],
  'Assistant Coach',
  'Andy',
  'Mackler',
  '2001-09-28',
  '(407) 994-3266',
  'mackle_a1@denison.edu',
  'Lake Mary',
  'FL',
  'USA',
  'HESS',
  'Global Health',
  'D01926981',
  'graduated',
  '[]'::jsonb
)
on conflict (id) do update set
  status = excluded.status,
  roles = excluded.roles,
  title = excluded.title,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  date_of_birth = coalesce(excluded.date_of_birth, public.production_people.date_of_birth),
  cell_phone = coalesce(excluded.cell_phone, public.production_people.cell_phone),
  denison_email = coalesce(excluded.denison_email, public.production_people.denison_email),
  city = coalesce(excluded.city, public.production_people.city),
  state = coalesce(excluded.state, public.production_people.state),
  country = coalesce(excluded.country, public.production_people.country),
  major = coalesce(excluded.major, public.production_people.major),
  minor = coalesce(excluded.minor, public.production_people.minor),
  denison_id = coalesce(excluded.denison_id, public.production_people.denison_id),
  player_status = coalesce(excluded.player_status, public.production_people.player_status),
  updated_at = now();

-- Drop legacy import ids for these two so Team filters never show duplicates.
delete from public.production_people
where id in ('player-david-schilling', 'player-andy-mackler');
