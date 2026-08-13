-- BP-036E — Person Data Model Expansion (Travel & Identity Fields).
--
-- Adds passport_number and expands seat_preference to include bulkhead.
-- Safe to re-run: column add and constraint replace are guarded.

alter table public.production_people
  add column if not exists passport_number text;

alter table public.production_people
  drop constraint if exists production_people_seat_preference_valid;

alter table public.production_people
  add constraint production_people_seat_preference_valid
  check (
    seat_preference is null
    or seat_preference in (
      'window',
      'aisle',
      'middle',
      'exit_row',
      'bulkhead',
      'no_preference'
    )
  );

comment on column public.production_people.passport_number is
  'Sensitive secure text; passport document number (BP-036E). Keep out of directory views.';

comment on column public.production_people.seat_preference is
  'Preferred aircraft seat: window|aisle|middle|exit_row|bulkhead|no_preference (BP-036E).';
