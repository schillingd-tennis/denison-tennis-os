-- Preserve raw TRN tournament date text alongside normalized tournament_date.

alter table public.recruit_match_results
  add column if not exists tournament_date_raw text;

comment on column public.recruit_match_results.tournament_date_raw is
  'Original TRN tournament date text from paste (e.g. "August 21-24, 2026").';
