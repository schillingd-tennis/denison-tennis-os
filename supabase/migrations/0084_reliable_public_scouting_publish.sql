-- Make the permanent player form reliable for concurrent use, automatically
-- create new opponent schools/players, and publish every successfully routed
-- submission. Also repair the Wesleyan report that was mistakenly reviewed
-- into Amherst because the review UI defaulted to its first team.

-- ---------------------------------------------------------------------------
-- 1) Repair Wesleyan identity and the affected production submission/report.
-- ---------------------------------------------------------------------------
delete from public.scouting_team_aliases
where normalized_alias in ('wesleyan', 'wesleyan university')
  and team_id in (
    select id from public.scouting_teams
    where public.scouting_normalize_alias(display_name) <> 'wesleyan'
  );

insert into public.scouting_teams (import_key, display_name, identity_slug)
values ('scouting-canon-wesleyan', 'Wesleyan', 'wesleyan-connecticut')
on conflict (display_name) do update
set identity_slug = coalesce(public.scouting_teams.identity_slug, excluded.identity_slug),
    updated_at = now();

insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
select t.id, public.scouting_normalize_alias(v.alias), v.alias
from public.scouting_teams t
cross join (values ('Wesleyan'), ('Wesleyan University')) v(alias)
where public.scouting_normalize_alias(t.display_name) = 'wesleyan'
on conflict (normalized_alias) do update
set team_id = excluded.team_id,
    display_alias = excluded.display_alias,
    updated_at = now();

do $$
declare
  v_team_id uuid;
  v_player_id uuid;
begin
  select id into v_team_id
  from public.scouting_teams
  where public.scouting_normalize_alias(display_name) = 'wesleyan'
  limit 1;

  insert into public.scouting_opponent_players (
    team_id, display_name, normalized_name, handedness
  )
  select
    v_team_id,
    s.opponent_display_name,
    public.scouting_normalize_alias(s.opponent_display_name),
    s.handedness
  from public.scouting_form_submissions s
  where s.id = 'c755a2bd-69d1-411c-8c90-54017601337c'::uuid
  on conflict on constraint scouting_opponent_players_team_name_unique do update
    set handedness = coalesce(public.scouting_opponent_players.handedness, excluded.handedness),
        updated_at = now()
  returning id into v_player_id;

  update public.scouting_direct_reports
  set team_id = v_team_id,
      opponent_player_id = v_player_id,
      import_status = 'imported',
      updated_at = now()
  where form_submission_id = 'c755a2bd-69d1-411c-8c90-54017601337c'::uuid;

  update public.scouting_form_submissions
  set status = 'published',
      resolved_team_id = v_team_id,
      resolved_opponent_player_id = v_player_id,
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
  where id = 'c755a2bd-69d1-411c-8c90-54017601337c'::uuid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Prepare general-link submissions before the existing promotion function.
-- Unknown schools become canonical workspaces; clean singles names become
-- opponent players. Specialized team/player links retain their scoped routing.
-- ---------------------------------------------------------------------------
create or replace function public.scouting_prepare_public_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.scouting_form_links%rowtype;
  v_team_id uuid;
  v_norm_team text := public.scouting_normalize_alias(new.team_display_name);
  v_norm_player text := public.scouting_normalize_alias(new.opponent_display_name);
begin
  select * into v_link from public.scouting_form_links where id = new.form_link_id;
  if v_link.team_id is not null or v_link.opponent_player_id is not null then
    return new;
  end if;

  if v_norm_team = '' then
    raise exception 'missing_team';
  end if;

  select a.team_id into v_team_id
  from public.scouting_team_aliases a
  where a.normalized_alias = v_norm_team
  limit 1;

  if v_team_id is null then
    select t.id into v_team_id
    from public.scouting_teams t
    where public.scouting_normalize_alias(t.display_name) = v_norm_team
    limit 1;
  end if;

  if v_team_id is null then
    insert into public.scouting_teams (import_key, display_name)
    values ('public-form-team-' || md5(v_norm_team), trim(new.team_display_name))
    on conflict (import_key) do update set updated_at = now()
    returning id into v_team_id;
  end if;

  insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
  values (v_team_id, v_norm_team, trim(new.team_display_name))
  on conflict (normalized_alias) do nothing;

  if public.scouting_is_clean_single_player_name(new.opponent_display_name) then
    insert into public.scouting_opponent_players (
      team_id, display_name, normalized_name, handedness
    ) values (
      v_team_id, trim(new.opponent_display_name), v_norm_player, new.handedness
    )
    on conflict on constraint scouting_opponent_players_team_name_unique do update
      set handedness = coalesce(public.scouting_opponent_players.handedness, excluded.handedness),
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists scouting_prepare_public_submission_trigger
on public.scouting_form_submissions;
create trigger scouting_prepare_public_submission_trigger
before insert on public.scouting_form_submissions
for each row execute function public.scouting_prepare_public_submission();

-- Any submission with a successfully created Match Report is published. This
-- also covers doubles/team-level reports, which intentionally have no player FK.
create or replace function public.scouting_autopublish_promoted_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.promoted_direct_report_id is not null
     and new.status not in ('archived', 'rejected') then
    new.status := 'published';
    new.reviewed_at := coalesce(new.reviewed_at, now());
    perform public.scouting_mark_ai_stale_for_promotion(
      new.resolved_team_id,
      new.resolved_opponent_player_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists scouting_autopublish_promoted_submission_trigger
on public.scouting_form_submissions;
create trigger scouting_autopublish_promoted_submission_trigger
before update of promoted_direct_report_id on public.scouting_form_submissions
for each row execute function public.scouting_autopublish_promoted_submission();

-- ---------------------------------------------------------------------------
-- 3) Rate-limit per device rather than sharing one eight-post bucket across
-- every Denison player using the permanent link.
-- ---------------------------------------------------------------------------
create or replace function public.scouting_submit_form_response(
  p_token_hash text,
  p_opponent_display_name text,
  p_team_display_name text,
  p_match_date date,
  p_handedness text,
  p_strengths_weaknesses text,
  p_scouting_report text,
  p_report_by text,
  p_is_doubles boolean,
  p_client_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := lower(trim(p_token_hash));
  v_link public.scouting_form_links%rowtype;
  v_window timestamptz := date_trunc('minute', now());
  v_bucket text;
  v_hits integer;
  v_id uuid;
begin
  if v_hash is null or length(v_hash) < 32 then raise exception 'invalid_token'; end if;
  select * into v_link from public.scouting_form_links where token_hash = v_hash;
  if not found then raise exception 'invalid_token'; end if;
  if v_link.revoked_at is not null then raise exception 'revoked_token'; end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then raise exception 'expired_token'; end if;

  v_bucket := v_hash || ':' || coalesce(nullif(trim(p_client_fingerprint), ''), 'anonymous');
  insert into public.scouting_form_rate_limits (bucket_key, window_started_at, hit_count)
  values (v_bucket, v_window, 1)
  on conflict (bucket_key, window_started_at)
  do update set hit_count = public.scouting_form_rate_limits.hit_count + 1
  returning hit_count into v_hits;
  if v_hits > 12 then raise exception 'rate_limited'; end if;

  if p_handedness is not null and p_handedness not in ('Right', 'Left') then
    raise exception 'invalid_handedness';
  end if;
  if coalesce(trim(p_team_display_name), '') = '' then raise exception 'missing_team'; end if;
  if coalesce(trim(p_opponent_display_name), '') = ''
     and coalesce(trim(p_strengths_weaknesses), '') = ''
     and coalesce(trim(p_scouting_report), '') = '' then
    raise exception 'empty_submission';
  end if;

  insert into public.scouting_form_submissions (
    form_link_id, status, opponent_display_name, team_display_name, match_date,
    handedness, strengths_weaknesses, scouting_report, report_by, is_doubles,
    client_fingerprint
  ) values (
    v_link.id, 'new', coalesce(p_opponent_display_name, ''),
    coalesce(p_team_display_name, ''), p_match_date, p_handedness,
    p_strengths_weaknesses, p_scouting_report, p_report_by,
    coalesce(p_is_doubles, false), p_client_fingerprint
  ) returning id into v_id;

  perform public.scouting_promote_form_submission(v_id);
  return v_id;
end;
$$;

revoke all on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) from public;
grant execute on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) to anon, authenticated;

comment on function public.scouting_prepare_public_submission() is
  'Creates a canonical opponent school/player for a permanent-link form submission before automatic promotion.';
