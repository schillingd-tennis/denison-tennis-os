-- Additive: store Overview Quick AI bullets with the canonical player AI report.
alter table public.scouting_player_reports
  add column if not exists quick_summary_bullets text[] not null default '{}';
