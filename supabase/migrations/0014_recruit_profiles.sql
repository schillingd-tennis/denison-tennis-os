-- BP-043C — Recruiting schema foundation.
--
-- Person tennis/school current facts on production_people.
-- Classification lookups + recruit_profiles (1:1 with production_people).
-- Does not import Coda rows, create analytics tables, or change existing People data.

-- ---------------------------------------------------------------------------
-- 1. Person tennis / school columns (current facts; not Coda analytics)
-- ---------------------------------------------------------------------------

alter table public.production_people
  add column if not exists trn_rank numeric;

alter table public.production_people
  add column if not exists trn_star_rating integer;

alter table public.production_people
  add column if not exists trn_url text;

alter table public.production_people
  add column if not exists utr_url text;

alter table public.production_people
  add column if not exists utr_matches_played integer;

alter table public.production_people
  add column if not exists video_url text;

alter table public.production_people
  add column if not exists high_school text;

alter table public.production_people
  drop constraint if exists production_people_trn_star_rating_valid;

alter table public.production_people
  add constraint production_people_trn_star_rating_valid
  check (trn_star_rating is null or trn_star_rating in (3, 4, 5));

alter table public.production_people
  drop constraint if exists production_people_utr_matches_played_nonnegative;

alter table public.production_people
  add constraint production_people_utr_matches_played_nonnegative
  check (utr_matches_played is null or utr_matches_played >= 0);

comment on column public.production_people.trn_rank is
  'Raw TennisRecruiting.net ranking (lower is better). Not calculated TR Rank (BP-043C).';

comment on column public.production_people.trn_star_rating is
  'TennisRecruiting.net star rating: 3, 4, or 5 (BP-043C).';

comment on column public.production_people.trn_url is
  'TennisRecruiting.net profile URL (BP-043C).';

comment on column public.production_people.utr_url is
  'UTR profile URL (BP-043C).';

comment on column public.production_people.utr_matches_played is
  'UTR match volume used as analytics input later; not Reliability (BP-043C).';

comment on column public.production_people.video_url is
  'Player video URL (BP-043C).';

comment on column public.production_people.high_school is
  'Origin high school. Lives on Person, not Recruit Profile (BP-043B / BP-043C).';

-- ---------------------------------------------------------------------------
-- 2. Classification / evaluation / admissions lookup tables
-- ---------------------------------------------------------------------------

create table if not exists public.recruit_types (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_pipeline_stages (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_interests (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_outcomes (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_priorities (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_getabilities (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.recruit_preread_statuses (
  id uuid primary key,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

comment on table public.recruit_types is
  'Recruit type lookup (BP-043C). Independent of pipeline, interest, and outcome.';
comment on table public.recruit_pipeline_stages is
  'Recruiting pipeline lookup (BP-043C). Independent of recruit type, interest, and outcome.';
comment on table public.recruit_interests is
  'Recruit interest lookup (BP-043C). Not contact state and not outcome.';
comment on table public.recruit_outcomes is
  'Recruiting outcome lookup (BP-043C). Null on recruit_profiles means none.';
comment on table public.recruit_priorities is
  'Coach priority lookup (BP-043C). Not calculated Tier.';
comment on table public.recruit_getabilities is
  'Coach getability lookup (BP-043C). Not a scoring input.';
comment on table public.recruit_preread_statuses is
  'Admissions preread color lookup (BP-043C).';

-- Fixed UUIDs match src/features/recruiting/lookupSeed.ts

insert into public.recruit_types (id, key, label, sort_order, active) values
  ('c1100000-0000-4000-8000-000000000001', 'high_school',    'High School',    1, true),
  ('c1100000-0000-4000-8000-000000000002', 'transfer',       'Transfer',       2, true),
  ('c1100000-0000-4000-8000-000000000003', 'international',  'International',  3, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_pipeline_stages (id, key, label, sort_order, active) values
  ('c1200000-0000-4000-8000-000000000001', 'potential',  'Potential',      1, true),
  ('c1200000-0000-4000-8000-000000000002', 'active',     'Active Recruit', 2, true),
  ('c1200000-0000-4000-8000-000000000003', 'committed',  'Committed',      3, true),
  ('c1200000-0000-4000-8000-000000000004', 'closed',     'Closed',         4, true),
  ('c1200000-0000-4000-8000-000000000005', 'unknown',    'Unknown',        5, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_interests (id, key, label, sort_order, active) values
  ('c1300000-0000-4000-8000-000000000001', 'high',     'High',     1, true),
  ('c1300000-0000-4000-8000-000000000002', 'medium',   'Medium',   2, true),
  ('c1300000-0000-4000-8000-000000000003', 'low',      'Low',      3, true),
  ('c1300000-0000-4000-8000-000000000004', 'unknown',  'Unknown',  4, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_outcomes (id, key, label, sort_order, active) values
  ('c1400000-0000-4000-8000-000000000001', 'committed_denison',    'Committed to Denison',  1, true),
  ('c1400000-0000-4000-8000-000000000002', 'committed_elsewhere',  'Committed Elsewhere',   2, true),
  ('c1400000-0000-4000-8000-000000000003', 'no_longer_recruiting', 'No Longer Recruiting',  3, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_priorities (id, key, label, sort_order, active) values
  ('c1500000-0000-4000-8000-000000000001', 'elite',         '1 - Elite',         1, true),
  ('c1500000-0000-4000-8000-000000000002', 'significant',   '2 - Significant',   2, true),
  ('c1500000-0000-4000-8000-000000000003', 'potential',     '3 - Potential',     3, true),
  ('c1500000-0000-4000-8000-000000000004', 'probably_not',  '4 - Probably Not',  4, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_getabilities (id, key, label, sort_order, active) values
  ('c1600000-0000-4000-8000-000000000001', 'highly_likely',  '1 - Highly Likely',  1, true),
  ('c1600000-0000-4000-8000-000000000002', 'great_chance',   '2 - Great Chance',   2, true),
  ('c1600000-0000-4000-8000-000000000003', 'have_a_chance',  '3 - Have a Chance',  3, true),
  ('c1600000-0000-4000-8000-000000000004', 'unlikely',       '4 - Unlikely',       4, true),
  ('c1600000-0000-4000-8000-000000000005', 'no_chance',      '5 - No Chance',      5, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.recruit_preread_statuses (id, key, label, sort_order, active) values
  ('c1700000-0000-4000-8000-000000000001', 'green',  'Green',  1, true),
  ('c1700000-0000-4000-8000-000000000002', 'yellow', 'Yellow', 2, true)
on conflict (id) do update set
  key = excluded.key,
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = excluded.active;

grant select on table public.recruit_types to anon, authenticated;
grant select on table public.recruit_pipeline_stages to anon, authenticated;
grant select on table public.recruit_interests to anon, authenticated;
grant select on table public.recruit_outcomes to anon, authenticated;
grant select on table public.recruit_priorities to anon, authenticated;
grant select on table public.recruit_getabilities to anon, authenticated;
grant select on table public.recruit_preread_statuses to anon, authenticated;

alter table public.recruit_types enable row level security;
alter table public.recruit_pipeline_stages enable row level security;
alter table public.recruit_interests enable row level security;
alter table public.recruit_outcomes enable row level security;
alter table public.recruit_priorities enable row level security;
alter table public.recruit_getabilities enable row level security;
alter table public.recruit_preread_statuses enable row level security;

drop policy if exists "Allow anon read access" on public.recruit_types;
create policy "Allow anon read access" on public.recruit_types
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_pipeline_stages;
create policy "Allow anon read access" on public.recruit_pipeline_stages
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_interests;
create policy "Allow anon read access" on public.recruit_interests
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_outcomes;
create policy "Allow anon read access" on public.recruit_outcomes
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_priorities;
create policy "Allow anon read access" on public.recruit_priorities
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_getabilities;
create policy "Allow anon read access" on public.recruit_getabilities
  for select to anon, authenticated using (true);

drop policy if exists "Allow anon read access" on public.recruit_preread_statuses;
create policy "Allow anon read access" on public.recruit_preread_statuses
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. recruit_profiles (1:1 with Person)
-- ---------------------------------------------------------------------------

create table if not exists public.recruit_profiles (
  id uuid primary key default gen_random_uuid(),
  person_id text not null unique references public.production_people (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  recruit_type_id uuid references public.recruit_types (id),
  pipeline_stage_id uuid references public.recruit_pipeline_stages (id),
  interest_id uuid references public.recruit_interests (id),
  outcome_id uuid references public.recruit_outcomes (id),

  coda_pipeline_stage text,
  coda_interest text,

  priority_id uuid references public.recruit_priorities (id),
  getability_id uuid references public.recruit_getabilities (id),
  focus boolean,

  gpa text,
  sat integer,
  act integer,
  academic_interests text,

  preread_status_id uuid references public.recruit_preread_statuses (id),
  preread_scholarship_amount numeric,

  schools_of_interest text,
  school_chosen text,
  notes text,
  game_notes text,
  key_pitch_angle text,

  coda_row_id text unique,
  coda_export jsonb
);

comment on table public.recruit_profiles is
  'One recruiting profile per Person (BP-043C). Not a second identity.';

comment on column public.recruit_profiles.person_id is
  'FK to production_people.id. Unique — one Recruit Profile per Person.';

comment on column public.recruit_profiles.coda_pipeline_stage is
  'Lossless Coda Pipeline Stage string. Normalized value lives on pipeline_stage_id.';

comment on column public.recruit_profiles.coda_interest is
  'Lossless Coda Interest string (overloaded in source). Normalized value lives on interest_id.';

comment on column public.recruit_profiles.preread_scholarship_amount is
  'Expected scholarship from admissions/financial preread. External input; not calculated.';

comment on column public.recruit_profiles.coda_row_id is
  'Primary Coda row id for this Person. Extra duplicate Coda rows stay in coda_export / import audit later.';

comment on column public.recruit_profiles.coda_export is
  'Complete original Coda export row as JSON. Do not normalize this payload.';

create or replace function public.set_recruit_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recruit_profiles_updated_at on public.recruit_profiles;
create trigger trg_recruit_profiles_updated_at
  before update on public.recruit_profiles
  for each row
  execute function public.set_recruit_profiles_updated_at();

alter table public.recruit_profiles enable row level security;

grant select on table public.recruit_profiles to anon, authenticated;
grant insert, update, delete on table public.recruit_profiles to authenticated;

drop policy if exists "Allow anon read access" on public.recruit_profiles;
create policy "Allow anon read access"
  on public.recruit_profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow authenticated insert access" on public.recruit_profiles;
create policy "Allow authenticated insert access"
  on public.recruit_profiles
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow authenticated update access" on public.recruit_profiles;
create policy "Allow authenticated update access"
  on public.recruit_profiles
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow authenticated delete access" on public.recruit_profiles;
create policy "Allow authenticated delete access"
  on public.recruit_profiles
  for delete
  to authenticated
  using (true);
