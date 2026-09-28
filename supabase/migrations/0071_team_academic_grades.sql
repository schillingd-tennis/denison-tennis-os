-- Team Grades: normalized registrar snapshots. Per-player/per-term rows store only
-- attempted hours, semester GPA, and midterm GPA; all rollups are calculated.

create table if not exists public.team_academic_terms (
  id uuid primary key default gen_random_uuid(),
  term_key text not null unique,
  label text not null,
  season text not null check (season in ('fall', 'spring')),
  calendar_year integer not null check (calendar_year between 2000 and 2200),
  academic_year text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_academic_records (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.team_academic_terms(id) on delete cascade,
  person_id text not null references public.production_people(id) on delete restrict,
  credit_hours numeric(5,2) not null check (credit_hours >= 0 and credit_hours <= 40),
  semester_gpa numeric(4,3) not null check (semester_gpa >= 0 and semester_gpa <= 4),
  midterm_gpa numeric(4,3) check (midterm_gpa >= 0 and midterm_gpa <= 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (term_id, person_id)
);

create index if not exists team_academic_records_person_idx
  on public.team_academic_records(person_id);
create index if not exists team_academic_records_term_idx
  on public.team_academic_records(term_id);

alter table public.team_academic_terms enable row level security;
alter table public.team_academic_records enable row level security;
grant select, insert, update, delete on public.team_academic_terms, public.team_academic_records to authenticated, service_role;

create policy "Authenticated users manage academic terms"
  on public.team_academic_terms for all to authenticated using (true) with check (true);
create policy "Authenticated users manage academic records"
  on public.team_academic_records for all to authenticated using (true) with check (true);

comment on table public.team_academic_records is
  'Registrar GPA snapshots. Store only credit_hours, semester_gpa, and midterm_gpa per player/term.';
