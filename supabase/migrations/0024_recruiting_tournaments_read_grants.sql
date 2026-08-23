-- App reads tournaments with the publishable key (anon / authenticated).
-- Import uses the service role. 0021 only granted authenticated.

grant select, insert, update, delete on table public.recruiting_tournaments
  to anon, authenticated, service_role;

grant select, insert, update, delete on table public.recruiting_tournament_recruits
  to anon, authenticated, service_role;

drop policy if exists "Authenticated users can read recruiting tournaments"
  on public.recruiting_tournaments;

drop policy if exists "Allow anon read access" on public.recruiting_tournaments;
create policy "Allow anon read access"
  on public.recruiting_tournaments
  for select
  to anon, authenticated
  using (true);
