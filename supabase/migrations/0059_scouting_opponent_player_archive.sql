-- Additive opponent-player archive lifecycle (not deletion).
-- Active = archived_at IS NULL. Reports / AI / team links are preserved.

alter table public.scouting_opponent_players
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

comment on column public.scouting_opponent_players.archived_at is
  'Null = active opponent. Set when archived; clear on restore. Never deletes history.';

comment on column public.scouting_opponent_players.archived_by is
  'auth.users id of the coach/admin who archived; cleared on restore.';

create index if not exists scouting_opponent_players_active_team_idx
  on public.scouting_opponent_players (team_id)
  where archived_at is null;

create index if not exists scouting_opponent_players_archived_at_idx
  on public.scouting_opponent_players (archived_at)
  where archived_at is not null;
