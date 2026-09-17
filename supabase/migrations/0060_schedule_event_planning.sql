-- Schedule Event Adaptive Workspace planning data.
-- Additive tables linked to existing team_schedule_events. No sample rows.

-- ---------------------------------------------------------------------------
-- Traveling party (Person ID relationships; unique per event)
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_party (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  person_id text not null references public.production_people (id) on delete cascade,
  member_kind text not null default 'player',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_party_pair_unique unique (event_id, person_id),
  constraint team_schedule_event_party_kind_valid check (
    member_kind in ('player', 'coach', 'additional')
  )
);

create index if not exists team_schedule_event_party_event_id_idx
  on public.team_schedule_event_party (event_id);
create index if not exists team_schedule_event_party_person_id_idx
  on public.team_schedule_event_party (person_id);

-- ---------------------------------------------------------------------------
-- Teams involved (relational; display synced to teams_in_event on write)
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  team_name text not null,
  identity_slug text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_teams_name_unique unique (event_id, team_name)
);

create index if not exists team_schedule_event_teams_event_id_idx
  on public.team_schedule_event_teams (event_id);

-- ---------------------------------------------------------------------------
-- Travel arrangements
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_travel (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  travel_mode text not null,
  label text,
  departure_date date,
  departure_time text,
  departure_timezone text,
  return_date date,
  return_time text,
  return_timezone text,
  origin text,
  destination text,
  provider text,
  confirmation text,
  notes text,
  -- Van
  vehicle_name text,
  driver_person_id text references public.production_people (id) on delete set null,
  -- Flight
  airline text,
  flight_number text,
  departure_airport text,
  arrival_airport text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_travel_mode_valid check (
    travel_mode in ('van', 'flight', 'bus', 'ground_transfer')
  )
);

create index if not exists team_schedule_event_travel_event_id_idx
  on public.team_schedule_event_travel (event_id);

create table if not exists public.team_schedule_event_travel_passengers (
  id uuid primary key default gen_random_uuid(),
  travel_id uuid not null references public.team_schedule_event_travel (id) on delete cascade,
  person_id text not null references public.production_people (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint team_schedule_event_travel_passengers_unique unique (travel_id, person_id)
);

create index if not exists team_schedule_event_travel_passengers_travel_id_idx
  on public.team_schedule_event_travel_passengers (travel_id);

-- ---------------------------------------------------------------------------
-- Practice & match / activity sessions
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  session_type text not null default 'match',
  session_date date not null,
  start_time text,
  end_time text,
  venue_or_court text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_sessions_type_valid check (
    session_type in ('practice', 'match', 'activity')
  )
);

create index if not exists team_schedule_event_sessions_event_date_idx
  on public.team_schedule_event_sessions (event_id, session_date, sort_order);

-- ---------------------------------------------------------------------------
-- Alumni attending
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_alumni (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  person_id text references public.production_people (id) on delete set null,
  guest_name text,
  class_year integer,
  rsvp_status text not null default 'invited',
  guest_count integer not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_alumni_rsvp_valid check (
    rsvp_status in ('invited', 'confirmed', 'unable')
  ),
  constraint team_schedule_event_alumni_guest_count_nonneg check (guest_count >= 0),
  constraint team_schedule_event_alumni_identity_present check (
    person_id is not null or (guest_name is not null and length(trim(guest_name)) > 0)
  )
);

create index if not exists team_schedule_event_alumni_event_id_idx
  on public.team_schedule_event_alumni (event_id);

-- ---------------------------------------------------------------------------
-- Packing list
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_packing (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_schedule_events (id) on delete cascade,
  item_name text not null,
  quantity integer not null default 1,
  responsible text,
  notes text,
  is_checked boolean not null default false,
  is_starter boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_schedule_event_packing_qty_positive check (quantity >= 1),
  constraint team_schedule_event_packing_item_unique unique (event_id, item_name)
);

create index if not exists team_schedule_event_packing_event_id_idx
  on public.team_schedule_event_packing (event_id);

-- ---------------------------------------------------------------------------
-- Planning notes (separate from schedule event.notes)
-- ---------------------------------------------------------------------------
create table if not exists public.team_schedule_event_planning (
  event_id uuid primary key references public.team_schedule_events (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Grants + RLS (authenticated, mirror hotels/officials)
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'team_schedule_event_party',
    'team_schedule_event_teams',
    'team_schedule_event_travel',
    'team_schedule_event_travel_passengers',
    'team_schedule_event_sessions',
    'team_schedule_event_alumni',
    'team_schedule_event_packing',
    'team_schedule_event_planning'
  ]
  loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', tbl);
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Authenticated users can read %s" on public.%I', tbl, tbl);
    execute format(
      'create policy "Authenticated users can read %s" on public.%I for select to authenticated using (true)',
      tbl, tbl
    );
    execute format('drop policy if exists "Authenticated users can create %s" on public.%I', tbl, tbl);
    execute format(
      'create policy "Authenticated users can create %s" on public.%I for insert to authenticated with check (true)',
      tbl, tbl
    );
    execute format('drop policy if exists "Authenticated users can update %s" on public.%I', tbl, tbl);
    execute format(
      'create policy "Authenticated users can update %s" on public.%I for update to authenticated using (true) with check (true)',
      tbl, tbl
    );
    execute format('drop policy if exists "Authenticated users can delete %s" on public.%I', tbl, tbl);
    execute format(
      'create policy "Authenticated users can delete %s" on public.%I for delete to authenticated using (true)',
      tbl, tbl
    );
  end loop;
end $$;

comment on table public.team_schedule_event_party is
  'Traveling party for a schedule event; Person IDs unique per event.';
comment on table public.team_schedule_event_planning is
  'Event planning notes; distinct from team_schedule_events.notes.';
