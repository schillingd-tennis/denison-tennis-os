-- Denison's UTR Power 6 team rating, captured with each team UTR run.

create table if not exists public.team_utr_power_6_snapshots (
  id uuid primary key default gen_random_uuid(),
  rating numeric(5,2) not null check (rating > 0 and rating <= 96),
  rating_date date not null unique,
  captured_at timestamptz not null default now(),
  source_url text not null,
  job_id uuid references public.tennis_data_jobs(id) on delete set null,
  diagnostic text,
  created_at timestamptz not null default now()
);

alter table public.team_utr_power_6_snapshots enable row level security;
grant select on public.team_utr_power_6_snapshots to authenticated;
grant all on public.team_utr_power_6_snapshots to service_role;

create policy "Authenticated can read Denison Power 6 history"
  on public.team_utr_power_6_snapshots for select to authenticated using (true);

create or replace function public.record_team_utr_power_6(
  p_rating numeric,
  p_rating_date date,
  p_source_url text,
  p_job_id uuid default null,
  p_diagnostic text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare snapshot_id uuid;
begin
  if p_rating is null or p_rating <= 0 or p_rating > 96 then
    raise exception 'Invalid Power 6 rating';
  end if;

  insert into public.team_utr_power_6_snapshots (
    rating, rating_date, source_url, job_id, diagnostic
  ) values (
    round(p_rating, 2), p_rating_date, p_source_url, p_job_id,
    nullif(trim(p_diagnostic), '')
  )
  on conflict (rating_date) do update set
    rating = excluded.rating,
    captured_at = now(),
    source_url = excluded.source_url,
    job_id = excluded.job_id,
    diagnostic = excluded.diagnostic
  returning id into snapshot_id;

  return snapshot_id;
end;
$$;

revoke all on function public.record_team_utr_power_6(numeric, date, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_team_utr_power_6(numeric, date, text, uuid, text)
  to service_role;

-- User-confirmed baseline from the Denison UTR college page on 2026-09-30.
insert into public.team_utr_power_6_snapshots (
  rating, rating_date, source_url, diagnostic
) values (
  68.17, date '2026-09-30', 'https://app.utrsports.net/college/2070?tab=info',
  'user_confirmed_baseline'
)
on conflict (rating_date) do nothing;

comment on table public.team_utr_power_6_snapshots is
  'Dated history of Denison men''s UTR Power 6 rating captured with team UTR checks.';
