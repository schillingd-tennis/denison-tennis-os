-- WhatsApp sync job queue (local development).
-- Queue rows must never contain message bodies. error_code is a short token only.
-- V1 helper targets local Supabase only; do not rely on this table in production.

create table if not exists public.whatsapp_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null,
  status text not null,
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  heartbeat_at timestamptz,
  lease_expires_at timestamptz,
  finished_at timestamptz,
  imported_count integer,
  skipped_count integer,
  unmatched_count integer,
  error_code text,
  constraint whatsapp_sync_jobs_trigger_valid
    check (trigger in ('manual', 'scheduled', 'catch_up')),
  constraint whatsapp_sync_jobs_status_valid
    check (status in ('queued', 'running', 'completed', 'failed')),
  constraint whatsapp_sync_jobs_imported_check
    check (imported_count is null or imported_count >= 0),
  constraint whatsapp_sync_jobs_error_code_safe
    check (
      error_code is null
      or (
        char_length(error_code) <= 64
        and error_code ~ '^[a-z][a-z0-9_]*$'
      )
    )
);

comment on table public.whatsapp_sync_jobs is
  'WhatsApp helper job queue (local/dev). Do not persist WhatsApp message content on this table.';

create unique index if not exists whatsapp_sync_jobs_one_active
  on public.whatsapp_sync_jobs ((true))
  where status in ('queued', 'running');

create index if not exists whatsapp_sync_jobs_completed_finished_idx
  on public.whatsapp_sync_jobs (finished_at desc)
  where status = 'completed';

alter table public.whatsapp_sync_jobs enable row level security;

revoke all on table public.whatsapp_sync_jobs from public;
revoke all on table public.whatsapp_sync_jobs from anon;
revoke all on table public.whatsapp_sync_jobs from authenticated;
grant all on table public.whatsapp_sync_jobs to postgres, service_role;
grant select, insert on table public.whatsapp_sync_jobs to authenticated;

drop policy if exists whatsapp_sync_jobs_select_authenticated on public.whatsapp_sync_jobs;
create policy whatsapp_sync_jobs_select_authenticated
  on public.whatsapp_sync_jobs
  for select
  to authenticated
  using (public.app_current_access_level() is not null);

drop policy if exists whatsapp_sync_jobs_insert_manual_own on public.whatsapp_sync_jobs;
create policy whatsapp_sync_jobs_insert_manual_own
  on public.whatsapp_sync_jobs
  for insert
  to authenticated
  with check (
    public.app_current_access_level() is not null
    and trigger = 'manual'
    and status = 'queued'
    and requested_by = auth.uid()
    and started_at is null
    and heartbeat_at is null
    and lease_expires_at is null
    and finished_at is null
    and imported_count is null
    and error_code is null
  );
