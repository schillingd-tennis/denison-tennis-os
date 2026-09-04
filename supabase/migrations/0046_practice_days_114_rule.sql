create table if not exists public.practice_days (
  id uuid primary key default gen_random_uuid(), practice_date date not null unique, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists practice_days_date_idx on public.practice_days (practice_date);
grant select, insert, update, delete on table public.practice_days to authenticated;
alter table public.practice_days enable row level security;
create policy "Authenticated users can read practice days" on public.practice_days for select to authenticated using (true);
create policy "Authenticated users can create practice days" on public.practice_days for insert to authenticated with check (true);
create policy "Authenticated users can update practice days" on public.practice_days for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete practice days" on public.practice_days for delete to authenticated using (true);
