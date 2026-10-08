-- Durable operational alerts for browser-backed OS automations.

create table public.automation_alerts (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  severity text not null check (severity in ('warning', 'critical')),
  code text not null,
  provider text check (provider is null or provider in ('utr', 'trn', 'wtn')),
  job_id uuid references public.tennis_data_jobs(id) on delete set null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create unique index automation_alerts_open_fingerprint_idx
  on public.automation_alerts(fingerprint) where resolved_at is null;
create index automation_alerts_recent_idx
  on public.automation_alerts(last_seen_at desc);

alter table public.automation_alerts enable row level security;
grant select on public.automation_alerts to authenticated;
grant all on public.automation_alerts to service_role;
create policy "Authenticated can read automation alerts"
  on public.automation_alerts for select to authenticated using (true);

create or replace function public.evaluate_automation_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_row public.tennis_data_workers%rowtype;
  job_row public.tennis_data_jobs%rowtype;
  alert_fingerprint text;
begin
  for worker_row in select * from public.tennis_data_workers loop
    alert_fingerprint := 'worker_offline:' || worker_row.provider;
    if worker_row.heartbeat_at is null or worker_row.heartbeat_at < now() - interval '2 minutes' then
      update public.automation_alerts set last_seen_at = now(), details = jsonb_build_object('heartbeat_at', worker_row.heartbeat_at)
        where fingerprint = alert_fingerprint and resolved_at is null;
      if not found then
        insert into public.automation_alerts(fingerprint, severity, code, provider, message, details)
        values (alert_fingerprint, 'critical', 'worker_offline', worker_row.provider,
          upper(worker_row.provider) || ' worker heartbeat is stale or missing.',
          jsonb_build_object('heartbeat_at', worker_row.heartbeat_at));
      end if;
    else
      update public.automation_alerts set resolved_at = now(), last_seen_at = now()
        where fingerprint = alert_fingerprint and resolved_at is null;
    end if;

    alert_fingerprint := 'provider_auth:' || worker_row.provider;
    if worker_row.auth_status in ('reauth_required', 'not_configured', 'error') then
      update public.automation_alerts set last_seen_at = now(), message = coalesce(worker_row.last_error,
        upper(worker_row.provider) || ' requires authentication or configuration.')
        where fingerprint = alert_fingerprint and resolved_at is null;
      if not found then
        insert into public.automation_alerts(fingerprint, severity, code, provider, message, details)
        values (alert_fingerprint, 'critical', 'provider_auth', worker_row.provider,
          coalesce(worker_row.last_error, upper(worker_row.provider) || ' requires authentication or configuration.'),
          jsonb_build_object('auth_status', worker_row.auth_status));
      end if;
    else
      update public.automation_alerts set resolved_at = now(), last_seen_at = now()
        where fingerprint = alert_fingerprint and resolved_at is null;
    end if;
  end loop;

  update public.automation_alerts alert
    set resolved_at = now(), last_seen_at = now()
    where alert.resolved_at is null and alert.code like 'job_%'
      and not exists (
        select 1 from (
          select distinct on (provider, kind, scope) * from public.tennis_data_jobs
          order by provider, kind, scope, requested_at desc
        ) latest
        where latest.id = alert.job_id
          and ((latest.status = 'queued' and latest.requested_at < now() - interval '5 minutes')
            or (latest.status = 'running' and latest.updated_at < now() - interval '3 minutes')
            or latest.status in ('error', 'auth_required', 'partial'))
      );

  for job_row in
    select * from (
      select distinct on (provider, kind, scope) * from public.tennis_data_jobs
      order by provider, kind, scope, requested_at desc
    ) latest
    where (status = 'queued' and requested_at < now() - interval '5 minutes')
       or (status = 'running' and updated_at < now() - interval '3 minutes')
       or status in ('error', 'auth_required', 'partial')
  loop
    alert_fingerprint := 'job:' || job_row.id::text || ':' || job_row.status;
    update public.automation_alerts set last_seen_at = now(), message = left(coalesce(job_row.error,
      upper(job_row.provider) || ' ' || job_row.status || ' job needs attention.'), 500),
      details = jsonb_build_object('status', job_row.status, 'checked_count', job_row.checked_count, 'total_count', job_row.total_count)
      where fingerprint = alert_fingerprint and resolved_at is null;
    if not found then
      insert into public.automation_alerts(fingerprint, severity, code, provider, job_id, message, details)
      values (alert_fingerprint,
        case when job_row.status in ('error', 'auth_required') or job_row.status = 'queued' then 'critical' else 'warning' end,
        case when job_row.status = 'queued' then 'job_stuck_queued'
             when job_row.status = 'running' then 'job_stalled'
             else 'job_' || job_row.status end,
        job_row.provider, job_row.id,
        left(coalesce(job_row.error, upper(job_row.provider) || ' ' || job_row.status || ' job needs attention.'), 500),
        jsonb_build_object('status', job_row.status, 'checked_count', job_row.checked_count, 'total_count', job_row.total_count));
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluate_automation_health() from public, anon;
grant execute on function public.evaluate_automation_health() to authenticated, service_role;

create or replace function public.resolve_automation_alert(p_alert_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.automation_alerts
    set resolved_at = now(), resolved_by = auth.uid(), last_seen_at = now()
    where id = p_alert_id and resolved_at is null;
end;
$$;

revoke all on function public.resolve_automation_alert(uuid) from public, anon;
grant execute on function public.resolve_automation_alert(uuid) to authenticated;
