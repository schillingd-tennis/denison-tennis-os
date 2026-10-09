-- Structured singles / doubles details for the public scouting form.
-- The existing token resolver remains the authority for team routing.

alter table public.scouting_form_submissions
  add column if not exists report_type text not null default 'singles',
  add column if not exists doubles_details jsonb not null default '{}'::jsonb;

alter table public.scouting_form_submissions
  drop constraint if exists scouting_form_submissions_report_type_check;
alter table public.scouting_form_submissions
  add constraint scouting_form_submissions_report_type_check
  check (report_type in ('singles', 'doubles'));

alter table public.scouting_direct_reports
  add column if not exists report_type text not null default 'singles',
  add column if not exists doubles_details jsonb not null default '{}'::jsonb;

alter table public.scouting_direct_reports
  drop constraint if exists scouting_direct_reports_report_type_check;
alter table public.scouting_direct_reports
  add constraint scouting_direct_reports_report_type_check
  check (report_type in ('singles', 'doubles'));

update public.scouting_form_submissions
set report_type = case when is_doubles then 'doubles' else 'singles' end
where report_type <> case when is_doubles then 'doubles' else 'singles' end;

update public.scouting_direct_reports
set report_type = case when is_doubles then 'doubles' else 'singles' end
where report_type <> case when is_doubles then 'doubles' else 'singles' end;

create or replace function public.scouting_copy_submission_match_format()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_submission public.scouting_form_submissions%rowtype;
begin
  if new.form_submission_id is null then
    new.report_type := case when new.is_doubles then 'doubles' else 'singles' end;
    return new;
  end if;

  select * into v_submission
  from public.scouting_form_submissions
  where id = new.form_submission_id;

  if found then
    new.report_type := v_submission.report_type;
    new.doubles_details := v_submission.doubles_details;
  end if;
  return new;
end;
$$;

drop trigger if exists scouting_direct_reports_copy_match_format on public.scouting_direct_reports;
create trigger scouting_direct_reports_copy_match_format
before insert or update of form_submission_id on public.scouting_direct_reports
for each row execute function public.scouting_copy_submission_match_format();

create or replace function public.scouting_submit_form_response_v2(
  p_token_hash text,
  p_opponent_display_name text,
  p_team_display_name text,
  p_match_date date,
  p_handedness text,
  p_strengths_weaknesses text,
  p_scouting_report text,
  p_report_by text,
  p_is_doubles boolean,
  p_client_fingerprint text,
  p_report_type text,
  p_doubles_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_report_type text := lower(coalesce(trim(p_report_type), 'singles'));
  v_details jsonb := coalesce(p_doubles_details, '{}'::jsonb);
begin
  if v_report_type not in ('singles', 'doubles') then
    raise exception 'invalid_report_type';
  end if;

  if v_report_type = 'doubles' then
    if coalesce(trim(v_details->>'opponentTwoName'), '') = '' then
      raise exception 'missing_doubles_opponent';
    end if;
    if coalesce(v_details->>'deuceSide', '') not in ('opponent_1', 'opponent_2')
      or coalesce(v_details->>'adSide', '') not in ('opponent_1', 'opponent_2')
      or v_details->>'deuceSide' = v_details->>'adSide' then
      raise exception 'invalid_doubles_sides';
    end if;
    if coalesce(v_details->>'servesFirst', '') not in ('opponent_1', 'opponent_2') then
      raise exception 'invalid_first_server';
    end if;
  else
    v_details := '{}'::jsonb;
  end if;

  v_id := public.scouting_submit_form_response(
    p_token_hash,
    p_opponent_display_name,
    p_team_display_name,
    p_match_date,
    p_handedness,
    p_strengths_weaknesses,
    p_scouting_report,
    p_report_by,
    v_report_type = 'doubles',
    p_client_fingerprint
  );

  update public.scouting_form_submissions
  set report_type = v_report_type,
      doubles_details = v_details,
      updated_at = now()
  where id = v_id;

  -- Auto-promotion may already have created the workspace report. Keep its
  -- structured match details synchronized with the original submission.
  update public.scouting_direct_reports
  set report_type = v_report_type,
      doubles_details = v_details,
      updated_at = now()
  where form_submission_id = v_id;

  return v_id;
end;
$$;

revoke all on function public.scouting_submit_form_response_v2(text, text, text, date, text, text, text, text, boolean, text, text, jsonb) from public;
grant execute on function public.scouting_submit_form_response_v2(text, text, text, date, text, text, text, text, boolean, text, text, jsonb) to anon, authenticated;

comment on function public.scouting_submit_form_response_v2 is
  'Tokenized public scouting submit with structured singles/doubles details; preserves automatic team workspace promotion.';
