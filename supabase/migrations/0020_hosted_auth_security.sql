-- Hosted Auth + database security: explicit admin / read_only access.
--
-- Replaces the local-first model (anon SELECT + authenticated using(true)
-- CRUD) with an app_users allow-list resolved via auth.uid().
--
-- Safe to apply on Local and Cloud Development. Does NOT insert Cloud
-- auth users. Local mapping is done by scripts/seed-local-auth.ts after
-- the local Auth user exists.

-- ---------------------------------------------------------------------------
-- 1. app_users
-- ---------------------------------------------------------------------------

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  active boolean not null default true,
  access_level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_access_level_valid check (
    access_level in ('admin', 'read_only')
  )
);

comment on table public.app_users is
  'Allow-list of Auth users who may use Tennis OS. Authorization uses auth.uid(), never email.';
comment on column public.app_users.auth_user_id is
  'FK to auth.users.id. Matched in RLS via auth.uid().';
comment on column public.app_users.access_level is
  'admin = read/write operational data; read_only = SELECT only.';
comment on column public.app_users.active is
  'Inactive rows deny all operational access even if the Auth user can sign in.';

create index if not exists app_users_auth_user_id_idx
  on public.app_users (auth_user_id);

create or replace function public.set_app_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
  before update on public.app_users
  for each row
  execute function public.set_app_users_updated_at();

alter table public.app_users enable row level security;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER helpers (bypass RLS on app_users; no recursion)
-- ---------------------------------------------------------------------------

create or replace function public.app_current_access_level()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.access_level
  from public.app_users as u
  where u.auth_user_id = auth.uid()
    and u.active
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_current_access_level() = 'admin', false)
$$;

create or replace function public.app_is_reader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.app_current_access_level() in ('admin', 'read_only'),
    false
  )
$$;

comment on function public.app_current_access_level() is
  'Returns admin or read_only for the current auth.uid() when the app_users row is active; otherwise null.';
comment on function public.app_is_admin() is
  'True when the signed-in Auth user is an active Tennis OS admin.';
comment on function public.app_is_reader() is
  'True when the signed-in Auth user is an active admin or read_only Tennis OS user.';

revoke all on function public.app_current_access_level() from public;
revoke all on function public.app_is_admin() from public;
revoke all on function public.app_is_reader() from public;
revoke all on function public.set_app_users_updated_at() from public;

grant execute on function public.app_current_access_level() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_is_reader() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Drop legacy policies on exposed public tables
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  tables text[] := array[
    'app_users',
    'production_people',
    'person_relationships',
    'recruit_profiles',
    'roles',
    'statuses',
    'recruit_types',
    'recruit_pipeline_stages',
    'recruit_interests',
    'recruit_outcomes',
    'recruit_priorities',
    'recruit_getabilities',
    'recruit_preread_statuses'
  ];
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename = any (tables)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Enable RLS on every exposed public table (including roles/statuses)
-- ---------------------------------------------------------------------------

alter table public.production_people enable row level security;
alter table public.person_relationships enable row level security;
alter table public.recruit_profiles enable row level security;
alter table public.roles enable row level security;
alter table public.statuses enable row level security;
alter table public.recruit_types enable row level security;
alter table public.recruit_pipeline_stages enable row level security;
alter table public.recruit_interests enable row level security;
alter table public.recruit_outcomes enable row level security;
alter table public.recruit_priorities enable row level security;
alter table public.recruit_getabilities enable row level security;
alter table public.recruit_preread_statuses enable row level security;

-- ---------------------------------------------------------------------------
-- 5. New policies
-- ---------------------------------------------------------------------------

-- app_users: authenticated users may see their own row; admins may see all.
-- No client INSERT/UPDATE/DELETE. Mapping is Dashboard / service_role / local seed.
create policy "app_users_select_own_or_admin"
  on public.app_users
  for select
  to authenticated
  using (auth_user_id = auth.uid() or public.app_is_admin());

-- Operational tables: readers SELECT; admins write.
create policy "production_people_select_readers"
  on public.production_people for select to authenticated
  using (public.app_is_reader());
create policy "production_people_insert_admin"
  on public.production_people for insert to authenticated
  with check (public.app_is_admin());
create policy "production_people_update_admin"
  on public.production_people for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());
create policy "production_people_delete_admin"
  on public.production_people for delete to authenticated
  using (public.app_is_admin());

create policy "person_relationships_select_readers"
  on public.person_relationships for select to authenticated
  using (public.app_is_reader());
create policy "person_relationships_insert_admin"
  on public.person_relationships for insert to authenticated
  with check (public.app_is_admin());
create policy "person_relationships_update_admin"
  on public.person_relationships for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());
create policy "person_relationships_delete_admin"
  on public.person_relationships for delete to authenticated
  using (public.app_is_admin());

create policy "recruit_profiles_select_readers"
  on public.recruit_profiles for select to authenticated
  using (public.app_is_reader());
create policy "recruit_profiles_insert_admin"
  on public.recruit_profiles for insert to authenticated
  with check (public.app_is_admin());
create policy "recruit_profiles_update_admin"
  on public.recruit_profiles for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());
create policy "recruit_profiles_delete_admin"
  on public.recruit_profiles for delete to authenticated
  using (public.app_is_admin());

-- Lookups: SELECT for approved app users only. No client writes.
create policy "roles_select_readers"
  on public.roles for select to authenticated
  using (public.app_is_reader());
create policy "statuses_select_readers"
  on public.statuses for select to authenticated
  using (public.app_is_reader());
create policy "recruit_types_select_readers"
  on public.recruit_types for select to authenticated
  using (public.app_is_reader());
create policy "recruit_pipeline_stages_select_readers"
  on public.recruit_pipeline_stages for select to authenticated
  using (public.app_is_reader());
create policy "recruit_interests_select_readers"
  on public.recruit_interests for select to authenticated
  using (public.app_is_reader());
create policy "recruit_outcomes_select_readers"
  on public.recruit_outcomes for select to authenticated
  using (public.app_is_reader());
create policy "recruit_priorities_select_readers"
  on public.recruit_priorities for select to authenticated
  using (public.app_is_reader());
create policy "recruit_getabilities_select_readers"
  on public.recruit_getabilities for select to authenticated
  using (public.app_is_reader());
create policy "recruit_preread_statuses_select_readers"
  on public.recruit_preread_statuses for select to authenticated
  using (public.app_is_reader());

-- ---------------------------------------------------------------------------
-- 6. Table grants (RLS does not govern TRUNCATE)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  all_tables text[] := array[
    'app_users',
    'production_people',
    'person_relationships',
    'recruit_profiles',
    'roles',
    'statuses',
    'recruit_types',
    'recruit_pipeline_stages',
    'recruit_interests',
    'recruit_outcomes',
    'recruit_priorities',
    'recruit_getabilities',
    'recruit_preread_statuses'
  ];
  write_tables text[] := array[
    'production_people',
    'person_relationships',
    'recruit_profiles'
  ];
begin
  foreach t in array all_tables loop
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    -- Keep Supabase admin roles able to manage data (bypass RLS).
    execute format('grant all on table public.%I to postgres, service_role', t);
    execute format('grant select on table public.%I to authenticated', t);
  end loop;

  foreach t in array write_tables loop
    execute format(
      'grant insert, update, delete on table public.%I to authenticated',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Function / RPC privileges
-- ---------------------------------------------------------------------------

-- Trigger helpers must not be callable by clients.
revoke all on function public.set_production_people_updated_at() from public;
revoke all on function public.set_production_people_updated_at() from anon, authenticated;
revoke all on function public.set_person_relationships_updated_at() from public;
revoke all on function public.set_person_relationships_updated_at() from anon, authenticated;
revoke all on function public.set_recruit_profiles_updated_at() from public;
revoke all on function public.set_recruit_profiles_updated_at() from anon, authenticated;
revoke all on function public.set_app_users_updated_at() from anon, authenticated;

-- Write RPCs: executable by authenticated; body requires admin.
revoke all on function public.create_parent_for_player(text, text, text, text, text, text) from public;
revoke all on function public.create_parent_for_player(text, text, text, text, text, text) from anon;
grant execute on function public.create_parent_for_player(text, text, text, text, text, text) to authenticated;

revoke all on function public.apply_recruit_class_coach_ranks(integer, text[]) from public;
revoke all on function public.apply_recruit_class_coach_ranks(integer, text[]) from anon;
grant execute on function public.apply_recruit_class_coach_ranks(integer, text[]) to authenticated;

revoke all on function public.reassign_recruit_class_year(text, integer) from public;
revoke all on function public.reassign_recruit_class_year(text, integer) from anon;
grant execute on function public.reassign_recruit_class_year(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Write RPCs: require admin (defense in depth on top of table RLS)
-- ---------------------------------------------------------------------------

create or replace function public.create_parent_for_player(
  p_player_id text,
  p_first_name text,
  p_last_name text,
  p_relationship_type text,
  p_personal_email text default null,
  p_cell_phone text default null
)
returns table (
  parent_id text,
  relationship_id text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_player_role_id uuid := 'a1000000-0000-4000-8000-000000000001';
  v_family_role_id uuid := 'a1000000-0000-4000-8000-000000000006';
  v_current_status_id uuid := 'b1000000-0000-4000-8000-000000000001';
  v_player_role uuid;
  v_first_name text := trim(both from coalesce(p_first_name, ''));
  v_last_name text := trim(both from coalesce(p_last_name, ''));
  v_relationship_type text := lower(trim(both from coalesce(p_relationship_type, '')));
  v_email text := nullif(trim(both from coalesce(p_personal_email, '')), '');
  v_phone text := nullif(trim(both from coalesce(p_cell_phone, '')), '');
  v_parent_id text;
  v_relationship_id text;
begin
  if not public.app_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_first_name = '' then
    raise exception 'first_name is required' using errcode = '22023';
  end if;

  if v_last_name = '' then
    raise exception 'last_name is required' using errcode = '22023';
  end if;

  if v_relationship_type not in ('mother', 'father', 'guardian', 'other') then
    raise exception 'invalid relationship_type: %', p_relationship_type using errcode = '22023';
  end if;

  if p_player_id is null or trim(both from p_player_id) = '' then
    raise exception 'player_id is required' using errcode = '22023';
  end if;

  select role_id into v_player_role
  from public.production_people
  where id = p_player_id;

  if v_player_role is null then
    raise exception 'player not found: %', p_player_id using errcode = 'P0002';
  end if;

  if v_player_role is distinct from v_player_role_id then
    raise exception 'source person must have role player' using errcode = '22023';
  end if;

  v_parent_id := gen_random_uuid()::text;
  v_relationship_id := gen_random_uuid()::text;

  insert into public.production_people (
    id,
    role_id,
    status_id,
    first_name,
    last_name,
    personal_email,
    cell_phone,
    relationships
  ) values (
    v_parent_id,
    v_family_role_id,
    v_current_status_id,
    v_first_name,
    v_last_name,
    v_email,
    v_phone,
    '[]'::jsonb
  );

  insert into public.person_relationships (
    id,
    person_id,
    related_person_id,
    relationship_type,
    is_primary_contact,
    is_emergency_contact
  ) values (
    v_relationship_id,
    p_player_id,
    v_parent_id,
    v_relationship_type,
    false,
    false
  );

  parent_id := v_parent_id;
  relationship_id := v_relationship_id;
  return next;
end;
$$;

create or replace function public.apply_recruit_class_coach_ranks(
  p_class_year integer,
  p_ranked_person_ids text[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text;
  v_rank integer := 0;
  v_input_count integer;
  v_distinct_count integer;
begin
  if not public.app_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_class_year is null
     or p_class_year < 1900
     or p_class_year > 2200 then
    raise exception 'invalid recruit class year: %', p_class_year using errcode = '22023';
  end if;

  perform 1
  from public.recruit_profiles
  where recruit_class_year = p_class_year
  for update;

  v_input_count := coalesce(cardinality(p_ranked_person_ids), 0);

  if v_input_count > 0 then
    select count(distinct x)
      into v_distinct_count
      from unnest(p_ranked_person_ids) as t(x);

    if v_distinct_count <> v_input_count then
      raise exception 'duplicate person ids in ranked list' using errcode = '22023';
    end if;

    foreach v_id in array p_ranked_person_ids loop
      if v_id is null or length(trim(v_id)) = 0 then
        raise exception 'ranked person id cannot be empty' using errcode = '22023';
      end if;

      if not exists (
        select 1
        from public.recruit_profiles
        where person_id = v_id
          and recruit_class_year = p_class_year
      ) then
        raise exception 'person % is not in recruit class %', v_id, p_class_year
          using errcode = '22023';
      end if;
    end loop;
  end if;

  update public.recruit_profiles
     set coach_rank = null
   where recruit_class_year = p_class_year
     and coach_rank is not null;

  if v_input_count > 0 then
    foreach v_id in array p_ranked_person_ids loop
      v_rank := v_rank + 1;
      update public.recruit_profiles
         set coach_rank = v_rank
       where person_id = v_id;
    end loop;
  end if;

  return v_rank;
end;
$$;

create or replace function public.reassign_recruit_class_year(
  p_person_id text,
  p_new_class_year integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_person_id text := trim(both from coalesce(p_person_id, ''));
  v_old_year integer;
  v_had_rank boolean;
begin
  if not public.app_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_person_id = '' then
    raise exception 'person_id is required' using errcode = '22023';
  end if;

  if p_new_class_year is not null
     and (p_new_class_year < 1900 or p_new_class_year > 2200) then
    raise exception 'invalid recruit class year: %', p_new_class_year using errcode = '22023';
  end if;

  select recruit_class_year, coach_rank is not null
    into v_old_year, v_had_rank
    from public.recruit_profiles
   where person_id = v_person_id
   for update;

  if not found then
    raise exception 'recruit profile not found for person %', v_person_id using errcode = 'P0002';
  end if;

  if v_old_year is not distinct from p_new_class_year then
    return;
  end if;

  if v_old_year is not null then
    perform 1
    from public.recruit_profiles
    where recruit_class_year = v_old_year
    for update;
  end if;

  if p_new_class_year is not null then
    perform 1
    from public.recruit_profiles
    where recruit_class_year = p_new_class_year
    for update;
  end if;

  update public.recruit_profiles
     set recruit_class_year = p_new_class_year,
         coach_rank = null
   where person_id = v_person_id;

  if v_old_year is not null and v_had_rank then
    with ordered as (
      select
        person_id,
        row_number() over (order by coach_rank asc, person_id asc) as new_rank
      from public.recruit_profiles
      where recruit_class_year = v_old_year
        and coach_rank is not null
    )
    update public.recruit_profiles rp
       set coach_rank = ordered.new_rank
      from ordered
     where rp.person_id = ordered.person_id;
  end if;
end;
$$;
