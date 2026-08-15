-- BP-043E — Class year semantics.
--
-- Coda "Class Year" is high-school graduation / recruiting class.
-- Person.class_year is Denison college graduation year.
-- These are different facts. Do not overwrite production_people.class_year
-- from Coda. This migration is schema only; it does not import Coda rows
-- or change existing People data.

alter table public.recruit_profiles
  add column if not exists recruit_class_year integer;

alter table public.recruit_profiles
  drop constraint if exists recruit_profiles_recruit_class_year_valid;

alter table public.recruit_profiles
  add constraint recruit_profiles_recruit_class_year_valid
  check (
    recruit_class_year is null
    or (
      recruit_class_year >= 1900
      and recruit_class_year <= 2200
    )
  );

comment on column public.recruit_profiles.recruit_class_year is
  'High school graduation / recruiting class year (Coda Class Year). Distinct from production_people.class_year (Denison college graduation). BP-043E.';
