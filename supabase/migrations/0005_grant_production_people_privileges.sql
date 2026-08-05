-- BP-021B — Align table privileges with app roles.
--
-- Newer local Supabase stacks no longer auto-GRANT new public tables to
-- `anon` / `authenticated`. RLS policies from 0001/0002 alone are not enough
-- without underlying privileges. Hosted projects created under the older
-- default already had these grants; this migration is idempotent and safe
-- to apply everywhere.

grant select on table public.production_people to anon, authenticated;
grant update on table public.production_people to authenticated;
