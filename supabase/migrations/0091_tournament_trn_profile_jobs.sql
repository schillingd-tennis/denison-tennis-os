-- Browser-backed public TRN profile enrichment for tournament fields.
alter table public.tennis_data_jobs add column if not exists target_id uuid;
alter table public.tennis_data_jobs drop constraint if exists tennis_data_jobs_scope_check;
alter table public.tennis_data_jobs add constraint tennis_data_jobs_scope_check check (scope in ('recruits', 'team', 'tournament'));

create or replace function public.request_tournament_trn_profile_job(p_tournament_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare existing_id uuid; created_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.recruiting_tournaments where id = p_tournament_id) then raise exception 'Tournament not found'; end if;
  select id into existing_id from public.tennis_data_jobs
  where provider = 'trn' and kind = 'profile' and scope = 'tournament' and target_id = p_tournament_id
    and status in ('queued', 'running') order by requested_at desc limit 1;
  if existing_id is not null then return existing_id; end if;
  insert into public.tennis_data_jobs(provider, kind, scope, source, requested_by, target_id)
  values ('trn', 'profile', 'tournament', 'manual', auth.uid(), p_tournament_id) returning id into created_id;
  return created_id;
end; $$;
revoke all on function public.request_tournament_trn_profile_job(uuid) from public, anon;
grant execute on function public.request_tournament_trn_profile_job(uuid) to authenticated;
