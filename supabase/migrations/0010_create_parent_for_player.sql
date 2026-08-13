-- B2B — Create Parent + Link Existing write support.
--
-- 1) Authenticated INSERT on production_people and person_relationships.
-- 2) Atomic RPC create_parent_for_player: Person (role=family, status=current)
--    + relationship edge in one transaction (no orphan Person on failure).
--
-- Source person (person_id) must be role = player for B2B.
-- Link Existing is a plain INSERT (Option A: never updates Person.role_id).
-- Recruiting Family (player|recruit) is a later validation widening — no schema change.

-- Fixed lookup ids from 0006 / src/features/lookups/seed.ts
-- player:  a1000000-0000-4000-8000-000000000001
-- family:  a1000000-0000-4000-8000-000000000006
-- current: b1000000-0000-4000-8000-000000000001

-- ---------------------------------------------------------------------------
-- Privileges + RLS for INSERT
-- ---------------------------------------------------------------------------

grant insert on table public.production_people to authenticated;

drop policy if exists "Allow authenticated insert access" on public.production_people;
create policy "Allow authenticated insert access"
  on public.production_people
  for insert
  to authenticated
  with check (true);

grant insert on table public.person_relationships to authenticated;

drop policy if exists "Allow authenticated insert access" on public.person_relationships;
create policy "Allow authenticated insert access"
  on public.person_relationships
  for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Atomic Create New Parent
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

comment on function public.create_parent_for_player(text, text, text, text, text, text) is
  'B2B atomic Create New Parent: Person (family/current) + relationship edge. Source must be player.';

grant execute on function public.create_parent_for_player(text, text, text, text, text, text)
  to authenticated;
