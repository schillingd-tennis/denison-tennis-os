-- Central recruit interaction history. One record is shared by the Recruiting
-- directory and the Communications / Interactions workspace on a Recruit.
create table if not exists public.recruiting_interactions (
  id uuid primary key default gen_random_uuid(),
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  tournament_id uuid references public.recruiting_tournaments (id) on delete set null,
  occurred_at timestamptz not null,
  interaction_type text not null,
  channel text,
  direction text,
  participants text,
  notes text,
  next_steps text,
  logged_by text,
  source_system text,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiting_interactions_type_valid check (
    interaction_type in ('call', 'text', 'email', 'message', 'visit', 'meeting', 'note', 'other')
  ),
  constraint recruiting_interactions_direction_valid check (
    direction is null or direction in ('inbound', 'outbound', 'two_way', 'unknown')
  ),
  constraint recruiting_interactions_source_unique unique (source_system, source_key)
);

create index if not exists recruiting_interactions_recruit_date_idx
  on public.recruiting_interactions (recruit_person_id, occurred_at desc);
create index if not exists recruiting_interactions_tournament_idx
  on public.recruiting_interactions (tournament_id)
  where tournament_id is not null;

create or replace function public.set_recruiting_interactions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recruiting_interactions_updated_at on public.recruiting_interactions;
create trigger trg_recruiting_interactions_updated_at
  before update on public.recruiting_interactions
  for each row execute function public.set_recruiting_interactions_updated_at();

alter table public.recruiting_interactions enable row level security;
drop policy if exists "Allow authenticated interaction access" on public.recruiting_interactions;
create policy "Allow authenticated interaction access"
  on public.recruiting_interactions for all to authenticated
  using (true) with check (true);
drop policy if exists "Allow anon interaction read access" on public.recruiting_interactions;
create policy "Allow anon interaction read access"
  on public.recruiting_interactions for select to anon using (true);

grant select on table public.recruiting_interactions to anon;
grant select, insert, update, delete on table public.recruiting_interactions to authenticated;
grant select, insert, update, delete on table public.recruiting_interactions to service_role;

comment on table public.recruiting_interactions is
  'Canonical interaction history shared by Recruiting and each Recruit workspace.';
