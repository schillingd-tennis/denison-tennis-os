-- Recruit campus-visit facts on recruit_profiles.
-- Number of days is derived in the app from the two dates (not stored).

alter table public.recruit_profiles
  add column if not exists visit_start_date date;

alter table public.recruit_profiles
  add column if not exists visit_end_date date;

alter table public.recruit_profiles
  add column if not exists travel_type text;

alter table public.recruit_profiles
  add column if not exists flight_info text;

alter table public.recruit_profiles
  drop constraint if exists recruit_profiles_travel_type_valid;

alter table public.recruit_profiles
  add constraint recruit_profiles_travel_type_valid
  check (
    travel_type is null
    or travel_type in ('Flight', 'Drive', 'Other')
  );

comment on column public.recruit_profiles.visit_start_date is
  'Campus visit start date (calendar).';

comment on column public.recruit_profiles.visit_end_date is
  'Campus visit end date (calendar). Inclusive with start for day count.';

comment on column public.recruit_profiles.travel_type is
  'Visit travel type: Flight | Drive | Other.';

comment on column public.recruit_profiles.flight_info is
  'Free-text flight details. Kept even if travel_type changes.';
