-- Today Beta: distinguish historical baseline imports from newly detected results.

alter table public.recruit_match_results
  add column if not exists detection_status text not null default 'NEW';

alter table public.recruit_match_results
  drop constraint if exists recruit_match_results_detection_status_valid;

alter table public.recruit_match_results
  add constraint recruit_match_results_detection_status_valid check (
    detection_status in ('BASELINE', 'NEW')
  );

comment on column public.recruit_match_results.detection_status is
  'BASELINE = initial historical import when monitoring begins; NEW = discovered after baseline.';

-- Existing Today Beta imports were historical baseline loads, not recruiting alerts.
update public.recruit_match_results
set detection_status = 'BASELINE'
where detection_status = 'NEW';

-- Mark baseline established on recruits that already have stored match results.
update public.recruit_profiles rp
set external_profiles = jsonb_set(
  coalesce(external_profiles, '{}'::jsonb),
  '{trn,baselineEstablishedAt}',
  to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  true
)
where exists (
  select 1
  from public.recruit_match_results rmr
  where rmr.recruit_person_id = rp.person_id
);

create index if not exists recruit_match_results_detection_status_idx
  on public.recruit_match_results (recruit_person_id, detection_status, first_detected_at desc);
