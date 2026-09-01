-- Direct tournament/event page URL when known (distinct from source_url player profile).

alter table public.recruit_match_results
  add column if not exists tournament_url text;

comment on column public.recruit_match_results.tournament_url is
  'Direct link to tournament/event page when known (e.g. UTR app.utrsports.net/events/{id}). Distinct from source_url.';
