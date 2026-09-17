-- Explicit Results entry status (admin), separate from Schedule status and sporting outcomes.
-- Complete is never inferred from team score or a single result — coaches mark it.
-- Legacy rows keep results_marked_complete_at null (show as Partial when results exist).

alter table public.match_events
  add column if not exists results_marked_complete_at timestamptz;

alter table public.match_events
  add column if not exists results_marked_complete_by text;

comment on column public.match_events.results_marked_complete_at is
  'When Results entry was explicitly marked complete. Null = not complete (Awaiting or Partial). Never auto-set from scores.';
comment on column public.match_events.results_marked_complete_by is
  'Optional auth subject who marked results complete.';

-- Do NOT backfill complete from status/team_outcome — uncertain legacy stays Partial/Awaiting.
