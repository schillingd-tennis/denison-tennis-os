-- Additive: unfinished intra-squad matches with leader/trailing players.
-- Existing rows remain status = 'completed'. Do not rewrite historical results.

alter table public.intra_squad_matches
  add column if not exists status text not null default 'completed',
  add column if not exists leader_player_id text references public.production_people (id),
  add column if not exists trailing_player_id text references public.production_people (id);

alter table public.intra_squad_matches
  alter column winner_player_id drop not null,
  alter column loser_player_id drop not null;

alter table public.intra_squad_matches
  drop constraint if exists intra_squad_matches_distinct_players;

alter table public.intra_squad_matches
  drop constraint if exists intra_squad_matches_status_valid;
alter table public.intra_squad_matches
  add constraint intra_squad_matches_status_valid
  check (status in ('completed', 'unfinished'));

alter table public.intra_squad_matches
  drop constraint if exists intra_squad_matches_completed_players;
alter table public.intra_squad_matches
  add constraint intra_squad_matches_completed_players
  check (
    status <> 'completed'
    or (
      winner_player_id is not null
      and loser_player_id is not null
      and winner_player_id <> loser_player_id
      and leader_player_id is null
      and trailing_player_id is null
    )
  );

alter table public.intra_squad_matches
  drop constraint if exists intra_squad_matches_unfinished_players;
alter table public.intra_squad_matches
  add constraint intra_squad_matches_unfinished_players
  check (
    status <> 'unfinished'
    or (
      leader_player_id is not null
      and trailing_player_id is not null
      and leader_player_id <> trailing_player_id
      and winner_player_id is null
      and loser_player_id is null
    )
  );

create index if not exists intra_squad_matches_status_idx
  on public.intra_squad_matches (status);

create index if not exists intra_squad_matches_leader_idx
  on public.intra_squad_matches (leader_player_id);

create index if not exists intra_squad_matches_trailing_idx
  on public.intra_squad_matches (trailing_player_id);

comment on column public.intra_squad_matches.status is
  'completed = official W-L result; unfinished = stopped early, leader/trailing only.';
comment on column public.intra_squad_matches.leader_player_id is
  'Player ahead when the match stopped. Null for completed matches.';
comment on column public.intra_squad_matches.trailing_player_id is
  'Player behind when the match stopped. Null for completed matches.';
