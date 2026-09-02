-- Team Operations: men's tennis competition schedule (match / tournament events).

create table if not exists public.team_schedule_events (
  id uuid primary key default gen_random_uuid(),
  season_year integer not null,
  competition_date_number integer,
  competition_date_group text,
  event_type text not null,
  opponent_name text,
  event_name text,
  ita_rank integer,
  start_date date not null,
  end_date date not null,
  time_text text,
  venue_name text,
  city text,
  state text,
  location_text text,
  site_designation text not null,
  travel_required boolean not null default false,
  ncac boolean not null default false,
  season_segment text not null,
  status text not null default 'confirmed',
  doubleheader_status text not null default 'none',
  officials_needed integer,
  teams_in_event text,
  counts_as_competition_date boolean not null default true,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_events_event_type_valid check (
    event_type in ('team_match', 'tournament', 'non_team_event', 'team_match_placeholder')
  ),
  constraint team_schedule_events_site_valid check (
    site_designation in ('home', 'away', 'neutral')
  ),
  constraint team_schedule_events_season_segment_valid check (
    season_segment in ('fall', 'spring', 'postseason')
  ),
  constraint team_schedule_events_status_valid check (
    status in ('confirmed', 'tentative', 'tbd', 'cancelled')
  ),
  constraint team_schedule_events_doubleheader_valid check (
    doubleheader_status in ('none', 'potential', 'confirmed')
  ),
  constraint team_schedule_events_dates_valid check (end_date >= start_date),
  constraint team_schedule_events_officials_nonneg check (
    officials_needed is null or officials_needed >= 0
  )
);

create index if not exists team_schedule_events_season_start_idx
  on public.team_schedule_events (season_year, start_date, sort_order);

create index if not exists team_schedule_events_comp_date_group_idx
  on public.team_schedule_events (season_year, competition_date_group)
  where competition_date_group is not null;

grant select, insert, update, delete on table public.team_schedule_events to authenticated;

alter table public.team_schedule_events enable row level security;

drop policy if exists "Authenticated users can read team schedule events"
  on public.team_schedule_events;
create policy "Authenticated users can read team schedule events"
  on public.team_schedule_events for select to authenticated using (true);

drop policy if exists "Authenticated users can create team schedule events"
  on public.team_schedule_events;
create policy "Authenticated users can create team schedule events"
  on public.team_schedule_events for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update team schedule events"
  on public.team_schedule_events;
create policy "Authenticated users can update team schedule events"
  on public.team_schedule_events for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete team schedule events"
  on public.team_schedule_events;
create policy "Authenticated users can delete team schedule events"
  on public.team_schedule_events for delete to authenticated using (true);

comment on table public.team_schedule_events is
  'Denison men''s tennis competition schedule — countable dates, shared date groups, team matches and tournaments.';

-- 2026–27 season seed (season_year = 2027, spring completion year).
insert into public.team_schedule_events (
  season_year, competition_date_number, competition_date_group, event_type,
  opponent_name, event_name, ita_rank, start_date, end_date, time_text,
  venue_name, city, state, location_text, site_designation, travel_required,
  ncac, season_segment, status, doubleheader_status, officials_needed,
  teams_in_event, counts_as_competition_date, notes, sort_order
) values
  (2027, null, null, 'non_team_event', null, 'Hotel Planner Tournament', null,
   '2026-09-05', '2026-09-07', 'All Day', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   false, 'fall', 'confirmed', 'none', null, null, false,
   'Non-Team Sanctioned Event — does not count toward team record', 10),

  (2027, 1, '1', 'tournament', null, 'Denison Invite', null,
   '2026-09-18', '2026-09-20', 'All Day', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   false, 'fall', 'confirmed', 'none', null, 'CWRU, Kenyon, Carnegie Mellon', true,
   'Hosted invite tournament', 20),

  (2027, 2, '2', 'tournament', null, 'ITA Regionals', null,
   '2026-10-02', '2026-10-05', 'All Day', 'North Central HS', 'Indianapolis', 'IN',
   'North Central HS — Indianapolis, IN', 'neutral', true,
   false, 'fall', 'confirmed', 'none', null, null, true, null, 30),

  (2027, 2, '2', 'tournament', null, 'Big Red Invite', null,
   '2026-10-02', '2026-10-05', 'All Day', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   false, 'fall', 'confirmed', 'none', null, null, true,
   'Simultaneous with ITA Regionals — counts as 1 date (#2)', 40),

  (2027, 3, '3', 'tournament', null, 'Skidmore Invite', null,
   '2026-10-10', '2026-10-11', 'All Day', null, 'Saratoga Springs', 'NY', 'Saratoga Springs, NY', 'away', true,
   false, 'fall', 'confirmed', 'none', null, null, true, null, 50),

  (2027, 4, '4', 'team_match', 'Wash U', null, 13,
   '2027-02-13', '2027-02-13', 'TBD', 'Indianapolis Racquet Club', null, null, 'Indianapolis Racquet Club', 'neutral', false,
   false, 'spring', 'tentative', 'potential', null, null, true, null, 60),

  (2027, 5, '5', 'tournament', null, 'ITA Indoors #1', null,
   '2027-02-26', '2027-02-26', 'TBD', 'Farm & Forge Club', 'Nashville', 'TN', 'Farm & Forge Club, Nashville, TN', 'neutral', true,
   false, 'spring', 'confirmed', 'none', null, null, true, 'ITA Indoors', 70),

  (2027, 6, '6', 'tournament', null, 'ITA Indoors #2', null,
   '2027-02-27', '2027-02-27', 'TBD', 'Farm & Forge Club', 'Nashville', 'TN', 'Farm & Forge Club, Nashville, TN', 'neutral', true,
   false, 'spring', 'confirmed', 'none', null, null, true, 'ITA Indoors', 80),

  (2027, 7, '7', 'tournament', null, 'ITA Indoors #3', null,
   '2027-02-28', '2027-02-28', 'TBD', 'Farm & Forge Club', 'Nashville', 'TN', 'Farm & Forge Club, Nashville, TN', 'neutral', true,
   false, 'spring', 'confirmed', 'none', null, null, true, 'ITA Indoors', 90),

  (2027, 8, '8', 'team_match', 'DePauw', null, 30,
   '2027-03-06', '2027-03-06', '10:00 AM', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   true, 'spring', 'confirmed', 'potential', null, null, true,
   'NCAC Schedule Change — original date moved', 100),

  (2027, 9, '9', 'team_match_placeholder', null, 'Spring Break #1', null,
   '2027-03-13', '2027-03-21', 'TBD', null, null, null, 'TBD', 'away', true,
   false, 'spring', 'tentative', 'none', null, null, true,
   'Travel match TBD — target opponents Sewanee or Kalamazoo', 110),

  (2027, 10, '10', 'team_match', 'CWRU', null, 5,
   '2027-03-26', '2027-03-26', '1:00 PM', 'College of Wooster facilities', 'Wooster', 'OH', 'Wooster, OH', 'neutral', false,
   false, 'spring', 'confirmed', 'potential', 2, null, true,
   'Played at College of Wooster facilities', 120),

  (2027, 11, '11', 'team_match', 'Wooster', null, null,
   '2027-03-27', '2027-03-27', 'TBD', null, 'Wooster', 'OH', 'Wooster, OH', 'away', false,
   true, 'spring', 'tentative', 'potential', null, null, true,
   'Back-to-back with CWRU (March 26) in Wooster', 130),

  (2027, 12, '12', 'team_match', 'OWU', null, null,
   '2027-04-03', '2027-04-03', '10:00 AM', null, 'Delaware', 'OH', 'Delaware, OH', 'away', false,
   true, 'spring', 'confirmed', 'confirmed', null, null, true,
   'NCAC Schedule Change — same countable date as Kenyon (#12)', 140),

  (2027, 12, '12', 'team_match', 'Kenyon', null, 11,
   '2027-04-03', '2027-04-03', '3:00 PM', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   true, 'spring', 'confirmed', 'confirmed', null, null, true,
   'NCAC Schedule Change — doubleheader with OWU on same countable date', 150),

  (2027, 13, '13', 'team_match', 'Oberlin', null, 34,
   '2027-04-09', '2027-04-09', '4:00 PM', null, 'Oberlin', 'OH', 'Oberlin, OH', 'away', false,
   true, 'spring', 'confirmed', 'potential', null, null, true,
   'NCAC Schedule Change', 160),

  (2027, 14, '14', 'team_match', 'Brandeis', 'The Ohio Cup', 18,
   '2027-04-10', '2027-04-10', 'TBD', 'Mayfield Racquet Club', 'Cleveland', 'OH', 'Mayfield Racquet Club, Cleveland, OH', 'neutral', false,
   false, 'spring', 'confirmed', 'none', null, null, true,
   'Part of The Ohio Cup event', 170),

  (2027, 15, '15', 'team_match', 'Tufts', 'The Ohio Cup', 3,
   '2027-04-11', '2027-04-11', 'TBD', 'Mayfield Racquet Club', 'Cleveland', 'OH', 'Mayfield Racquet Club, Cleveland, OH', 'neutral', false,
   false, 'spring', 'confirmed', 'none', null, null, true,
   'Part of The Ohio Cup event', 180),

  (2027, 15, '15', 'team_match', 'John Carroll', null, null,
   '2027-04-11', '2027-04-11', '3:30 PM', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   true, 'spring', 'confirmed', 'confirmed', null, null, true,
   'Doubleheader companion on same countable date as Tufts (#15)', 190),

  (2027, 16, '16', 'team_match', 'Carnegie Mellon', null, 10,
   '2027-04-15', '2027-04-15', '12:00 PM', null, 'Granville', 'OH', 'Granville, OH', 'home', false,
   false, 'spring', 'confirmed', 'potential', 2, null, true,
   'Thursday match — doubleheader opportunity', 200),

  (2027, 17, '17', 'team_match', 'Wabash', null, null,
   '2027-04-17', '2027-04-17', '1:00 PM', null, 'Crawfordsville', 'IN', 'Crawfordsville, IN', 'away', false,
   true, 'spring', 'tentative', 'none', null, null, true, null, 210),

  (2027, 18, '18', 'team_match', 'Wittenberg', null, null,
   '2027-04-18', '2027-04-18', '1:00 PM', null, 'Springfield', 'OH', 'Springfield, OH', 'away', false,
   true, 'spring', 'tentative', 'potential', null, null, true, null, 220),

  (2027, 19, '19', 'team_match', 'Mary Washington', null, 17,
   '2027-04-24', '2027-04-24', '1:00 PM', null, 'Fredericksburg', 'VA', 'Fredericksburg, VA', 'away', true,
   false, 'spring', 'confirmed', 'none', null, null, true,
   'Road weekend in Fredericksburg, VA', 230),

  (2027, 20, '20', 'team_match', 'Trinity (TX)', null, 16,
   '2027-04-25', '2027-04-25', '10:00 AM', null, 'Fredericksburg', 'VA', 'Fredericksburg, VA', 'neutral', true,
   false, 'spring', 'confirmed', 'none', null, null, true,
   'Road weekend in Fredericksburg, VA — Sunday match', 240);
