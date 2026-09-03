-- Team Operations: intra-squad singles match results.
-- Additive only. Canonical match row; per-player records are derived.

create table if not exists public.intra_squad_matches (
  id uuid primary key default gen_random_uuid(),
  played_at date not null,
  winner_player_id text not null references public.production_people (id),
  loser_player_id text not null references public.production_people (id),
  score_text text not null,
  score_sets jsonb not null default '[]'::jsonb,
  weight integer not null default 1,
  source_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intra_squad_matches_distinct_players check (winner_player_id <> loser_player_id),
  constraint intra_squad_matches_weight_valid check (weight in (1, 2, 3)),
  constraint intra_squad_matches_score_present check (char_length(trim(score_text)) > 0)
);

create index if not exists intra_squad_matches_played_at_idx
  on public.intra_squad_matches (played_at desc, created_at desc);

create index if not exists intra_squad_matches_winner_idx
  on public.intra_squad_matches (winner_player_id);

create index if not exists intra_squad_matches_loser_idx
  on public.intra_squad_matches (loser_player_id);

grant select, insert, update, delete on table public.intra_squad_matches to authenticated;

alter table public.intra_squad_matches enable row level security;

drop policy if exists "Authenticated users can read intra squad matches"
  on public.intra_squad_matches;
create policy "Authenticated users can read intra squad matches"
  on public.intra_squad_matches for select to authenticated using (true);

drop policy if exists "Authenticated users can create intra squad matches"
  on public.intra_squad_matches;
create policy "Authenticated users can create intra squad matches"
  on public.intra_squad_matches for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update intra squad matches"
  on public.intra_squad_matches;
create policy "Authenticated users can update intra squad matches"
  on public.intra_squad_matches for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete intra squad matches"
  on public.intra_squad_matches;
create policy "Authenticated users can delete intra squad matches"
  on public.intra_squad_matches for delete to authenticated using (true);

comment on table public.intra_squad_matches is
  'Denison men''s tennis intra-squad singles results. One canonical row per match; player records and rankings are derived.';
