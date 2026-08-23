-- Travel logistics + extra link URLs for the Tournament Adaptive Workspace.
-- Distance from Columbus already exists on recruiting_tournaments.

alter table public.recruiting_tournaments
  add column if not exists estimated_drive_time text;

alter table public.recruiting_tournaments
  add column if not exists travel_method text;

alter table public.recruiting_tournaments
  add column if not exists departure_date date;

alter table public.recruiting_tournaments
  add column if not exists return_date date;

alter table public.recruiting_tournaments
  add column if not exists hotel_name text;

alter table public.recruiting_tournaments
  add column if not exists hotel_address text;

alter table public.recruiting_tournaments
  add column if not exists hotel_confirmation text;

alter table public.recruiting_tournaments
  add column if not exists hotel_check_in date;

alter table public.recruiting_tournaments
  add column if not exists hotel_check_out date;

alter table public.recruiting_tournaments
  add column if not exists airport text;

alter table public.recruiting_tournaments
  add column if not exists flight_info text;

alter table public.recruiting_tournaments
  add column if not exists rental_car text;

alter table public.recruiting_tournaments
  add column if not exists draws_url text;

alter table public.recruiting_tournaments
  add column if not exists usta_url text;

alter table public.recruiting_tournaments
  add column if not exists schedule_url text;

alter table public.recruiting_tournaments
  add column if not exists results_url text;

alter table public.recruiting_tournaments
  drop constraint if exists recruiting_tournaments_travel_method_valid;

alter table public.recruiting_tournaments
  add constraint recruiting_tournaments_travel_method_valid
  check (
    travel_method is null
    or travel_method in ('drive', 'fly', 'drive_fly', 'other')
  );

comment on column public.recruiting_tournaments.estimated_drive_time is
  'Estimated drive time from Columbus / Denison.';
comment on column public.recruiting_tournaments.travel_method is
  'drive | fly | drive_fly | other.';
