-- Delete a form submission and its promoted Match Report as one authenticated,
-- atomic operation. This prevents orphan reports and stale player/team AI.

create or replace function public.scouting_delete_form_submission(p_submission_id uuid)
returns table (deleted_report_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.scouting_form_submissions%rowtype;
  v_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_submission_id is null then
    raise exception 'invalid_submission';
  end if;

  select * into v_submission
  from public.scouting_form_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'submission_not_found';
  end if;

  perform public.scouting_mark_ai_stale_for_promotion(
    v_submission.resolved_team_id,
    v_submission.resolved_opponent_player_id
  );

  delete from public.scouting_direct_reports
  where form_submission_id = p_submission_id
     or id = v_submission.promoted_direct_report_id;
  get diagnostics v_deleted = row_count;

  delete from public.scouting_form_submissions
  where id = p_submission_id;

  deleted_report_count := v_deleted;
  return next;
end;
$$;

revoke all on function public.scouting_delete_form_submission(uuid) from public;
revoke all on function public.scouting_delete_form_submission(uuid) from anon;
grant execute on function public.scouting_delete_form_submission(uuid) to authenticated;

comment on function public.scouting_delete_form_submission(uuid) is
  'Permanently deletes one form submission and any promoted direct report in the same transaction.';
