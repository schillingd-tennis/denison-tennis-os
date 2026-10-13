-- Preserve every recruit rating pull and calculate change from the immediately
-- preceding successful pull, even when multiple pulls happen on the same day.

alter table public.recruit_rating_snapshots
  drop constraint if exists recruit_rating_snapshots_week_unique;

create unique index if not exists recruit_rating_snapshots_job_unique
  on public.recruit_rating_snapshots(person_id, provider, job_id)
  where job_id is not null;

create or replace function public.record_recruit_rating(
  p_person_id text,
  p_provider text,
  p_rating numeric,
  p_rating_date date,
  p_star_rating integer default null,
  p_external_player_id text default null,
  p_source_url text default null,
  p_job_id uuid default null,
  p_diagnostic text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  last_pulled_rating numeric;
  snapshot_id uuid;
begin
  if p_provider not in ('utr', 'wtn', 'trn') then raise exception 'Unsupported rating provider'; end if;
  if p_rating is null or p_rating <= 0 then raise exception 'Invalid rating'; end if;
  if p_provider = 'utr' and p_rating > 16 then raise exception 'Invalid UTR'; end if;
  if p_provider = 'wtn' and p_rating > 40 then raise exception 'Invalid WTN'; end if;
  if p_star_rating is not null and (p_star_rating < 1 or p_star_rating > 6) then
    raise exception 'Invalid star rating';
  end if;

  perform 1 from public.production_people where id = p_person_id for update;
  if not found then raise exception 'Recruit not found'; end if;

  select rating into last_pulled_rating
  from public.recruit_rating_snapshots
  where person_id = p_person_id
    and provider = p_provider
    and (p_job_id is null or job_id is distinct from p_job_id)
  order by captured_at desc, created_at desc
  limit 1;

  if p_job_id is not null then
    insert into public.recruit_rating_snapshots (
      person_id, provider, rating, star_rating, rating_date, external_player_id,
      source_url, job_id, previous_rating, rating_change, status, diagnostic
    ) values (
      p_person_id, p_provider, round(p_rating, 2), p_star_rating, p_rating_date,
      nullif(trim(p_external_player_id), ''), nullif(trim(p_source_url), ''), p_job_id,
      last_pulled_rating,
      case when last_pulled_rating is null then null else round(p_rating - last_pulled_rating, 2) end,
      case when last_pulled_rating is not null and round(p_rating, 2) = round(last_pulled_rating, 2)
        then 'unchanged' else 'current' end,
      nullif(trim(p_diagnostic), '')
    )
    on conflict (person_id, provider, job_id) where job_id is not null do update set
      rating = excluded.rating,
      star_rating = excluded.star_rating,
      rating_date = excluded.rating_date,
      captured_at = now(),
      external_player_id = excluded.external_player_id,
      source_url = excluded.source_url,
      diagnostic = excluded.diagnostic
    returning id into snapshot_id;
  else
    insert into public.recruit_rating_snapshots (
      person_id, provider, rating, star_rating, rating_date, external_player_id,
      source_url, job_id, previous_rating, rating_change, status, diagnostic
    ) values (
      p_person_id, p_provider, round(p_rating, 2), p_star_rating, p_rating_date,
      nullif(trim(p_external_player_id), ''), nullif(trim(p_source_url), ''), null,
      last_pulled_rating,
      case when last_pulled_rating is null then null else round(p_rating - last_pulled_rating, 2) end,
      case when last_pulled_rating is not null and round(p_rating, 2) = round(last_pulled_rating, 2)
        then 'unchanged' else 'current' end,
      nullif(trim(p_diagnostic), '')
    )
    returning id into snapshot_id;
  end if;

  if p_provider = 'utr' then
    update public.production_people set utr = round(p_rating, 2), updated_at = now() where id = p_person_id;
  elsif p_provider = 'wtn' then
    update public.production_people set wtn = round(p_rating, 2), updated_at = now() where id = p_person_id;
  else
    update public.production_people
      set trn_rank = round(p_rating),
          trn_star_rating = coalesce(p_star_rating, trn_star_rating),
          updated_at = now()
      where id = p_person_id;
  end if;

  return snapshot_id;
end;
$$;

revoke all on function public.record_recruit_rating(text, text, numeric, date, integer, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_recruit_rating(text, text, numeric, date, integer, text, text, uuid, text)
  to service_role;
