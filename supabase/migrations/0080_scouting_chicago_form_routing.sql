-- Route public scouting submissions that use the school's full Chicago name
-- to the existing canonical Chicago workspace. Reprocess only affected,
-- unpromoted submissions so the migration is safe and idempotent.

insert into public.scouting_team_aliases (team_id, normalized_alias, display_alias)
select t.id, public.scouting_normalize_alias(v.display_alias), v.display_alias
from (values
  ('University of Chicago'),
  ('The University of Chicago'),
  ('UChicago')
) as v(display_alias)
join lateral (
  select id
  from public.scouting_teams
  where identity_slug = 'chicago'
     or public.scouting_normalize_alias(display_name) = 'chicago'
  order by created_at asc
  limit 1
) t on true
on conflict (normalized_alias) do nothing;

do $$
declare
  v_submission_id uuid;
begin
  for v_submission_id in
    select s.id
    from public.scouting_form_submissions s
    where s.promoted_direct_report_id is null
      and s.status not in ('archived', 'rejected')
      and public.scouting_normalize_alias(s.team_display_name) in (
        'university of chicago',
        'the university of chicago',
        'uchicago'
      )
    order by s.created_at asc
  loop
    perform public.scouting_promote_form_submission(v_submission_id);
  end loop;
end;
$$;
