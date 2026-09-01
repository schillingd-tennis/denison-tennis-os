-- Today Beta UTR v0.1: cross-source match result fields (no separate UTR table).

alter table public.recruit_match_results
  add column if not exists external_match_id text,
  add column if not exists recruit_rating text,
  add column if not exists opponent_rating text,
  add column if not exists rating_type text;

alter table public.recruit_match_results
  drop constraint if exists recruit_match_results_rating_type_valid;

alter table public.recruit_match_results
  add constraint recruit_match_results_rating_type_valid check (
    rating_type is null or rating_type in ('UTR', 'TRN')
  );

create index if not exists recruit_match_results_external_match_id_idx
  on public.recruit_match_results (recruit_person_id, external_match_id)
  where external_match_id is not null;

comment on column public.recruit_match_results.external_match_id is
  'Stable match id from external source (e.g. UTR match id) when available.';
comment on column public.recruit_match_results.recruit_rating is
  'Recruit rating at match time (UTR). Kept separate from TRN ranking fields.';
comment on column public.recruit_match_results.opponent_rating is
  'Opponent UTR rating at match time. Do not store in opponent_ranking (TRN).';
comment on column public.recruit_match_results.rating_type is
  'Rating system for recruit_rating/opponent_rating (UTR or TRN).';

comment on column public.recruit_profiles.external_profiles is
  'External tennis profile links (Today Beta). Shape: { trn: {...}, utr: { playerId, profileUrl, resultsUrl, lastCheckedAt, lastImportedAt, baselineEstablishedAt } }.';
