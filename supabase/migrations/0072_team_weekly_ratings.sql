-- Weekly team-player rating acquisition and immutable rating history.
-- Extends the provider-neutral 0070 control plane without changing recruit jobs.

alter table public.tennis_data_jobs
  add column if not exists scope text not null default 'recruits';

alter table public.tennis_data_jobs
  drop constraint if exists tennis_data_jobs_scope_valid;

alter table public.tennis_data_jobs
  add constraint tennis_data_jobs_scope_valid
  check (scope in ('recruits', 'team'));

create table if not exists public.team_player_rating_snapshots (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references public.production_people(id) on delete restrict,
  provider text not null check (provider in ('utr', 'wtn')),
  rating numeric(5,2) not null,
  rating_date date not null,
  captured_at timestamptz not null default now(),
  external_player_id text,
  source_url text,
  job_id uuid references public.tennis_data_jobs(id) on delete set null,
  previous_rating numeric(5,2),
  rating_change numeric(5,2),
  status text not null default 'current' check (status in ('current', 'unchanged', 'review')),
  diagnostic text,
  created_at timestamptz not null default now(),
  constraint team_player_rating_snapshots_week_unique
    unique (person_id, provider, rating_date)
);

create index if not exists team_player_rating_snapshots_person_date_idx
  on public.team_player_rating_snapshots(person_id, rating_date desc, provider);

alter table public.team_player_rating_snapshots enable row level security;
grant select on public.team_player_rating_snapshots to authenticated;
grant all on public.team_player_rating_snapshots to service_role;

create policy "Authenticated can read team rating history"
  on public.team_player_rating_snapshots for select to authenticated using (true);

create or replace function public.record_team_player_rating(
  p_person_id text,
  p_provider text,
  p_rating numeric,
  p_rating_date date,
  p_external_player_id text default null,
  p_source_url text default null,
  p_job_id uuid default null,
  p_diagnostic text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_rating numeric;
  snapshot_id uuid;
begin
  if p_provider not in ('utr', 'wtn') then
    raise exception 'Unsupported rating provider';
  end if;
  if p_rating is null or p_rating <= 0 or (p_provider = 'utr' and p_rating > 16) then
    raise exception 'Invalid rating';
  end if;

  select case when p_provider = 'utr' then utr else wtn end
    into current_rating
  from public.production_people
  where id = p_person_id
  for update;

  if not found then raise exception 'Player not found'; end if;

  insert into public.team_player_rating_snapshots (
    person_id, provider, rating, rating_date, external_player_id, source_url,
    job_id, previous_rating, rating_change, status, diagnostic
  ) values (
    p_person_id, p_provider, round(p_rating, 2), p_rating_date,
    nullif(trim(p_external_player_id), ''), nullif(trim(p_source_url), ''),
    p_job_id, current_rating,
    case when current_rating is null then null else round(p_rating - current_rating, 2) end,
    case when current_rating is not null and round(p_rating, 2) = round(current_rating, 2)
      then 'unchanged' else 'current' end,
    nullif(trim(p_diagnostic), '')
  )
  on conflict (person_id, provider, rating_date) do update set
    rating = excluded.rating,
    captured_at = now(),
    external_player_id = excluded.external_player_id,
    source_url = excluded.source_url,
    job_id = excluded.job_id,
    rating_change = case when team_player_rating_snapshots.previous_rating is null then null
      else round(excluded.rating - team_player_rating_snapshots.previous_rating, 2) end,
    status = case when team_player_rating_snapshots.previous_rating is not null
      and excluded.rating = team_player_rating_snapshots.previous_rating
      then 'unchanged' else 'current' end,
    diagnostic = excluded.diagnostic
  returning id into snapshot_id;

  if p_provider = 'utr' then
    update public.production_people set utr = round(p_rating, 2), updated_at = now()
    where id = p_person_id;
  else
    update public.production_people set wtn = round(p_rating, 2), updated_at = now()
    where id = p_person_id;
  end if;

  return snapshot_id;
end;
$$;

revoke all on function public.record_team_player_rating(text, text, numeric, date, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_team_player_rating(text, text, numeric, date, text, text, uuid, text)
  to service_role;

create or replace function public.request_team_rating_job(p_provider text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  created_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_provider not in ('utr', 'wtn') then raise exception 'Unsupported provider'; end if;

  select id into existing_id from public.tennis_data_jobs
  where provider = p_provider and kind = 'rating' and scope = 'team'
    and status in ('queued', 'running')
  order by requested_at desc limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.tennis_data_jobs(provider, kind, scope, source, requested_by)
  values (p_provider, 'rating', 'team', 'manual', auth.uid())
  returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.request_team_rating_job(text) from public, anon;
grant execute on function public.request_team_rating_job(text) to authenticated;

-- Replace the 0070 claim function so a UTR team-rating job is queued once per
-- Eastern week after Wednesday 04:00. If the Mac sleeps, the next poll catches up.
create or replace function public.claim_tennis_data_job(
  p_provider text,
  p_worker_id text,
  p_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
  eastern_now timestamp := now() at time zone 'America/New_York';
  eastern_today date := (now() at time zone 'America/New_York')::date;
  eastern_week_start date := eastern_today - (extract(isodow from eastern_today)::integer - 1);
begin
  if p_provider not in ('utr', 'trn', 'wtn') then return null; end if;

  if p_provider = 'utr'
     and (
       extract(isodow from eastern_now)::integer > 3
       or (extract(isodow from eastern_now)::integer = 3 and eastern_now::time >= time '04:00')
     )
     and not exists (
       select 1 from public.tennis_data_jobs
       where provider = p_provider and kind = 'rating' and scope = 'team'
         and requested_at >= (eastern_week_start::timestamp at time zone 'America/New_York')
     ) then
    insert into public.tennis_data_jobs(provider, kind, scope, source)
    values (p_provider, 'rating', 'team', 'schedule')
    on conflict do nothing;
  end if;

  if eastern_now::time >= time '07:00'
     and exists (select 1 from public.tennis_data_workers where provider = p_provider
                 and auth_status not in ('reauth_required', 'not_configured'))
     and not exists (select 1 from public.tennis_data_jobs where provider = p_provider
                     and status in ('queued', 'running'))
     and not exists (select 1 from public.tennis_data_workers where provider = p_provider
                     and completed_day = eastern_today) then
    insert into public.tennis_data_jobs(provider, kind, scope, source)
    values (p_provider, 'results', 'recruits', 'schedule')
    on conflict do nothing;
  end if;

  select id into claimed_id from public.tennis_data_jobs
  where provider = p_provider and status = 'queued'
    and (lease_until is null or lease_until < now())
  order by requested_at for update skip locked limit 1;
  if claimed_id is null then return null; end if;

  update public.tennis_data_jobs
  set status = 'running', started_at = now(), lease_token = p_token,
      lease_until = now() + interval '10 minutes', error = null, updated_at = now()
  where id = claimed_id;
  update public.tennis_data_workers
  set worker_id = p_worker_id, last_started_at = now(), checked_count = 0, updated_at = now()
  where provider = p_provider;
  return claimed_id;
end;
$$;

revoke all on function public.claim_tennis_data_job(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_tennis_data_job(text, text, uuid) to service_role;

comment on table public.team_player_rating_snapshots is
  'Immutable weekly UTR/WTN observations for current Denison team players.';
