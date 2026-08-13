-- BP-036A — Person Data Model Expansion (Travel Identity Fields).
--
-- Adds travel / identity columns onto production_people. Fields belong once
-- on the Person record; Travel Workspace and forms come in later milestones.
-- Safe to re-run: column adds and constraints are guarded.

alter table public.production_people
  add column if not exists full_legal_name text;

alter table public.production_people
  add column if not exists middle_initial text;

alter table public.production_people
  add column if not exists social_security_number text;

alter table public.production_people
  add column if not exists tsa_known_traveler_number text;

alter table public.production_people
  add column if not exists passport_expiration_date date;

alter table public.production_people
  add column if not exists seat_preference text;

alter table public.production_people
  drop constraint if exists production_people_middle_initial_length;

alter table public.production_people
  add constraint production_people_middle_initial_length
  check (middle_initial is null or char_length(middle_initial) <= 1);

alter table public.production_people
  drop constraint if exists production_people_seat_preference_valid;

alter table public.production_people
  add constraint production_people_seat_preference_valid
  check (
    seat_preference is null
    or seat_preference in ('window', 'aisle', 'middle', 'exit_row', 'no_preference')
  );

comment on column public.production_people.full_legal_name is
  'Legal name as on travel documents (BP-036A).';

comment on column public.production_people.middle_initial is
  'Optional middle initial; at most one character (BP-036A).';

comment on column public.production_people.social_security_number is
  'Sensitive secure text; Person travel identity (BP-036A). Keep out of directory views.';

comment on column public.production_people.tsa_known_traveler_number is
  'TSA Known Traveler Number / Global Entry style KTN (BP-036A).';

comment on column public.production_people.passport_expiration_date is
  'Passport expiration date (BP-036A).';

comment on column public.production_people.seat_preference is
  'Preferred aircraft seat: window|aisle|middle|exit_row|no_preference (BP-036A).';

comment on column public.production_people.date_of_birth is
  'Canonical Personal Information date of birth (ISO date). Do not duplicate elsewhere (BP-036A).';
