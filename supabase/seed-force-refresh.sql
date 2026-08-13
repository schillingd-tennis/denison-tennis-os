-- BP-029A — Force Refresh From Airtable is DISABLED.
--
-- GENERATED FILE — do not hand-edit. Produced by `npm run db:generate-seed`
-- Generated: 2026-08-07T10:56:26.930Z
--
-- Supabase is the permanent system of record. Airtable may only create
-- missing People and fill NULL fields via supabase/seed.sql.
-- This file intentionally raises if applied.

do $bp029a$
begin
  raise exception 'BP-029A — Force Refresh From Airtable is disabled. Supabase is the permanent system of record. Airtable may only create missing People and fill NULL fields (npm run db:seed). Hard-replacing populated SoR fields from Airtable is not part of normal operations. Use db:reset only when you intentionally wipe the local database.';
end
$bp029a$;
