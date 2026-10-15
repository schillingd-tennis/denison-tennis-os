create table if not exists public.recruiting_tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.recruiting_tournaments (id) on delete cascade,
  recruit_person_id text references public.production_people (id) on delete set null,
  participant_name text not null,
  events text[] not null default '{}',
  city text,
  state text,
  gender text,
  evaluation_status text not null default 'not_evaluated',
  overall_rating smallint,
  quick_tags text[] not null default '{}',
  evaluation_notes text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiting_tournament_participants_status_valid
    check (evaluation_status in ('not_evaluated', 'watch_list', 'evaluated')),
  constraint recruiting_tournament_participants_rating_valid
    check (overall_rating is null or overall_rating between 1 and 5)
);

create unique index if not exists recruiting_tournament_participants_name_unique
  on public.recruiting_tournament_participants (tournament_id, participant_name);
create index if not exists recruiting_tournament_participants_tournament_idx
  on public.recruiting_tournament_participants (tournament_id, participant_name);

drop trigger if exists trg_recruiting_tournament_participants_updated_at
  on public.recruiting_tournament_participants;
create trigger trg_recruiting_tournament_participants_updated_at
  before update on public.recruiting_tournament_participants
  for each row execute function public.set_recruiting_tournament_recruits_updated_at();

alter table public.recruiting_tournament_participants enable row level security;
drop policy if exists "Authenticated users can manage tournament participants"
  on public.recruiting_tournament_participants;
create policy "Authenticated users can manage tournament participants"
  on public.recruiting_tournament_participants for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on table public.recruiting_tournament_participants
  to authenticated, service_role;

comment on table public.recruiting_tournament_participants is
  'Event-specific tournament field and road evaluations; may optionally link to a canonical recruit Person.';
