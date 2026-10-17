alter table public.recruiting_tournament_participants
  add column if not exists utr numeric;

alter table public.recruiting_tournament_participants
  drop constraint if exists recruiting_tournament_participants_utr_valid;
alter table public.recruiting_tournament_participants
  add constraint recruiting_tournament_participants_utr_valid
  check (utr is null or (utr > 0 and utr <= 16.5));

comment on column public.recruiting_tournament_participants.utr is
  'Coach-entered UTR for a tournament player when no linked Recruiting OS value is available.';
