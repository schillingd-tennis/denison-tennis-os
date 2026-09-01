-- Today Beta v0.1: manual recruit upcoming tournaments.

create table if not exists public.recruit_upcoming_tournaments (
  id uuid primary key default gen_random_uuid(),
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  tournament_name text not null,
  start_date date not null,
  end_date date,
  location text,
  event_type text,
  source text not null default 'MANUAL',
  source_url text,
  notes text,
  status text not null default 'UPCOMING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruit_upcoming_tournaments_status_valid check (
    status in ('UPCOMING', 'COMPLETED', 'CANCELLED')
  )
);

create index if not exists recruit_upcoming_tournaments_recruit_start_idx
  on public.recruit_upcoming_tournaments (recruit_person_id, start_date asc);

create index if not exists recruit_upcoming_tournaments_start_date_idx
  on public.recruit_upcoming_tournaments (start_date asc);

alter table public.recruit_upcoming_tournaments enable row level security;

drop policy if exists "Allow authenticated recruit upcoming tournament access"
  on public.recruit_upcoming_tournaments;
create policy "Allow authenticated recruit upcoming tournament access"
  on public.recruit_upcoming_tournaments for all to authenticated
  using (true) with check (true);

drop policy if exists "Allow anon recruit upcoming tournament read access"
  on public.recruit_upcoming_tournaments;
create policy "Allow anon recruit upcoming tournament read access"
  on public.recruit_upcoming_tournaments for select to anon using (true);

grant select on table public.recruit_upcoming_tournaments to anon;
grant select, insert, update, delete on table public.recruit_upcoming_tournaments to authenticated;
grant select, insert, update, delete on table public.recruit_upcoming_tournaments to service_role;

comment on table public.recruit_upcoming_tournaments is
  'Today Beta: manually tracked upcoming recruit tournaments.';
