-- Remove the one production smoke-test report created while verifying that the
-- permanent public scouting form can submit without an authenticated session.

delete from public.scouting_direct_reports
where form_submission_id = 'd32e4fd3-5bc2-4de7-9138-6dbe23d680b1'::uuid;

delete from public.scouting_form_submissions
where id = 'd32e4fd3-5bc2-4de7-9138-6dbe23d680b1'::uuid;

delete from public.scouting_opponent_players
where normalized_name = public.scouting_normalize_alias('Codex Diagnostic Player')
  and team_id in (
    select id from public.scouting_teams
    where display_name = 'Codex Diagnostic University'
  );

delete from public.scouting_team_aliases
where team_id in (
  select id from public.scouting_teams
  where display_name = 'Codex Diagnostic University'
);

delete from public.scouting_teams
where display_name = 'Codex Diagnostic University';
