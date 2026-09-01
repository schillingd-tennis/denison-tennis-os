-- Today Beta v0.1: persistent Contact Today opportunity actions (handled, dismiss, snooze).

create table if not exists public.contact_opportunity_actions (
  id uuid primary key default gen_random_uuid(),
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  opportunity_type text not null,
  action text not null,
  match_result_id uuid references public.recruit_match_results (id) on delete cascade,
  interaction_id uuid references public.recruiting_interactions (id) on delete set null,
  snooze_until timestamptz,
  acted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint contact_opportunity_actions_type_valid check (
    opportunity_type in ('RESULT', 'CADENCE')
  ),
  constraint contact_opportunity_actions_action_valid check (
    action in ('HANDLED', 'DISMISSED', 'SNOOZED')
  ),
  constraint contact_opportunity_actions_snooze_requires_until check (
    action <> 'SNOOZED' or snooze_until is not null
  ),
  constraint contact_opportunity_actions_result_requires_match check (
    opportunity_type <> 'RESULT' or match_result_id is not null
  )
);

create index if not exists contact_opportunity_actions_recruit_idx
  on public.contact_opportunity_actions (recruit_person_id, acted_at desc);

create index if not exists contact_opportunity_actions_match_result_idx
  on public.contact_opportunity_actions (match_result_id)
  where match_result_id is not null;

create unique index if not exists contact_opportunity_actions_result_handled_unique
  on public.contact_opportunity_actions (match_result_id, action)
  where opportunity_type = 'RESULT' and action in ('HANDLED', 'DISMISSED');

alter table public.contact_opportunity_actions enable row level security;

drop policy if exists "Allow authenticated contact opportunity action access"
  on public.contact_opportunity_actions;
create policy "Allow authenticated contact opportunity action access"
  on public.contact_opportunity_actions for all to authenticated
  using (true) with check (true);

drop policy if exists "Allow anon contact opportunity action read access"
  on public.contact_opportunity_actions;
create policy "Allow anon contact opportunity action read access"
  on public.contact_opportunity_actions for select to anon using (true);

grant select on table public.contact_opportunity_actions to anon;
grant select, insert, update, delete on table public.contact_opportunity_actions to authenticated;
grant select, insert, update, delete on table public.contact_opportunity_actions to service_role;

comment on table public.contact_opportunity_actions is
  'Today Beta: persistent handled, dismiss, and snooze actions for Contact Today opportunities.';
