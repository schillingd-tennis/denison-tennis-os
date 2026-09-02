-- Idempotent seed: NCAC Championships (2026–27 season).
-- Skips insert when the event already exists (e.g. user-created production row).

insert into public.team_schedule_events (
  season_year,
  competition_date_number,
  competition_date_group,
  event_type,
  opponent_name,
  event_name,
  ita_rank,
  start_date,
  end_date,
  time_text,
  venue_name,
  city,
  state,
  location_text,
  site_designation,
  travel_required,
  ncac,
  season_segment,
  status,
  doubleheader_status,
  officials_needed,
  teams_in_event,
  counts_as_competition_date,
  notes,
  sort_order
)
select
  2027,
  null,
  null,
  'tournament',
  null,
  'NCAC Championships',
  null,
  '2027-05-07',
  '2027-05-09',
  'All Day',
  'TBA',
  'TBA',
  null,
  'TBA',
  'neutral',
  false,
  false,
  'spring',
  'confirmed',
  'none',
  null,
  null,
  false,
  null,
  250
where not exists (
  select 1
  from public.team_schedule_events
  where season_year = 2027
    and event_name = 'NCAC Championships'
);
