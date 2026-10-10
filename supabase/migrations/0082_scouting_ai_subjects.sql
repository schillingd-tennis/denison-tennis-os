alter table public.scouting_team_reports
  add column if not exists quick_summary_bullets text[] not null default '{}',
  add column if not exists subject_type text not null default 'team',
  add column if not exists subject_key text not null default 'team',
  add column if not exists subject_label text not null default '',
  add column if not exists included_subject_keys text[] not null default '{}';

alter table public.scouting_team_reports
  drop constraint if exists scouting_team_reports_subject_type_check;
alter table public.scouting_team_reports
  add constraint scouting_team_reports_subject_type_check
  check (subject_type in ('team', 'doubles'));

drop index if exists public.scouting_team_reports_one_ai;
create unique index if not exists scouting_team_reports_one_ai_subject
  on public.scouting_team_reports (team_id, subject_type, subject_key)
  where kind = 'ai_generated';
