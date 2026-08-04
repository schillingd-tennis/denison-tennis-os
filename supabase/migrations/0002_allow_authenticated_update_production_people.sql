-- BP-017 Phase 1 — Persist edits from the Player Editor.
--
-- `0001_create_production_people.sql` intentionally left `production_people`
-- read-only, deferring write access until authentication + an edit workflow
-- existed (see its RLS comment). BP-016 added authentication; this
-- migration adds the one write policy the Player Editor needs: signed-in
-- users may UPDATE existing rows. `anon` still only gets read access (per
-- 0001), and no INSERT/DELETE policy is added — those remain out of scope.
--
-- This does not change the table's columns/constraints in any way, and
-- does not create any new table — it only grants an access-control
-- permission that was previously denied by default (RLS with no matching
-- policy denies the action).
--
-- Run this once in the Supabase SQL Editor against the existing table (see
-- `supabase/migrations/0001_create_production_people.sql`).

drop policy if exists "Allow authenticated update access" on public.production_people;
create policy "Allow authenticated update access"
  on public.production_people
  for update
  to authenticated
  using (true)
  with check (true);
