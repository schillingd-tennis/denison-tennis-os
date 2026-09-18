-- WhatsApp helper presence (singleton) for hosted Settings / Interactions status.
-- Hosted UI reads this table + whatsapp_sync_jobs; never Mac Application Support files.
-- Queue/presence rows must never contain message bodies.

create table if not exists public.whatsapp_helper_presence (
  id integer primary key check (id = 1),
  last_seen_at timestamptz,
  connection_state text,
  account_id text,
  destination_host text,
  import_from_at timestamptz,
  production_activation_at timestamptz,
  selected_conversation_id text,
  last_error_code text,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  unmatched_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint whatsapp_helper_presence_error_code_safe
    check (
      last_error_code is null
      or (
        char_length(last_error_code) <= 64
        and last_error_code ~ '^[a-z][a-z0-9_]*$'
      )
    ),
  constraint whatsapp_helper_presence_counts_nonneg
    check (
      imported_count >= 0
      and skipped_count >= 0
      and unmatched_count >= 0
    )
);

comment on table public.whatsapp_helper_presence is
  'Singleton Mac helper heartbeat for WhatsApp live sync. No message content.';
comment on column public.whatsapp_helper_presence.last_error_code is
  'Short machine token only. Never a payload or stack trace.';
comment on column public.whatsapp_helper_presence.destination_host is
  'Public Supabase hostname the helper is writing to (e.g. hvctdzhxfpkyflbihvhv.supabase.co).';

alter table public.whatsapp_helper_presence enable row level security;

revoke all on table public.whatsapp_helper_presence from public;
revoke all on table public.whatsapp_helper_presence from anon;
revoke all on table public.whatsapp_helper_presence from authenticated;
grant all on table public.whatsapp_helper_presence to postgres, service_role;
grant select on table public.whatsapp_helper_presence to authenticated;

drop policy if exists whatsapp_helper_presence_select_authenticated on public.whatsapp_helper_presence;
create policy whatsapp_helper_presence_select_authenticated
  on public.whatsapp_helper_presence
  for select
  to authenticated
  using (public.app_current_access_level() is not null);

-- No authenticated INSERT/UPDATE/DELETE: helper uses service_role (RLS bypass).

-- Clarify 0064 jobs table is used for live OS destination as well as local.
comment on table public.whatsapp_sync_jobs is
  'WhatsApp helper job queue (local + live OS). Do not persist WhatsApp message content on this table. Hosted UI enqueues; Mac helper claims with service_role.';
