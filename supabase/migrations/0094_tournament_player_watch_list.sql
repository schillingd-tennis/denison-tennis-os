alter table public.recruiting_tournament_participants
  add column if not exists watch_list boolean not null default false;

update public.recruiting_tournament_participants
set watch_list = true,
    evaluation_status = 'not_evaluated'
where evaluation_status = 'watch_list';
