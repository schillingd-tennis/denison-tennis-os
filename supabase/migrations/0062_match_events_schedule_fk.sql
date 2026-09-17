-- Schedule owns event identity; Matches owns official results.
-- One Matches event container per Schedule event. Legacy unlinked rows remain valid.
-- Deleting a Schedule event must NOT cascade-delete official results.

-- ---------------------------------------------------------------------------
-- Detect duplicate schedule links before uniqueness (no auto-delete)
-- ---------------------------------------------------------------------------
do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count
  from (
    select schedule_event_id
    from public.match_events
    where schedule_event_id is not null
    group by schedule_event_id
    having count(*) > 1
  ) dups;

  if dup_count > 0 then
    raise exception
      'Cannot enforce one Matches event per Schedule event: % schedule_event_id value(s) already link to multiple match_events. Resolve duplicates manually before applying 0062.',
      dup_count;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- FK: preserve results when Schedule is deleted (SET NULL, never CASCADE)
-- ---------------------------------------------------------------------------
alter table public.match_events
  drop constraint if exists match_events_schedule_event_id_fkey;

alter table public.match_events
  add constraint match_events_schedule_event_id_fkey
  foreign key (schedule_event_id)
  references public.team_schedule_events (id)
  on delete set null;

-- One official Matches container per Schedule event (legacy nulls allowed)
create unique index if not exists match_events_schedule_event_uidx
  on public.match_events (schedule_event_id)
  where schedule_event_id is not null;

-- Provenance snapshot of Schedule identity at link/import time (not editable truth)
alter table public.match_events
  add column if not exists schedule_snapshot jsonb;

alter table public.match_events
  add column if not exists schedule_unlinked_reason text;

alter table public.match_events
  drop constraint if exists match_events_unlinked_reason_valid;

alter table public.match_events
  add constraint match_events_unlinked_reason_valid check (
    schedule_unlinked_reason is null
    or schedule_unlinked_reason in ('manual', 'schedule_deleted', 'never_linked')
  );

comment on column public.match_events.schedule_event_id is
  'Live link to Team Schedule event (source of truth for name/type/opponent/dates/site/venue). Null = legacy unlinked or Schedule deleted.';
comment on column public.match_events.schedule_snapshot is
  'Historical Schedule identity captured at import/link for provenance only; display prefers live Schedule when linked.';
comment on column public.match_events.schedule_unlinked_reason is
  'Why schedule_event_id is null after once being linked, or never_linked for legacy imports.';

-- When Schedule row is deleted, mark the Matches container (FK already SET NULL)
create or replace function public.match_events_mark_schedule_deleted()
returns trigger
language plpgsql
as $$
begin
  update public.match_events
  set
    schedule_unlinked_reason = 'schedule_deleted',
    updated_at = now()
  where schedule_event_id = old.id;
  return old;
end;
$$;

drop trigger if exists match_events_schedule_deleted_trg on public.team_schedule_events;
create trigger match_events_schedule_deleted_trg
  before delete on public.team_schedule_events
  for each row
  execute function public.match_events_mark_schedule_deleted();

-- Import batches may track the intended Schedule event during draft review
alter table public.match_import_batches
  add column if not exists schedule_event_id uuid
  references public.team_schedule_events (id)
  on delete set null;

create index if not exists match_import_batches_schedule_event_idx
  on public.match_import_batches (schedule_event_id)
  where schedule_event_id is not null;
