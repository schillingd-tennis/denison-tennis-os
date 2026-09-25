-- Provider-neutral control plane for external tennis data acquisition.
-- Acquisition happens in an outbound worker; the hosted app never connects to localhost.

create table public.tennis_data_workers (
  provider text primary key check (provider in ('utr', 'trn', 'wtn')),
  worker_id text,
  heartbeat_at timestamptz,
  auth_status text not null default 'unknown'
    check (auth_status in ('unknown', 'valid', 'reauth_required', 'not_configured', 'error')),
  last_error text,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  completed_day date,
  checked_count integer not null default 0 check (checked_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.tennis_data_workers (provider, auth_status)
values
  ('utr', 'unknown'),
  ('trn', 'not_configured'),
  ('wtn', 'not_configured');

create table public.tennis_data_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('utr', 'trn', 'wtn')),
  kind text not null default 'results' check (kind in ('results', 'profile', 'rating')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'partial', 'auth_required', 'error')),
  source text not null default 'manual' check (source in ('manual', 'schedule', 'retry')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  checked_count integer not null default 0 check (checked_count >= 0),
  total_count integer not null default 0 check (total_count >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tennis_data_jobs_one_active_per_provider
  on public.tennis_data_jobs (provider)
  where status in ('queued', 'running');

create index tennis_data_jobs_provider_requested_idx
  on public.tennis_data_jobs (provider, requested_at desc);

alter table public.tennis_data_workers enable row level security;
alter table public.tennis_data_jobs enable row level security;

grant select on public.tennis_data_workers to authenticated;
grant select on public.tennis_data_jobs to authenticated;
grant all on public.tennis_data_workers to service_role;
grant all on public.tennis_data_jobs to service_role;

create policy "Authenticated can read tennis data workers"
  on public.tennis_data_workers for select to authenticated using (true);
create policy "Authenticated can read tennis data jobs"
  on public.tennis_data_jobs for select to authenticated using (true);

create function public.request_tennis_data_job(
  p_provider text,
  p_kind text default 'results'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  created_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_provider not in ('utr', 'trn', 'wtn') then
    raise exception 'Unsupported provider';
  end if;
  if p_kind not in ('results', 'profile', 'rating') then
    raise exception 'Unsupported acquisition kind';
  end if;

  select id into existing_id
  from public.tennis_data_jobs
  where provider = p_provider and status in ('queued', 'running')
  order by requested_at desc
  limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.tennis_data_jobs (provider, kind, source, requested_by)
  values (p_provider, p_kind, 'manual', auth.uid())
  returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.request_tennis_data_job(text, text) from public, anon;
grant execute on function public.request_tennis_data_job(text, text) to authenticated;

create function public.claim_tennis_data_job(
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
  eastern_today date := (now() at time zone 'America/New_York')::date;
begin
  if p_provider not in ('utr', 'trn', 'wtn') then return null; end if;

  if (now() at time zone 'America/New_York')::time >= time '07:00'
     and exists (
       select 1 from public.tennis_data_workers
       where provider = p_provider and auth_status not in ('reauth_required', 'not_configured')
     )
     and not exists (
       select 1 from public.tennis_data_jobs
       where provider = p_provider and status in ('queued', 'running')
     )
     and not exists (
       select 1 from public.tennis_data_workers
       where provider = p_provider and completed_day = eastern_today
     ) then
    insert into public.tennis_data_jobs (provider, kind, source)
    values (p_provider, 'results', 'schedule')
    on conflict do nothing;
  end if;

  select id into claimed_id
  from public.tennis_data_jobs
  where provider = p_provider
    and status = 'queued'
    and (lease_until is null or lease_until < now())
  order by requested_at
  for update skip locked
  limit 1;

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

comment on table public.tennis_data_workers is
  'Provider heartbeats and authentication health for outbound tennis-data workers.';
comment on table public.tennis_data_jobs is
  'Durable provider-neutral queue for UTR, Tennis Recruiting, and WTN acquisition.';
