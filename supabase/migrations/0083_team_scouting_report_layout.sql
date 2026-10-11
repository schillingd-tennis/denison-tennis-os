alter table public.scouting_team_reports
  add column if not exists report_sections jsonb not null default '[]'::jsonb,
  add column if not exists layout_pages integer not null default 2;

alter table public.scouting_team_reports
  drop constraint if exists scouting_team_reports_layout_pages_check;
alter table public.scouting_team_reports
  add constraint scouting_team_reports_layout_pages_check check (layout_pages in (1, 2));

comment on column public.scouting_team_reports.report_sections is
  'Ordered AI-generated singles and doubles subject summaries for print-oriented team scouting reports.';
