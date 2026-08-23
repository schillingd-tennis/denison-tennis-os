-- Recruiting tournaments: recruiting-plan column + many-to-many recruit links.
--
-- recruiting_tournaments already stores the Coda-import subset (name, dates,
-- location, venue, surface, operational status, website, notes). This
-- migration does not invent CSV-only columns (hotel, timezone, organizer,
-- travel confirmation). Those wait on Tournaments.csv.

-- ---------------------------------------------------------------------------
-- 1. Recruiting plan (Traveling / Watching / Considering / Completed)
-- ---------------------------------------------------------------------------

alter table public.recruiting_tournaments
  add column if not exists recruiting_plan text;

update public.recruiting_tournaments
set recruiting_plan = case status
  when 'confirmed' then 'traveling'
  when 'completed' then 'completed'
  else 'watching'
end
where recruiting_plan is null;

alter table public.recruiting_tournaments
  alter column recruiting_plan set default 'watching';

alter table public.recruiting_tournaments
  alter column recruiting_plan set not null;

alter table public.recruiting_tournaments
  drop constraint if exists recruiting_tournaments_plan_valid;

alter table public.recruiting_tournaments
  add constraint recruiting_tournaments_plan_valid
  check (recruiting_plan in ('traveling', 'watching', 'considering', 'completed'));

comment on column public.recruiting_tournaments.recruiting_plan is
  'Coach recruiting intent: traveling | watching | considering | completed. Distinct from operational status.';

-- ---------------------------------------------------------------------------
-- 2. Join: tournament ↔ recruit Person (many-to-many)
-- ---------------------------------------------------------------------------

create table if not exists public.recruiting_tournament_recruits (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.recruiting_tournaments (id) on delete cascade,
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  attendance_status text not null default 'expected',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recruiting_tournament_recruits_pair_unique
    unique (tournament_id, recruit_person_id),
  constraint recruiting_tournament_recruits_attendance_valid check (
    attendance_status in ('expected', 'confirmed', 'watched')
  )
);

comment on table public.recruiting_tournament_recruits is
  'Many-to-many: a tournament can have many recruits; a recruit can attend many tournaments.';
comment on column public.recruiting_tournament_recruits.recruit_person_id is
  'Person id of a recruit (production_people). Do not create a second recruit identity.';

create index if not exists recruiting_tournament_recruits_tournament_id_idx
  on public.recruiting_tournament_recruits (tournament_id);

create index if not exists recruiting_tournament_recruits_recruit_person_id_idx
  on public.recruiting_tournament_recruits (recruit_person_id);

create or replace function public.set_recruiting_tournament_recruits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recruiting_tournament_recruits_updated_at
  on public.recruiting_tournament_recruits;
create trigger trg_recruiting_tournament_recruits_updated_at
  before update on public.recruiting_tournament_recruits
  for each row
  execute function public.set_recruiting_tournament_recruits_updated_at();

alter table public.recruiting_tournament_recruits enable row level security;

drop policy if exists "Allow all access" on public.recruiting_tournament_recruits;
create policy "Allow all access"
  on public.recruiting_tournament_recruits
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.recruiting_tournament_recruits
  to anon, authenticated;
