-- Today Beta: tournament opportunity actions on contact_opportunity_actions.

alter table public.contact_opportunity_actions
  add column if not exists upcoming_tournament_id uuid references public.recruit_upcoming_tournaments (id) on delete cascade;

alter table public.contact_opportunity_actions
  drop constraint if exists contact_opportunity_actions_type_valid;

alter table public.contact_opportunity_actions
  add constraint contact_opportunity_actions_type_valid check (
    opportunity_type in ('RESULT', 'CADENCE', 'TOURNAMENT')
  );

alter table public.contact_opportunity_actions
  drop constraint if exists contact_opportunity_actions_result_requires_match;

alter table public.contact_opportunity_actions
  add constraint contact_opportunity_actions_result_requires_match check (
    opportunity_type <> 'RESULT' or match_result_id is not null
  );

alter table public.contact_opportunity_actions
  add constraint contact_opportunity_actions_tournament_requires_id check (
    opportunity_type <> 'TOURNAMENT' or upcoming_tournament_id is not null
  );

create index if not exists contact_opportunity_actions_upcoming_tournament_idx
  on public.contact_opportunity_actions (upcoming_tournament_id)
  where upcoming_tournament_id is not null;

create unique index if not exists contact_opportunity_actions_tournament_handled_unique
  on public.contact_opportunity_actions (upcoming_tournament_id, action)
  where opportunity_type = 'TOURNAMENT' and action in ('HANDLED', 'DISMISSED');
