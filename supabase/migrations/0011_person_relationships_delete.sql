-- BP-040E — Allow authenticated DELETE on person_relationships only.
-- Removes the relationship edge (unlink parent from player).
-- Does NOT grant DELETE on production_people.

grant delete on table public.person_relationships to authenticated;

drop policy if exists "Allow authenticated delete access" on public.person_relationships;
create policy "Allow authenticated delete access"
  on public.person_relationships
  for delete
  to authenticated
  using (true);
