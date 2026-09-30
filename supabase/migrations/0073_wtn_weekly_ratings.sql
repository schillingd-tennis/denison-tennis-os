-- Enable the provider-neutral worker to schedule WTN team ratings weekly.
-- WTN currently records the current singles rating in production_people.wtn.

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

  if p_provider in ('utr', 'wtn')
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

  -- Recruit result acquisition is currently implemented only for UTR.
  if p_provider = 'utr'
     and eastern_now::time >= time '07:00'
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
