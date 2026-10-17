alter table public.tennis_data_jobs
  drop constraint if exists tennis_data_jobs_scope_valid;

alter table public.tennis_data_jobs
  drop constraint if exists tennis_data_jobs_scope_check;

alter table public.tennis_data_jobs
  add constraint tennis_data_jobs_scope_valid
  check (scope in ('recruits', 'team', 'tournament'));
