-- BP-045C — Rankings workspace persistence refinements.
--
-- Adds WTN profile URL storage and extends the shared TRN star-rating field to
-- support 1-star, 2-star, and Blue Chip (stored as 6).

alter table public.production_people
  add column if not exists wtn_url text;

alter table public.production_people
  drop constraint if exists production_people_trn_star_rating_valid;

alter table public.production_people
  add constraint production_people_trn_star_rating_valid
  check (trn_star_rating is null or trn_star_rating in (1, 2, 3, 4, 5, 6));

comment on column public.production_people.trn_star_rating is
  'TennisRecruiting.net star rating: 1-5 stars; 6 = Blue Chip (BP-045C).';

comment on column public.production_people.wtn_url is
  'WTN profile URL (BP-045C).';
