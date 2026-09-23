-- Backfill: promote pre-0068 form submissions into canonical reports.
-- Does not modify 0068. Does not include UTR (0067 / future 0070+).
-- Idempotent: safe to rerun; never duplicates reports or players.
-- Diagnostics are counts-only (no private scouting report content).

begin;

-- ---------------------------------------------------------------------------
-- Batch reprocess eligible unpromoted submissions (counts-only)
-- ---------------------------------------------------------------------------
create or replace function public.scouting_backfill_unpromoted_submissions()
returns table (
  inspected integer,
  published integer,
  needs_review integer,
  already_promoted integer,
  failures integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_outcome text;
  v_status text;
  v_inspected integer := 0;
  v_published integer := 0;
  v_needs_review integer := 0;
  v_already integer := 0;
  v_failures integer := 0;
  v_linked integer := 0;
begin
  -- Repair: link submissions that already have a report by form_submission_id
  -- but are missing promoted_direct_report_id (no new reports / players).
  with repaired as (
    update public.scouting_form_submissions s
    set promoted_direct_report_id = r.id,
        resolved_team_id = coalesce(s.resolved_team_id, r.team_id),
        resolved_opponent_player_id = coalesce(s.resolved_opponent_player_id, r.opponent_player_id),
        updated_at = now()
    from public.scouting_direct_reports r
    where r.form_submission_id = s.id
      and s.promoted_direct_report_id is null
    returning s.id
  )
  select count(*)::integer into v_linked from repaired;
  v_already := v_already + coalesce(v_linked, 0);

  for v_id in
    select s.id
    from public.scouting_form_submissions s
    where s.promoted_direct_report_id is null
      and s.status in ('new', 'reviewed', 'needs_clarification', 'needs_review')
      and not exists (
        select 1
        from public.scouting_direct_reports r
        where r.form_submission_id = s.id
      )
    order by s.created_at asc, s.id asc
  loop
    v_inspected := v_inspected + 1;
    begin
      select p.outcome, p.submission_status
        into v_outcome, v_status
      from public.scouting_promote_form_submission(v_id) p
      limit 1;

      if v_outcome = 'already_promoted' then
        v_already := v_already + 1;
      elsif coalesce(v_status, '') = 'published' or coalesce(v_outcome, '') like 'published_%' then
        v_published := v_published + 1;
      elsif coalesce(v_status, '') = 'needs_review' or coalesce(v_outcome, '') like 'needs_review_%' then
        v_needs_review := v_needs_review + 1;
      elsif coalesce(v_outcome, '') like 'skipped_%' then
        null;
      else
        v_needs_review := v_needs_review + 1;
      end if;
    exception
      when others then
        v_failures := v_failures + 1;
    end;
  end loop;

  -- Counts only — never log private scouting report content
  raise notice 'scouting_backfill_unpromoted_submissions inspected=% published=% needs_review=% already_promoted=% failures=%',
    v_inspected, v_published, v_needs_review, v_already, v_failures;

  inspected := v_inspected;
  published := v_published;
  needs_review := v_needs_review;
  already_promoted := v_already;
  failures := v_failures;
  return next;
end;
$$;

revoke all on function public.scouting_backfill_unpromoted_submissions() from public;
revoke all on function public.scouting_backfill_unpromoted_submissions() from anon;
grant execute on function public.scouting_backfill_unpromoted_submissions() to authenticated;

comment on function public.scouting_backfill_unpromoted_submissions() is
  'Idempotent promote of eligible legacy submissions; returns counts only.';

-- ---------------------------------------------------------------------------
-- One-time migration invoke (same function coaches can rerun later)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  select * into r from public.scouting_backfill_unpromoted_submissions();
  raise notice '0069 migration backfill complete inspected=% published=% needs_review=% already_promoted=% failures=%',
    r.inspected, r.published, r.needs_review, r.already_promoted, r.failures;
end $$;

commit;
