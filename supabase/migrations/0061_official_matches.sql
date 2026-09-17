-- Official season match results (duals + individual tournaments).
-- Separate from Intra Squad. Additive only; no sample/prod seed data.

-- ---------------------------------------------------------------------------
-- Events: one dual or one tournament event
-- ---------------------------------------------------------------------------
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text not null,
  opposing_team_name text,
  season_year integer not null,
  season_segment text,
  start_date date not null,
  end_date date,
  site text,
  location_text text,
  venue_name text,
  status text not null default 'completed',
  scoring_format text,
  reported_team_score_denison integer,
  reported_team_score_opponent integer,
  calculated_team_score_denison integer,
  calculated_team_score_opponent integer,
  team_outcome text,
  team_score_discrepancy boolean not null default false,
  schedule_event_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_events_type_valid check (event_type in ('dual', 'tournament')),
  constraint match_events_segment_valid check (
    season_segment is null or season_segment in ('fall', 'spring', 'postseason')
  ),
  constraint match_events_site_valid check (
    site is null or site in ('home', 'away', 'neutral')
  ),
  constraint match_events_status_valid check (
    status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'unfinished')
  ),
  constraint match_events_scoring_format_valid check (
    scoring_format is null
    or scoring_format in ('ncaa_standard', 'doubles_separate', 'custom')
  ),
  constraint match_events_team_outcome_valid check (
    team_outcome is null or team_outcome in ('win', 'loss', 'tie')
  ),
  constraint match_events_title_present check (char_length(trim(title)) > 0),
  constraint match_events_dual_opponent check (
    event_type <> 'dual' or opposing_team_name is null or char_length(trim(opposing_team_name)) > 0
  )
);

create index if not exists match_events_season_idx
  on public.match_events (season_year desc, start_date desc);

create index if not exists match_events_type_idx
  on public.match_events (event_type, start_date desc);

create index if not exists match_events_schedule_event_idx
  on public.match_events (schedule_event_id)
  where schedule_event_id is not null;

-- ---------------------------------------------------------------------------
-- Canonical doubles partnerships (A/B == B/A via pair_key)
-- ---------------------------------------------------------------------------
create table if not exists public.match_doubles_pairs (
  id uuid primary key default gen_random_uuid(),
  player_a_id text not null references public.production_people (id),
  player_b_id text not null references public.production_people (id),
  pair_key text not null,
  created_at timestamptz not null default now(),
  constraint match_doubles_pairs_distinct check (player_a_id <> player_b_id),
  constraint match_doubles_pairs_key_unique unique (pair_key)
);

create index if not exists match_doubles_pairs_player_a_idx
  on public.match_doubles_pairs (player_a_id);

create index if not exists match_doubles_pairs_player_b_idx
  on public.match_doubles_pairs (player_b_id);

-- ---------------------------------------------------------------------------
-- Individual match results (singles or doubles) under an event
-- ---------------------------------------------------------------------------
create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.match_events (id) on delete cascade,
  discipline text not null,
  result_kind text not null,
  lineup_position integer,
  draw_name text,
  flight_name text,
  division_name text,
  round_label text,
  match_date date,
  status text not null default 'completed',
  winner_side text,
  score_text text,
  score_sets jsonb not null default '[]'::jsonb,
  original_score_text text,
  source_excerpt text,
  notes text,
  denison_player_a_id text references public.production_people (id),
  denison_player_b_id text references public.production_people (id),
  doubles_pair_id uuid references public.match_doubles_pairs (id),
  opponent_player_a_name text,
  opponent_player_b_name text,
  opponent_school text,
  counts_toward_team_point boolean not null default true,
  team_point_awarded_to text,
  import_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_results_discipline_valid check (discipline in ('singles', 'doubles')),
  constraint match_results_kind_valid check (result_kind in ('dual_lineup', 'tournament_match')),
  constraint match_results_status_valid check (
    status in ('completed', 'retired', 'walkover', 'default', 'unfinished', 'cancelled', 'bye')
  ),
  constraint match_results_winner_side_valid check (
    winner_side is null or winner_side in ('denison', 'opponent', 'unknown')
  ),
  constraint match_results_team_point_valid check (
    team_point_awarded_to is null
    or team_point_awarded_to in ('denison', 'opponent', 'none')
  ),
  constraint match_results_lineup_positive check (
    lineup_position is null or lineup_position >= 1
  ),
  constraint match_results_doubles_pair_players check (
    discipline <> 'doubles'
    or denison_player_b_id is null
    or denison_player_a_id is distinct from denison_player_b_id
  )
);

create index if not exists match_results_event_idx
  on public.match_results (event_id, discipline, lineup_position);

create index if not exists match_results_player_a_idx
  on public.match_results (denison_player_a_id);

create index if not exists match_results_player_b_idx
  on public.match_results (denison_player_b_id);

create index if not exists match_results_pair_idx
  on public.match_results (doubles_pair_id);

create index if not exists match_results_fingerprint_idx
  on public.match_results (import_fingerprint)
  where import_fingerprint is not null;

create unique index if not exists match_results_event_fingerprint_uidx
  on public.match_results (event_id, import_fingerprint)
  where import_fingerprint is not null;

-- ---------------------------------------------------------------------------
-- Import provenance / draft batches
-- ---------------------------------------------------------------------------
create table if not exists public.match_import_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.match_events (id) on delete set null,
  event_type text,
  detection_method text not null,
  source_text text not null,
  draft_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  error_message text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_import_batches_type_valid check (
    event_type is null or event_type in ('dual', 'tournament')
  ),
  constraint match_import_batches_detection_valid check (
    detection_method in ('auto', 'user_dual', 'user_tournament')
  ),
  constraint match_import_batches_status_valid check (
    status in ('draft', 'confirmed', 'failed')
  ),
  constraint match_import_batches_source_present check (char_length(trim(source_text)) > 0)
);

create index if not exists match_import_batches_event_idx
  on public.match_import_batches (event_id);

create index if not exists match_import_batches_created_idx
  on public.match_import_batches (created_at desc);

-- ---------------------------------------------------------------------------
-- Grants + RLS (authenticated team access; same pattern as Intra Squad)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.match_events to authenticated;
grant select, insert, update, delete on table public.match_results to authenticated;
grant select, insert, update, delete on table public.match_doubles_pairs to authenticated;
grant select, insert, update, delete on table public.match_import_batches to authenticated;

alter table public.match_events enable row level security;
alter table public.match_results enable row level security;
alter table public.match_doubles_pairs enable row level security;
alter table public.match_import_batches enable row level security;

drop policy if exists "Authenticated users can read match events" on public.match_events;
create policy "Authenticated users can read match events"
  on public.match_events for select to authenticated using (true);
drop policy if exists "Authenticated users can create match events" on public.match_events;
create policy "Authenticated users can create match events"
  on public.match_events for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update match events" on public.match_events;
create policy "Authenticated users can update match events"
  on public.match_events for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete match events" on public.match_events;
create policy "Authenticated users can delete match events"
  on public.match_events for delete to authenticated using (true);

drop policy if exists "Authenticated users can read match results" on public.match_results;
create policy "Authenticated users can read match results"
  on public.match_results for select to authenticated using (true);
drop policy if exists "Authenticated users can create match results" on public.match_results;
create policy "Authenticated users can create match results"
  on public.match_results for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update match results" on public.match_results;
create policy "Authenticated users can update match results"
  on public.match_results for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete match results" on public.match_results;
create policy "Authenticated users can delete match results"
  on public.match_results for delete to authenticated using (true);

drop policy if exists "Authenticated users can read match doubles pairs" on public.match_doubles_pairs;
create policy "Authenticated users can read match doubles pairs"
  on public.match_doubles_pairs for select to authenticated using (true);
drop policy if exists "Authenticated users can create match doubles pairs" on public.match_doubles_pairs;
create policy "Authenticated users can create match doubles pairs"
  on public.match_doubles_pairs for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update match doubles pairs" on public.match_doubles_pairs;
create policy "Authenticated users can update match doubles pairs"
  on public.match_doubles_pairs for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete match doubles pairs" on public.match_doubles_pairs;
create policy "Authenticated users can delete match doubles pairs"
  on public.match_doubles_pairs for delete to authenticated using (true);

drop policy if exists "Authenticated users can read match import batches" on public.match_import_batches;
create policy "Authenticated users can read match import batches"
  on public.match_import_batches for select to authenticated using (true);
drop policy if exists "Authenticated users can create match import batches" on public.match_import_batches;
create policy "Authenticated users can create match import batches"
  on public.match_import_batches for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update match import batches" on public.match_import_batches;
create policy "Authenticated users can update match import batches"
  on public.match_import_batches for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete match import batches" on public.match_import_batches;
create policy "Authenticated users can delete match import batches"
  on public.match_import_batches for delete to authenticated using (true);

comment on table public.match_events is
  'Official dual or tournament events. Team W–L comes only from duals with a confirmed team_outcome.';
comment on table public.match_results is
  'Canonical official singles/doubles results. Player and pair records are derived, never stored counters.';
comment on table public.match_doubles_pairs is
  'Canonical doubles partnerships; pair_key sorts player ids so A/B equals B/A.';
comment on table public.match_import_batches is
  'Import provenance: pasted source text, AI/deterministic draft JSON, and confirm/fail status.';
