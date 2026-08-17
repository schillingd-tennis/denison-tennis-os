-- Coach Rank (Phase B) — persistent coach-controlled order within recruit class year.
--
-- coach_rank is NULL for unranked recruits. Dense 1…N within recruit_class_year.
-- Independent of Priority, Analytics Tier, TRN, UTR, WTN, Pipeline.
-- Existing rows remain NULL (no backfill).

alter table public.recruit_profiles
  add column if not exists coach_rank integer;

alter table public.recruit_profiles
  drop constraint if exists recruit_profiles_coach_rank_positive;

alter table public.recruit_profiles
  add constraint recruit_profiles_coach_rank_positive
  check (coach_rank is null or coach_rank >= 1);

comment on column public.recruit_profiles.coach_rank is
  'Coach Rank: manual preference order within recruit_class_year. NULL = unranked. Not Priority, Tier, or TRN.';

create index if not exists recruit_profiles_class_year_coach_rank_idx
  on public.recruit_profiles (recruit_class_year, coach_rank)
  where coach_rank is not null;

-- ---------------------------------------------------------------------------
-- Atomic: replace the full ranked order for one class year.
-- Person IDs not listed (but in the class) become unranked (NULL).
-- Entire body runs in a single transaction (one RPC call).
-- ---------------------------------------------------------------------------

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
  if p_class_year is null
     or p_class_year < 1900
     or p_class_year > 2200 then
    raise exception 'invalid recruit class year: %', p_class_year using errcode = '22023';
  end if;

  -- Serialize concurrent rewrites for this class.
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

revoke all on function public.apply_recruit_class_coach_ranks(integer, text[]) from public;
grant execute on function public.apply_recruit_class_coach_ranks(integer, text[]) to authenticated;

comment on function public.apply_recruit_class_coach_ranks(integer, text[]) is
  'Atomically rewrite Coach Rank for one recruit_class_year. Dense 1…N from ordered person ids; others in class become NULL.';

-- ---------------------------------------------------------------------------
-- Atomic: change recruit_class_year and clear coach_rank.
-- Densifies the OLD class so ranks remain 1…N with no gaps.
-- ---------------------------------------------------------------------------

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

  -- Lock old class (if any) before rewriting.
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

  -- Densify remaining ranked recruits in the old class.
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

revoke all on function public.reassign_recruit_class_year(text, integer) from public;
grant execute on function public.reassign_recruit_class_year(text, integer) to authenticated;

comment on function public.reassign_recruit_class_year(text, integer) is
  'Move a recruit to a new class year, clear Coach Rank, and densify the previous class ranking.';
