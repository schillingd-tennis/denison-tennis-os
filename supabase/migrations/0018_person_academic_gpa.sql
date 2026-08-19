-- Player Academics workspace — college GPA on Person.
-- Distinct from recruit_profiles.gpa (recruiting-time snapshot).

alter table public.production_people
  add column if not exists gpa numeric;

alter table public.production_people
  add column if not exists gpa_last_semester numeric;

alter table public.production_people
  add column if not exists gpa_last_year numeric;

comment on column public.production_people.gpa is
  'Cumulative / overall college GPA. Distinct from recruit_profiles.gpa.';

comment on column public.production_people.gpa_last_semester is
  'College GPA for the most recently completed semester.';

comment on column public.production_people.gpa_last_year is
  'College GPA for the most recently completed academic year.';
