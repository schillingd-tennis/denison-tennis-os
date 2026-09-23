-- Submission → main Scouting promotion + canonical school aliases.
-- Additive only. Does not merge/delete production teams or submissions.
-- Leaves 0067 (UTR) untouched.

-- ---------------------------------------------------------------------------
-- 1) Canonical school aliases
-- ---------------------------------------------------------------------------
create table if not exists public.scouting_team_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.scouting_teams(id) on delete restrict,
  normalized_alias text not null,
  display_alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_team_aliases_normalized_unique unique (normalized_alias)
);

create index if not exists scouting_team_aliases_team_idx
  on public.scouting_team_aliases (team_id);

comment on table public.scouting_team_aliases is
  'Exact normalized aliases for scouting_teams; no fuzzy merge. ON DELETE RESTRICT preserves history.';

grant select on table public.scouting_team_aliases to authenticated;
grant insert, update, delete on table public.scouting_team_aliases to authenticated;

alter table public.scouting_team_aliases enable row level security;

drop policy if exists "Authenticated users can read scouting team aliases" on public.scouting_team_aliases;
create policy "Authenticated users can read scouting team aliases"
  on public.scouting_team_aliases for select to authenticated using (true);

drop policy if exists "Authenticated users can write scouting team aliases" on public.scouting_team_aliases;
create policy "Authenticated users can write scouting team aliases"
  on public.scouting_team_aliases for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2) Direct report ↔ submission one-to-one link
-- ---------------------------------------------------------------------------
alter table public.scouting_direct_reports
  add column if not exists form_submission_id uuid
    references public.scouting_form_submissions(id) on delete set null;

create unique index if not exists scouting_direct_reports_form_submission_uidx
  on public.scouting_direct_reports (form_submission_id)
  where form_submission_id is not null;

comment on column public.scouting_direct_reports.form_submission_id is
  'Nullable 1:1 link to the immutable form submission that promoted this report.';

-- ---------------------------------------------------------------------------
-- 3) Submission lifecycle (keep legacy values readable)
-- ---------------------------------------------------------------------------
alter table public.scouting_form_submissions
  drop constraint if exists scouting_form_submissions_status_check;

alter table public.scouting_form_submissions
  add constraint scouting_form_submissions_status_check check (
    status in (
      'new',
      'needs_review',
      'published',
      'archived',
      'rejected',
      'reviewed',
      'needs_clarification'
    )
  );

alter table public.scouting_form_submissions
  add column if not exists resolved_team_id uuid
    references public.scouting_teams(id) on delete set null;

alter table public.scouting_form_submissions
  add column if not exists resolved_opponent_player_id uuid
    references public.scouting_opponent_players(id) on delete set null;

alter table public.scouting_form_submissions
  add column if not exists promoted_direct_report_id uuid
    references public.scouting_direct_reports(id) on delete set null;

create index if not exists scouting_form_submissions_resolved_team_idx
  on public.scouting_form_submissions (resolved_team_id);

create index if not exists scouting_form_submissions_promoted_report_idx
  on public.scouting_form_submissions (promoted_direct_report_id);

-- ---------------------------------------------------------------------------
-- 4) Ensure canonical teams for required alias institutions (idempotent)
-- ---------------------------------------------------------------------------
insert into public.scouting_teams (import_key, display_name, identity_slug)
select v.import_key, v.display_name, v.identity_slug
from (values
  ('scouting-canon-amherst', 'Amherst', 'amherst'),
  ('scouting-canon-cwru', 'CWRU', 'case-western'),
  ('scouting-canon-cmu', 'Carnegie Mellon', 'carnegie-mellon'),
  ('scouting-canon-kenyon', 'Kenyon', 'kenyon'),
  ('scouting-canon-depauw', 'DePauw', 'depauw'),
  ('scouting-canon-denison', 'Denison', 'denison')
) as v(import_key, display_name, identity_slug)
where not exists (
  select 1 from public.scouting_teams t
  where lower(t.display_name) = lower(v.display_name)
)
on conflict (import_key) do nothing;

-- Prefer existing seeded rows by display_name when import_key seed already existed.
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'amherst')
  where lower(display_name) in ('amherst', 'amherst college');
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'case-western')
  where lower(display_name) in ('cwru', 'case western', 'case western reserve', 'case western reserve university');
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'carnegie-mellon')
  where lower(display_name) in ('carnegie mellon', 'carnegie mellon university', 'cmu');
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'kenyon')
  where lower(display_name) in ('kenyon', 'kenyon college');
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'depauw')
  where lower(display_name) in ('depauw', 'depauw university');
update public.scouting_teams set identity_slug = coalesce(identity_slug, 'denison')
  where lower(display_name) in ('denison', 'denison university');

-- ---------------------------------------------------------------------------
-- 5) Seed aliases (exact normalized keys; unique globally)
-- ---------------------------------------------------------------------------
create or replace function public.scouting_normalize_alias(p_value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(coalesce(p_value, '')), '\s+', ' ', 'g'));
$$;

revoke all on function public.scouting_normalize_alias(text) from public;
grant execute on function public.scouting_normalize_alias(text) to authenticated;

insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
select t.id, public.scouting_normalize_alias(v.display_alias), v.display_alias
from (
  values
    ('amherst', 'Amherst'),
    ('amherst', 'Amherst College'),
    ('case-western', 'Case'),
    ('case-western', 'Case Western'),
    ('case-western', 'Case Western Reserve'),
    ('case-western', 'CWRU'),
    ('carnegie-mellon', 'Carnegie Mellon'),
    ('carnegie-mellon', 'CMU'),
    ('kenyon', 'Kenyon'),
    ('kenyon', 'Kenyon College'),
    ('kenyon', 'KEN'),
    ('depauw', 'DePauw'),
    ('depauw', 'Depauw'),
    ('depauw', 'DPU'),
    ('denison', 'Denison'),
    ('denison', 'DEN')
) as v(identity_slug, display_alias)
join lateral (
  select id
  from public.scouting_teams
  where identity_slug = v.identity_slug
  order by created_at asc
  limit 1
) t on true
on conflict (normalized_alias) do nothing;

-- ---------------------------------------------------------------------------
-- 6) Helpers: clean single-player name (mirrors csvImport conservatism)
-- ---------------------------------------------------------------------------
create or replace function public.scouting_is_clean_single_player_name(p_name text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_trim text := trim(coalesce(p_name, ''));
  v_parts int;
begin
  if v_trim = '' then
    return false;
  end if;
  if v_trim ~* '^TEAM\b' then
    return false;
  end if;
  if v_trim ~* '\mand\m' or v_trim ~* '\s/\s' or v_trim ~ '/' or v_trim ~* '\s&\s' or v_trim ~ '\+' then
    return false;
  end if;
  if v_trim ~ ',\s*[A-Z]' then
    return false;
  end if;
  v_parts := cardinality(regexp_split_to_array(v_trim, '\s+'));
  if v_parts >= 4 then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.scouting_is_clean_single_player_name(text) from public;
grant execute on function public.scouting_is_clean_single_player_name(text) to authenticated;

create or replace function public.scouting_player_form_source_key(p_submission_id uuid)
returns text
language sql
immutable
as $$
  select md5('player_form:' || p_submission_id::text);
$$;

revoke all on function public.scouting_player_form_source_key(uuid) from public;
grant execute on function public.scouting_player_form_source_key(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Mark AI summaries stale (player + team) without touching reviewed manual
-- ---------------------------------------------------------------------------
create or replace function public.scouting_mark_ai_stale_for_promotion(
  p_team_id uuid,
  p_opponent_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_opponent_player_id is not null then
    update public.scouting_player_reports
    set stale = true, updated_at = now()
    where opponent_player_id = p_opponent_player_id
      and kind = 'ai_generated';
  end if;
  if p_team_id is not null then
    update public.scouting_team_reports
    set stale = true, updated_at = now()
    where team_id = p_team_id
      and kind = 'ai_generated';
  end if;
end;
$$;

revoke all on function public.scouting_mark_ai_stale_for_promotion(uuid, uuid) from public;
revoke all on function public.scouting_mark_ai_stale_for_promotion(uuid, uuid) from anon, authenticated;
-- Internal helper: callable only by other SECURITY DEFINER scouting functions (table owner).

-- ---------------------------------------------------------------------------
-- 8) Core promotion (idempotent). Used by public submit + authenticated reprocess.
-- ---------------------------------------------------------------------------
create or replace function public.scouting_promote_form_submission(p_submission_id uuid)
returns table (
  direct_report_id uuid,
  submission_status text,
  outcome text,
  team_id uuid,
  opponent_player_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.scouting_form_submissions%rowtype;
  v_link public.scouting_form_links%rowtype;
  v_team_id uuid;
  v_player_id uuid;
  v_norm_player text;
  v_norm_team text;
  v_source_key text;
  v_report_id uuid;
  v_import_status text;
  v_sub_status text;
  v_outcome text;
  v_created_player boolean := false;
  v_existing_id uuid;
begin
  if p_submission_id is null then
    raise exception 'invalid_submission';
  end if;

  select * into v_sub from public.scouting_form_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'invalid_submission';
  end if;

  -- Archived / rejected stay inbox-only; never delete promoted report.
  if v_sub.status in ('archived', 'rejected') then
    direct_report_id := v_sub.promoted_direct_report_id;
    submission_status := v_sub.status;
    outcome := 'skipped_' || v_sub.status;
    team_id := v_sub.resolved_team_id;
    opponent_player_id := v_sub.resolved_opponent_player_id;
    return next;
    return;
  end if;

  -- Idempotent: already linked report
  select id into v_existing_id
  from public.scouting_direct_reports
  where form_submission_id = p_submission_id
  limit 1;
  if v_existing_id is not null then
    direct_report_id := v_existing_id;
    submission_status := v_sub.status;
    outcome := 'already_promoted';
    team_id := v_sub.resolved_team_id;
    opponent_player_id := v_sub.resolved_opponent_player_id;
    return next;
    return;
  end if;

  select * into v_link from public.scouting_form_links where id = v_sub.form_link_id;
  if not found then
    raise exception 'invalid_form_link';
  end if;

  v_norm_player := public.scouting_normalize_alias(v_sub.opponent_display_name);
  v_norm_team := public.scouting_normalize_alias(v_sub.team_display_name);
  v_source_key := public.scouting_player_form_source_key(p_submission_id);

  -- Priority 1: player-scoped form link
  if v_link.opponent_player_id is not null then
    select p.id, p.team_id into v_player_id, v_team_id
    from public.scouting_opponent_players p
    where p.id = v_link.opponent_player_id;
    if v_player_id is null then
      v_outcome := 'needs_review_broken_player_link';
    else
      v_outcome := 'published_player_link';
      v_import_status := 'imported';
      v_sub_status := 'published';
    end if;

  -- Priority 2: team-scoped link + exact player within that team
  elsif v_link.team_id is not null then
    v_team_id := v_link.team_id;
    if public.scouting_is_clean_single_player_name(v_sub.opponent_display_name) then
      select p.id into v_player_id
      from public.scouting_opponent_players p
      where p.team_id = v_team_id
        and p.normalized_name = v_norm_player
        and p.archived_at is null
      limit 1;
      if v_player_id is not null then
        v_outcome := 'published_team_link_player_match';
        v_import_status := 'imported';
        v_sub_status := 'published';
      else
        -- Create player under linked team; needs review
        insert into public.scouting_opponent_players (team_id, display_name, normalized_name, handedness)
        values (
          v_team_id,
          trim(v_sub.opponent_display_name),
          v_norm_player,
          v_sub.handedness
        )
        on conflict on constraint scouting_opponent_players_team_name_unique do update
          set updated_at = now()
        returning id into v_player_id;
        v_created_player := true;
        v_outcome := 'needs_review_new_player';
        v_import_status := 'unresolved_review';
        v_sub_status := 'needs_review';
      end if;
    else
      v_outcome := 'needs_review_ambiguous_player';
      v_import_status := 'compound_unresolved';
      v_sub_status := 'needs_review';
    end if;

  else
    -- Priority 3: canonical alias / identity_slug / exact display
    select a.team_id into v_team_id
    from public.scouting_team_aliases a
    where a.normalized_alias = v_norm_team
    limit 1;

    if v_team_id is null and v_norm_team <> '' then
      select t.id into v_team_id
      from public.scouting_teams t
      where public.scouting_normalize_alias(t.display_name) = v_norm_team
      limit 1;
    end if;

    if v_team_id is null and v_norm_team <> '' then
      -- shared identity via identity_slug when unique
      select t.id into v_team_id
      from public.scouting_teams t
      where t.identity_slug is not null
        and exists (
          select 1 from public.scouting_team_aliases a
          where a.team_id = t.id and a.normalized_alias = v_norm_team
        )
      limit 1;
    end if;

    if v_team_id is null then
      v_outcome := 'needs_review_unknown_team';
      v_sub_status := 'needs_review';
      -- No fake Unknown team; leave unpromoted for Match Reports hybrid inbox.
      update public.scouting_form_submissions
      set status = 'needs_review',
          reviewed_at = null,
          updated_at = now()
      where id = p_submission_id;
      direct_report_id := null;
      submission_status := 'needs_review';
      outcome := v_outcome;
      team_id := null;
      opponent_player_id := null;
      return next;
      return;
    end if;

    if public.scouting_is_clean_single_player_name(v_sub.opponent_display_name) then
      select p.id into v_player_id
      from public.scouting_opponent_players p
      where p.team_id = v_team_id
        and p.normalized_name = v_norm_player
        and p.archived_at is null
      limit 1;
      if v_player_id is not null then
        v_outcome := 'published_alias_player_match';
        v_import_status := 'imported';
        v_sub_status := 'published';
      else
        insert into public.scouting_opponent_players (team_id, display_name, normalized_name, handedness)
        values (
          v_team_id,
          trim(v_sub.opponent_display_name),
          v_norm_player,
          v_sub.handedness
        )
        on conflict on constraint scouting_opponent_players_team_name_unique do update
          set updated_at = now()
        returning id into v_player_id;
        v_created_player := true;
        v_outcome := 'needs_review_new_player';
        v_import_status := 'unresolved_review';
        v_sub_status := 'needs_review';
      end if;
    else
      v_outcome := 'needs_review_ambiguous_player';
      v_import_status := 'compound_unresolved';
      v_sub_status := 'needs_review';
    end if;
  end if;

  if v_team_id is null then
    update public.scouting_form_submissions
    set status = 'needs_review', updated_at = now()
    where id = p_submission_id;
    direct_report_id := null;
    submission_status := 'needs_review';
    outcome := coalesce(v_outcome, 'needs_review_unknown_team');
    team_id := null;
    opponent_player_id := null;
    return next;
    return;
  end if;

  insert into public.scouting_direct_reports (
    source_key, source, team_id, opponent_player_id, opponent_display_name,
    match_date, match_date_raw, handedness, handedness_raw,
    strengths_weaknesses, scouting_report, report_by, is_doubles,
    import_status, form_submission_id
  ) values (
    v_source_key, 'player_form', v_team_id, v_player_id,
    coalesce(nullif(trim(v_sub.opponent_display_name), ''), 'Unknown opponent'),
    v_sub.match_date, coalesce(v_sub.match_date::text, ''),
    v_sub.handedness, coalesce(v_sub.handedness, ''),
    v_sub.strengths_weaknesses, v_sub.scouting_report, v_sub.report_by, v_sub.is_doubles,
    coalesce(v_import_status, 'unresolved_review'), p_submission_id
  )
  on conflict (source_key) do update
    set form_submission_id = excluded.form_submission_id,
        updated_at = now()
  returning id into v_report_id;

  update public.scouting_form_submissions
  set status = coalesce(v_sub_status, 'needs_review'),
      resolved_team_id = v_team_id,
      resolved_opponent_player_id = v_player_id,
      promoted_direct_report_id = v_report_id,
      reviewed_at = case when coalesce(v_sub_status, '') = 'published' then now() else reviewed_at end,
      updated_at = now()
  where id = p_submission_id;

  if coalesce(v_sub_status, '') = 'published' then
    perform public.scouting_mark_ai_stale_for_promotion(v_team_id, v_player_id);
  end if;

  direct_report_id := v_report_id;
  submission_status := coalesce(v_sub_status, 'needs_review');
  outcome := coalesce(v_outcome, 'promoted');
  team_id := v_team_id;
  opponent_player_id := v_player_id;
  return next;
end;
$$;

revoke all on function public.scouting_promote_form_submission(uuid) from public;
revoke all on function public.scouting_promote_form_submission(uuid) from anon;
grant execute on function public.scouting_promote_form_submission(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) Extend public submit to auto-promote (still tokenized + rate-limited)
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
  v_hits integer;
  v_id uuid;
begin
  if v_hash is null or length(v_hash) < 32 then
    raise exception 'invalid_token';
  end if;

  select * into v_link from public.scouting_form_links where token_hash = v_hash;
  if not found then
    raise exception 'invalid_token';
  end if;
  if v_link.revoked_at is not null then
    raise exception 'revoked_token';
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'expired_token';
  end if;

  insert into public.scouting_form_rate_limits (bucket_key, window_started_at, hit_count)
  values (v_hash, v_window, 1)
  on conflict (bucket_key, window_started_at)
  do update set hit_count = public.scouting_form_rate_limits.hit_count + 1
  returning hit_count into v_hits;

  if v_hits > 8 then
    raise exception 'rate_limited';
  end if;

  if p_handedness is not null and p_handedness not in ('Right', 'Left') then
    raise exception 'invalid_handedness';
  end if;

  if coalesce(trim(p_opponent_display_name), '') = '' and coalesce(trim(p_strengths_weaknesses), '') = '' and coalesce(trim(p_scouting_report), '') = '' then
    raise exception 'empty_submission';
  end if;

  insert into public.scouting_form_submissions (
    form_link_id, status, opponent_display_name, team_display_name, match_date,
    handedness, strengths_weaknesses, scouting_report, report_by, is_doubles, client_fingerprint
  ) values (
    v_link.id, 'new', coalesce(p_opponent_display_name, ''), coalesce(p_team_display_name, ''), p_match_date,
    p_handedness, p_strengths_weaknesses, p_scouting_report, p_report_by, coalesce(p_is_doubles, false), p_client_fingerprint
  ) returning id into v_id;

  -- Promote into main Scouting when safely resolvable; never invent unknown teams.
  perform public.scouting_promote_form_submission(v_id);

  return v_id;
end;
$$;

revoke all on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) from public;
grant execute on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10) Coach review / publish with explicit team+player (authenticated only)
-- ---------------------------------------------------------------------------
create or replace function public.scouting_review_form_submission(
  p_submission_id uuid,
  p_team_id uuid,
  p_opponent_player_id uuid,
  p_create_player boolean default false,
  p_player_display_name text default null
)
returns table (
  direct_report_id uuid,
  submission_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.scouting_form_submissions%rowtype;
  v_team public.scouting_teams%rowtype;
  v_player_id uuid;
  v_norm text;
  v_source_key text;
  v_report_id uuid;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_submission_id is null or p_team_id is null then
    raise exception 'invalid_args';
  end if;

  select * into v_sub from public.scouting_form_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'invalid_submission';
  end if;
  if v_sub.status = 'rejected' then
    raise exception 'submission_rejected';
  end if;

  select * into v_team from public.scouting_teams where id = p_team_id;
  if not found then
    raise exception 'invalid_team';
  end if;

  v_display := coalesce(nullif(trim(p_player_display_name), ''), nullif(trim(v_sub.opponent_display_name), ''), 'Unknown opponent');
  v_norm := public.scouting_normalize_alias(v_display);

  if p_opponent_player_id is not null then
    select p.id into v_player_id
    from public.scouting_opponent_players p
    where p.id = p_opponent_player_id and p.team_id = p_team_id;
    if v_player_id is null then
      raise exception 'player_not_on_team';
    end if;
  elsif coalesce(p_create_player, false) then
    if not public.scouting_is_clean_single_player_name(v_display) then
      raise exception 'ambiguous_player_name';
    end if;
    insert into public.scouting_opponent_players (team_id, display_name, normalized_name, handedness)
    values (p_team_id, v_display, v_norm, v_sub.handedness)
    on conflict on constraint scouting_opponent_players_team_name_unique do update set updated_at = now()
    returning id into v_player_id;
  else
    v_player_id := null;
  end if;

  v_source_key := public.scouting_player_form_source_key(p_submission_id);

  insert into public.scouting_direct_reports (
    source_key, source, team_id, opponent_player_id, opponent_display_name,
    match_date, match_date_raw, handedness, handedness_raw,
    strengths_weaknesses, scouting_report, report_by, is_doubles,
    import_status, form_submission_id
  ) values (
    v_source_key, 'player_form', p_team_id, v_player_id, v_display,
    v_sub.match_date, coalesce(v_sub.match_date::text, ''),
    v_sub.handedness, coalesce(v_sub.handedness, ''),
    v_sub.strengths_weaknesses, v_sub.scouting_report, v_sub.report_by, v_sub.is_doubles,
    'imported', p_submission_id
  )
  on conflict (source_key) do update set
    team_id = excluded.team_id,
    opponent_player_id = excluded.opponent_player_id,
    opponent_display_name = excluded.opponent_display_name,
    import_status = 'imported',
    form_submission_id = excluded.form_submission_id,
    strengths_weaknesses = excluded.strengths_weaknesses,
    scouting_report = excluded.scouting_report,
    report_by = excluded.report_by,
    is_doubles = excluded.is_doubles,
    match_date = excluded.match_date,
    handedness = excluded.handedness,
    updated_at = now()
  returning id into v_report_id;

  update public.scouting_form_submissions
  set status = 'published',
      resolved_team_id = p_team_id,
      resolved_opponent_player_id = v_player_id,
      promoted_direct_report_id = v_report_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id;

  perform public.scouting_mark_ai_stale_for_promotion(p_team_id, v_player_id);

  direct_report_id := v_report_id;
  submission_status := 'published';
  return next;
end;
$$;

revoke all on function public.scouting_review_form_submission(uuid, uuid, uuid, boolean, text) from public;
revoke all on function public.scouting_review_form_submission(uuid, uuid, uuid, boolean, text) from anon;
grant execute on function public.scouting_review_form_submission(uuid, uuid, uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 11) Map alias explicitly (coach); future submissions resolve automatically
-- ---------------------------------------------------------------------------
create or replace function public.scouting_map_team_alias(
  p_team_id uuid,
  p_display_alias text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_team_id is null or coalesce(trim(p_display_alias), '') = '' then
    raise exception 'invalid_args';
  end if;
  if not exists (select 1 from public.scouting_teams where id = p_team_id) then
    raise exception 'invalid_team';
  end if;
  v_norm := public.scouting_normalize_alias(p_display_alias);
  insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
  values (p_team_id, v_norm, trim(p_display_alias))
  on conflict (normalized_alias) do update
    set team_id = excluded.team_id,
        display_alias = excluded.display_alias,
        updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.scouting_map_team_alias(uuid, text) from public;
revoke all on function public.scouting_map_team_alias(uuid, text) from anon;
grant execute on function public.scouting_map_team_alias(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12) Explicit coach merge (transactional). Never auto-run.
-- ---------------------------------------------------------------------------
create or replace function public.scouting_merge_teams(
  p_canonical_team_id uuid,
  p_source_team_ids uuid[],
  p_confirm text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source uuid;
  v_moved_players int := 0;
  v_moved_reports int := 0;
  v_moved_links int := 0;
  v_skipped_collisions int := 0;
  v_collision_names text[] := '{}';
  v_player record;
  v_target_player uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_confirm is distinct from 'MERGE_SCOUTING_TEAMS' then
    raise exception 'confirmation_required';
  end if;
  if p_canonical_team_id is null or p_source_team_ids is null or cardinality(p_source_team_ids) = 0 then
    raise exception 'invalid_args';
  end if;
  if not exists (select 1 from public.scouting_teams where id = p_canonical_team_id) then
    raise exception 'invalid_canonical_team';
  end if;

  foreach v_source in array p_source_team_ids loop
    if v_source = p_canonical_team_id then
      continue;
    end if;
    if not exists (select 1 from public.scouting_teams where id = v_source) then
      raise exception 'invalid_source_team';
    end if;

    for v_player in
      select * from public.scouting_opponent_players where team_id = v_source
    loop
      select id into v_target_player
      from public.scouting_opponent_players
      where team_id = p_canonical_team_id
        and normalized_name = v_player.normalized_name
      limit 1;

      if v_target_player is not null then
        -- Same-name collision: reassign reports to existing canonical player; do not delete source player row yet.
        update public.scouting_direct_reports
        set opponent_player_id = v_target_player, team_id = p_canonical_team_id, updated_at = now()
        where opponent_player_id = v_player.id;
        update public.scouting_player_reports
        set opponent_player_id = v_target_player, updated_at = now()
        where opponent_player_id = v_player.id
          and not exists (
            select 1 from public.scouting_player_reports pr
            where pr.opponent_player_id = v_target_player and pr.kind = public.scouting_player_reports.kind
          );
        update public.scouting_form_links
        set opponent_player_id = v_target_player, team_id = p_canonical_team_id, updated_at = now()
        where opponent_player_id = v_player.id;
        update public.scouting_form_submissions
        set resolved_opponent_player_id = v_target_player, resolved_team_id = p_canonical_team_id, updated_at = now()
        where resolved_opponent_player_id = v_player.id;
        v_skipped_collisions := v_skipped_collisions + 1;
        v_collision_names := array_append(v_collision_names, v_player.display_name);
        -- Archive duplicate player (preserve history; do not hard-delete).
        update public.scouting_opponent_players
        set archived_at = coalesce(archived_at, now()),
            archived_by = auth.uid(),
            team_id = p_canonical_team_id,
            updated_at = now()
        where id = v_player.id
          and not exists (
            select 1 from public.scouting_opponent_players
            where team_id = p_canonical_team_id
              and normalized_name = v_player.normalized_name
              and id <> v_player.id
          );
        -- If unique still blocks, leave on source and count collision only.
      else
        update public.scouting_opponent_players
        set team_id = p_canonical_team_id, updated_at = now()
        where id = v_player.id;
        v_moved_players := v_moved_players + 1;
      end if;
    end loop;

    update public.scouting_direct_reports
    set team_id = p_canonical_team_id, updated_at = now()
    where team_id = v_source;
    get diagnostics v_moved_reports = row_count;

    update public.scouting_team_reports
    set team_id = p_canonical_team_id, updated_at = now()
    where team_id = v_source
      and not exists (
        select 1 from public.scouting_team_reports tr
        where tr.team_id = p_canonical_team_id and tr.kind = public.scouting_team_reports.kind
      );

    update public.scouting_form_links
    set team_id = p_canonical_team_id, updated_at = now()
    where team_id = v_source;
    get diagnostics v_moved_links = row_count;

    update public.scouting_form_submissions
    set resolved_team_id = p_canonical_team_id, updated_at = now()
    where resolved_team_id = v_source;

    update public.scouting_team_aliases
    set team_id = p_canonical_team_id, updated_at = now()
    where team_id = v_source;

    -- Preserve source team identity as alias; do not delete the team row.
    insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
    select p_canonical_team_id, public.scouting_normalize_alias(display_name), display_name
    from public.scouting_teams where id = v_source
    on conflict (normalized_alias) do update
      set team_id = excluded.team_id, updated_at = now();
  end loop;

  return jsonb_build_object(
    'canonical_team_id', p_canonical_team_id,
    'moved_players', v_moved_players,
    'moved_reports', v_moved_reports,
    'moved_links', v_moved_links,
    'name_collisions', v_skipped_collisions,
    'collision_names', to_jsonb(v_collision_names),
    'note', 'Source team rows retained; aliases remapped. No hard deletes.'
  );
end;
$$;

revoke all on function public.scouting_merge_teams(uuid, uuid[], text) from public;
revoke all on function public.scouting_merge_teams(uuid, uuid[], text) from anon;
grant execute on function public.scouting_merge_teams(uuid, uuid[], text) to authenticated;
