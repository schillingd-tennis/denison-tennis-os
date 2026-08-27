-- Additive recruiting change log. Capture starts when this migration is applied.
-- Does not backfill existing recruits.

create table if not exists public.recruit_change_log (
  id uuid primary key default gen_random_uuid(),
  recruit_person_id text not null references public.production_people (id) on delete cascade,
  event_type text not null,
  category text not null,
  field_key text,
  field_label text,
  old_value jsonb,
  new_value jsonb,
  summary text not null,
  source text not null,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recruit_change_log_event_type_valid check (
    event_type in ('recruit_created', 'field_updated')
  ),
  constraint recruit_change_log_category_valid check (
    category in ('profile', 'rankings', 'recruiting', 'academics', 'schools', 'visits', 'system')
  ),
  constraint recruit_change_log_source_valid check (
    source in ('app', 'import', 'integration', 'system', 'unknown')
  )
);

create index if not exists recruit_change_log_person_occurred_idx
  on public.recruit_change_log (recruit_person_id, occurred_at desc);
create index if not exists recruit_change_log_occurred_idx
  on public.recruit_change_log (occurred_at desc);
create index if not exists recruit_change_log_category_idx
  on public.recruit_change_log (category);
create index if not exists recruit_change_log_event_type_idx
  on public.recruit_change_log (event_type);

comment on table public.recruit_change_log is
  'Append-only recruiting-data audit trail. Logging begins at migration apply time.';

alter table public.recruit_change_log enable row level security;

drop policy if exists recruit_change_log_select_readers on public.recruit_change_log;
create policy recruit_change_log_select_readers
  on public.recruit_change_log for select to authenticated
  using (public.app_is_reader());

revoke all on table public.recruit_change_log from public, anon, authenticated;
grant select on table public.recruit_change_log to authenticated;
grant select, insert on table public.recruit_change_log to postgres, service_role;

create or replace function public.recruit_change_log_norm_text(p_value text)
returns text
language sql
immutable
as $$
  select nullif(btrim(p_value), '');
$$;

create or replace function public.recruit_change_log_hometown(p_city text, p_state text)
returns text
language sql
immutable
as $$
  select nullif(
    concat_ws(
      ', ',
      public.recruit_change_log_norm_text(p_city),
      public.recruit_change_log_norm_text(p_state)
    ),
    ''
  );
$$;

create or replace function public.recruit_change_log_tokens(p_value text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct btrim(token)
      from unnest(regexp_split_to_array(coalesce(p_value, ''), '[,;\n]+')) as token
      where btrim(token) <> ''
      order by 1
    ),
    '{}'::text[]
  );
$$;

create or replace function public.recruit_change_log_lookup_label(p_kind text, p_id uuid)
returns text
language plpgsql
stable
as $$
declare
  v_label text;
begin
  if p_id is null then
    return null;
  end if;
  if p_kind = 'pipeline' then
    select label into v_label from public.recruit_pipeline_stages where id = p_id;
  elsif p_kind = 'priority' then
    select label into v_label from public.recruit_priorities where id = p_id;
  elsif p_kind = 'interest' then
    select label into v_label from public.recruit_interests where id = p_id;
  elsif p_kind = 'outcome' then
    select label into v_label from public.recruit_outcomes where id = p_id;
  end if;
  return v_label;
end;
$$;

create or replace function public.recruit_change_log_append(
  p_person_id text,
  p_event_type text,
  p_category text,
  p_field_key text,
  p_field_label text,
  p_old jsonb,
  p_new jsonb,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.recruit_change_log (
    recruit_person_id,
    event_type,
    category,
    field_key,
    field_label,
    old_value,
    new_value,
    summary,
    source,
    actor_user_id,
    occurred_at
  ) values (
    p_person_id,
    p_event_type,
    p_category,
    p_field_key,
    p_field_label,
    p_old,
    p_new,
    p_summary,
    case when auth.uid() is null then 'system' else 'app' end,
    auth.uid(),
    now()
  );
end;
$$;

create or replace function public.recruit_change_log_scalar_event(
  p_person_id text,
  p_category text,
  p_field_key text,
  p_field_label text,
  p_old text,
  p_new text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.recruit_change_log_norm_text(p_old) is not distinct from public.recruit_change_log_norm_text(p_new) then
    return;
  end if;
  perform public.recruit_change_log_append(
    p_person_id,
    'field_updated',
    p_category,
    p_field_key,
    p_field_label,
    case when public.recruit_change_log_norm_text(p_old) is null then null else jsonb_build_object('label', public.recruit_change_log_norm_text(p_old)) end,
    case when public.recruit_change_log_norm_text(p_new) is null then null else jsonb_build_object('label', public.recruit_change_log_norm_text(p_new)) end,
    concat_ws(
      ' → ',
      coalesce(public.recruit_change_log_norm_text(p_old), '—'),
      coalesce(public.recruit_change_log_norm_text(p_new), '—')
    )
  );
end;
$$;

create or replace function public.recruit_change_log_list_event(
  p_person_id text,
  p_category text,
  p_field_key text,
  p_field_label text,
  p_old text,
  p_new text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text[] := public.recruit_change_log_tokens(p_old);
  v_new text[] := public.recruit_change_log_tokens(p_new);
  v_added text[];
  v_removed text[];
  v_parts text[] := '{}';
begin
  if v_old is not distinct from v_new then
    return;
  end if;
  select coalesce(array_agg(item order by item), '{}') into v_added
  from unnest(v_new) as item
  where not exists (
    select 1 from unnest(v_old) as prior where lower(prior) = lower(item)
  );
  select coalesce(array_agg(item order by item), '{}') into v_removed
  from unnest(v_old) as item
  where not exists (
    select 1 from unnest(v_new) as next where lower(next) = lower(item)
  );
  if array_length(v_added, 1) is not null then
    v_parts := v_parts || concat('Added ', array_to_string(v_added, ', '));
  end if;
  if array_length(v_removed, 1) is not null then
    v_parts := v_parts || concat('Removed ', array_to_string(v_removed, ', '));
  end if;
  perform public.recruit_change_log_append(
    p_person_id,
    'field_updated',
    p_category,
    p_field_key,
    p_field_label,
    jsonb_build_object('items', to_jsonb(v_old)),
    jsonb_build_object('items', to_jsonb(v_new)),
    coalesce(nullif(array_to_string(v_parts, ' · '), ''), 'Updated')
  );
end;
$$;

create or replace function public.recruit_change_log_on_people_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.recruit_profiles where person_id = new.id) then
    return new;
  end if;

  perform public.recruit_change_log_scalar_event(new.id, 'rankings', 'utr', 'UTR', old.utr::text, new.utr::text);
  perform public.recruit_change_log_scalar_event(new.id, 'rankings', 'wtn', 'WTN', old.wtn::text, new.wtn::text);
  perform public.recruit_change_log_scalar_event(new.id, 'rankings', 'trn_rank', 'TRN rank', old.trn_rank::text, new.trn_rank::text);
  perform public.recruit_change_log_scalar_event(new.id, 'profile', 'cell_phone', 'Phone', old.cell_phone, new.cell_phone);
  perform public.recruit_change_log_scalar_event(new.id, 'profile', 'personal_email', 'Email', old.personal_email, new.personal_email);
  perform public.recruit_change_log_scalar_event(
    new.id,
    'profile',
    'hometown',
    'Hometown',
    public.recruit_change_log_hometown(old.city, old.state),
    public.recruit_change_log_hometown(new.city, new.state)
  );
  return new;
end;
$$;

create or replace function public.recruit_change_log_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recruit_change_log_append(
    new.person_id,
    'recruit_created',
    'system',
    null,
    null,
    null,
    null,
    'Recruit added to the system'
  );
  return new;
end;
$$;

create or replace function public.recruit_change_log_on_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.pipeline_stage_id is distinct from new.pipeline_stage_id then
    perform public.recruit_change_log_scalar_event(
      new.person_id, 'recruiting', 'pipeline_stage_id', 'Pipeline',
      public.recruit_change_log_lookup_label('pipeline', old.pipeline_stage_id),
      public.recruit_change_log_lookup_label('pipeline', new.pipeline_stage_id)
    );
  end if;
  if old.priority_id is distinct from new.priority_id then
    perform public.recruit_change_log_scalar_event(
      new.person_id, 'recruiting', 'priority_id', 'Priority',
      public.recruit_change_log_lookup_label('priority', old.priority_id),
      public.recruit_change_log_lookup_label('priority', new.priority_id)
    );
  end if;
  if old.interest_id is distinct from new.interest_id then
    perform public.recruit_change_log_scalar_event(
      new.person_id, 'recruiting', 'interest_id', 'Interest',
      public.recruit_change_log_lookup_label('interest', old.interest_id),
      public.recruit_change_log_lookup_label('interest', new.interest_id)
    );
  end if;
  if old.outcome_id is distinct from new.outcome_id then
    perform public.recruit_change_log_scalar_event(
      new.person_id, 'recruiting', 'outcome_id', 'Outcome',
      public.recruit_change_log_lookup_label('outcome', old.outcome_id),
      public.recruit_change_log_lookup_label('outcome', new.outcome_id)
    );
  end if;
  perform public.recruit_change_log_scalar_event(
    new.person_id, 'recruiting', 'recruit_class_year', 'Recruit class year',
    old.recruit_class_year::text, new.recruit_class_year::text
  );
  perform public.recruit_change_log_list_event(
    new.person_id, 'academics', 'academic_interests', 'Academic Interests',
    old.academic_interests, new.academic_interests
  );
  perform public.recruit_change_log_list_event(
    new.person_id, 'schools', 'schools_of_interest', 'Schools of Interest',
    old.schools_of_interest, new.schools_of_interest
  );
  perform public.recruit_change_log_scalar_event(
    new.person_id, 'visits', 'visit_start_date', 'Visit start date',
    old.visit_start_date::text, new.visit_start_date::text
  );
  perform public.recruit_change_log_scalar_event(
    new.person_id, 'visits', 'visit_end_date', 'Visit end date',
    old.visit_end_date::text, new.visit_end_date::text
  );
  perform public.recruit_change_log_scalar_event(
    new.person_id, 'visits', 'travel_type', 'Travel type',
    old.travel_type, new.travel_type
  );
  perform public.recruit_change_log_scalar_event(
    new.person_id, 'visits', 'flight_info', 'Flight information',
    old.flight_info, new.flight_info
  );
  return new;
end;
$$;

drop trigger if exists trg_recruit_change_log_people_update on public.production_people;
create trigger trg_recruit_change_log_people_update
  after update on public.production_people
  for each row
  execute function public.recruit_change_log_on_people_update();

drop trigger if exists trg_recruit_change_log_profile_insert on public.recruit_profiles;
create trigger trg_recruit_change_log_profile_insert
  after insert on public.recruit_profiles
  for each row
  execute function public.recruit_change_log_on_profile_insert();

drop trigger if exists trg_recruit_change_log_profile_update on public.recruit_profiles;
create trigger trg_recruit_change_log_profile_update
  after update on public.recruit_profiles
  for each row
  execute function public.recruit_change_log_on_profile_update();

revoke all on function public.recruit_change_log_append(text, text, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.recruit_change_log_append(text, text, text, text, text, jsonb, jsonb, text) to postgres, service_role;
