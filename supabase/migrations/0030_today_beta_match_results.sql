-- Today Beta v0.1: external TRN profiles on recruit profiles + manual match results.

alter table public.recruit_profiles
  add column if not exists external_profiles jsonb not null default '{}'::jsonb;

comment on column public.recruit_profiles.external_profiles is
  'External tennis profile links (Today Beta). Shape: { "trn": { "playerId", "profileUrl", "lastImportedAt" } }.';

create table if not exists public.recruit_match_results (
  id uuid primary key default gen_random_uuid(),
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  source text not null default 'trn_manual',
  tournament_name text,
  tournament_date date,
  round text,
  opponent_name text,
  opponent_ranking text,
  score text,
  result text not null default 'UNKNOWN',
  source_url text,
  first_detected_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  result_fingerprint text not null,
  needs_review boolean not null default false,
  parse_warnings text[] not null default '{}'::text[],
  constraint recruit_match_results_result_valid check (
    result in ('WIN', 'LOSS', 'UNKNOWN')
  ),
  constraint recruit_match_results_fingerprint_unique unique (recruit_person_id, result_fingerprint)
);

create index if not exists recruit_match_results_recruit_date_idx
  on public.recruit_match_results (recruit_person_id, tournament_date desc nulls last);

create index if not exists recruit_match_results_first_detected_idx
  on public.recruit_match_results (first_detected_at desc);

alter table public.recruit_match_results enable row level security;

drop policy if exists "Allow authenticated recruit match result access" on public.recruit_match_results;
create policy "Allow authenticated recruit match result access"
  on public.recruit_match_results for all to authenticated
  using (true) with check (true);

drop policy if exists "Allow anon recruit match result read access" on public.recruit_match_results;
create policy "Allow anon recruit match result read access"
  on public.recruit_match_results for select to anon using (true);

grant select on table public.recruit_match_results to anon;
grant select, insert, update, delete on table public.recruit_match_results to authenticated;
grant select, insert, update, delete on table public.recruit_match_results to service_role;

comment on table public.recruit_match_results is
  'Today Beta: manually imported recruit match results (TRN paste workflow).';
