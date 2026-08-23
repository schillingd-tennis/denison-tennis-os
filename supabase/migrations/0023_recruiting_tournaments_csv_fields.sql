-- Store every Tournaments.csv column that is not already on recruiting_tournaments.
-- 0021 covers name, dates, location, venue, surface, status, website_url, notes, source_key.
-- 0022 covers recruiting_plan + recruit links.

alter table public.recruiting_tournaments
  add column if not exists attended boolean;

alter table public.recruiting_tournaments
  add column if not exists level text;

alter table public.recruiting_tournaments
  add column if not exists entry_type text;

alter table public.recruiting_tournaments
  add column if not exists lifecycle_status text;

alter table public.recruiting_tournaments
  add column if not exists distance_from_columbus text;

alter table public.recruiting_tournaments
  add column if not exists additional_notes text;

alter table public.recruiting_tournaments
  add column if not exists recruits_attending_text text;

alter table public.recruiting_tournaments
  drop constraint if exists recruiting_tournaments_lifecycle_valid;

alter table public.recruiting_tournaments
  add constraint recruiting_tournaments_lifecycle_valid
  check (lifecycle_status is null or lifecycle_status in ('past', 'upcoming'));

comment on column public.recruiting_tournaments.attended is
  'CSV Attended: true / false / null.';
comment on column public.recruiting_tournaments.level is
  'CSV Level (L1, L2, Showcase, ITF, …).';
comment on column public.recruiting_tournaments.entry_type is
  'CSV Open / Closed.';
comment on column public.recruiting_tournaments.lifecycle_status is
  'CSV Status: past | upcoming.';
comment on column public.recruiting_tournaments.distance_from_columbus is
  'CSV Distance from Columbus (mi), stored as text (values may include travel time).';
comment on column public.recruiting_tournaments.additional_notes is
  'CSV Additional Notes.';
comment on column public.recruiting_tournaments.recruits_attending_text is
  'CSV Recruits Attending (comma-separated names). Person links live in recruiting_tournament_recruits.';
