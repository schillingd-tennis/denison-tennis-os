-- BP-041 — Allow authenticated DELETE on production_people.
--
-- Hard-deletes a Person row. person_relationships edges cascade via
-- ON DELETE CASCADE (0009). Other Person rows are never deleted.
-- Does NOT introduce soft-delete / archive.

grant delete on table public.production_people to authenticated;

drop policy if exists "Allow authenticated delete access" on public.production_people;
create policy "Allow authenticated delete access"
  on public.production_people
  for delete
  to authenticated
  using (true);
