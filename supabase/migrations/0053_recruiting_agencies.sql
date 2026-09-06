-- Recruiting agencies and their agents. Additive and safe to re-run.
create table if not exists public.recruiting_agencies (
  id uuid primary key default gen_random_uuid(),
  import_key text unique,
  name text not null,
  city text,
  state text,
  website text,
  phone text,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists recruiting_agencies_name_unique
  on public.recruiting_agencies (lower(name));

create table if not exists public.recruiting_agents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.recruiting_agencies(id) on delete restrict,
  import_key text unique,
  first_name text not null,
  last_name text not null,
  title text,
  email text,
  phone text,
  city text,
  state text,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiting_agents_agency_idx on public.recruiting_agents (agency_id);
create index if not exists recruiting_agents_name_idx on public.recruiting_agents (last_name, first_name);
create unique index if not exists recruiting_agents_natural_unique
  on public.recruiting_agents (agency_id, lower(first_name), lower(last_name), lower(coalesce(email, '')));

alter table public.recruiting_agents alter column agency_id drop not null;

grant select, insert, update, delete on public.recruiting_agencies, public.recruiting_agents to authenticated;
alter table public.recruiting_agencies enable row level security;
alter table public.recruiting_agents enable row level security;

drop policy if exists "Authenticated users manage recruiting agencies" on public.recruiting_agencies;
create policy "Authenticated users manage recruiting agencies" on public.recruiting_agencies
  for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users manage recruiting agents" on public.recruiting_agents;
create policy "Authenticated users manage recruiting agents" on public.recruiting_agents
  for all to authenticated using (true) with check (true);

comment on table public.recruiting_agencies is 'Recruiting agencies; import_key supports idempotent source imports.';
comment on table public.recruiting_agents is 'Agents belonging to recruiting agencies; one agency may have many agents.';
