-- Recruiting tournaments: events coaches plan to attend for recruiting.

create table if not exists public.recruiting_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  location text,
  venue text,
  surface text,
  status text not null default 'planned',
  website_url text,
  notes text,
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiting_tournaments_name_present check (length(trim(name)) > 0),
  constraint recruiting_tournaments_dates_valid check (
    start_date is null or end_date is null or end_date >= start_date
  ),
  constraint recruiting_tournaments_status_valid check (
    status in ('planned', 'confirmed', 'completed', 'cancelled')
  )
);

create index if not exists recruiting_tournaments_start_date_idx
  on public.recruiting_tournaments (start_date);

grant select, insert, update, delete on table public.recruiting_tournaments to authenticated;

alter table public.recruiting_tournaments enable row level security;

drop policy if exists "Authenticated users can read recruiting tournaments"
  on public.recruiting_tournaments;
create policy "Authenticated users can read recruiting tournaments"
  on public.recruiting_tournaments for select to authenticated using (true);

drop policy if exists "Authenticated users can create recruiting tournaments"
  on public.recruiting_tournaments;
create policy "Authenticated users can create recruiting tournaments"
  on public.recruiting_tournaments for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update recruiting tournaments"
  on public.recruiting_tournaments;
create policy "Authenticated users can update recruiting tournaments"
  on public.recruiting_tournaments for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete recruiting tournaments"
  on public.recruiting_tournaments;
create policy "Authenticated users can delete recruiting tournaments"
  on public.recruiting_tournaments for delete to authenticated using (true);

comment on table public.recruiting_tournaments is
  'Tournament calendar for recruiting travel; source_key supports repeatable Coda CSV imports.';
