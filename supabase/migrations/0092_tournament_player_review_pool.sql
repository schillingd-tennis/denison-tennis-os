-- Keep imported tournament players outside Recruiting OS until a coach promotes them.
alter table public.recruiting_tournament_participants
  add column if not exists trn_url text,
  add column if not exists trn_rank integer,
  add column if not exists trn_star_rating smallint,
  add column if not exists class_year integer;

alter table public.recruiting_tournament_participants
  add constraint recruiting_tournament_participants_trn_stars_valid
  check (trn_star_rating is null or trn_star_rating between 1 and 6);

comment on column public.recruiting_tournament_participants.trn_url is
  'Public TRN match for this tournament-only player; does not create a Recruiting OS profile.';
