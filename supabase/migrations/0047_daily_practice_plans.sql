create table if not exists public.daily_practice_plans (
  id uuid primary key default gen_random_uuid(), plan_date date not null unique, title text not null default 'Team Practice',
  start_time time, end_time time, location text, announcements text, focus text, countable boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.practice_plan_drills (
  plan_id uuid not null references public.daily_practice_plans(id) on delete cascade,
  drill_id uuid not null references public.practice_drills(id) on delete cascade,
  sort_order integer not null default 0, primary key (plan_id, drill_id)
);
grant select, insert, update, delete on public.daily_practice_plans, public.practice_plan_drills to authenticated;
alter table public.daily_practice_plans enable row level security;
alter table public.practice_plan_drills enable row level security;
create policy "Authenticated users manage daily plans" on public.daily_practice_plans for all to authenticated using (true) with check (true);
create policy "Authenticated users manage plan drills" on public.practice_plan_drills for all to authenticated using (true) with check (true);
