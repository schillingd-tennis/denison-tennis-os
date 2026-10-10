-- Local-only, idempotent scouting fixtures for testing singles, doubles, and team AI reports.
-- Never run this file against a hosted database.
insert into public.scouting_teams (id, import_key, display_name)
values ('71000000-0000-4000-8000-000000000001', 'local-ai-test-university', 'AI Test University')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.scouting_opponent_players (id, import_key, team_id, display_name, normalized_name, handedness)
values
 ('71000000-0000-4000-8000-000000000011', 'local-ai-jordan', '71000000-0000-4000-8000-000000000001', 'Jordan Ace', 'jordan ace', 'Right'),
 ('71000000-0000-4000-8000-000000000012', 'local-ai-taylor', '71000000-0000-4000-8000-000000000001', 'Taylor Volley', 'taylor volley', 'Left')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.scouting_direct_reports
 (id, source_key, source, team_id, opponent_player_id, opponent_display_name, match_date, strengths_weaknesses, scouting_report, report_by, is_doubles, report_type, import_status)
values
 ('71000000-0000-4000-8000-000000000101','local-ai-jordan-1','coach_entry','71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000011','Jordan Ace','2026-09-01','Heavy forehand; second serve sits up.','Attack the second serve and avoid feeding the forehand.','Local Coach',false,'singles','imported'),
 ('71000000-0000-4000-8000-000000000102','local-ai-jordan-2','coach_entry','71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000011','Jordan Ace','2026-09-15','Moves forward well; backhand breaks down under height.','Use high shape to the backhand before changing direction.','Test Player',false,'singles','imported'),
 ('71000000-0000-4000-8000-000000000103','local-ai-taylor-1','coach_entry','71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000012','Taylor Volley','2026-09-10','Excellent hands; return can float.','Pressure the return and pass low when Taylor closes.','Local Coach',false,'singles','imported'),
 ('71000000-0000-4000-8000-000000000104','local-ai-doubles-1','coach_entry','71000000-0000-4000-8000-000000000001',null,'Jordan Ace / Taylor Volley','2026-09-20','Jordan deuce, Taylor ad; active at net.','Lob over Taylor and make Jordan volley below the tape.','Test Player',true,'doubles','team_level'),
 ('71000000-0000-4000-8000-000000000105','local-ai-doubles-2','coach_entry','71000000-0000-4000-8000-000000000001',null,'Taylor Volley / Jordan Ace','2026-09-27','Poach frequently on second serves.','Use more first serves down the T and protect the middle.','Local Coach',true,'doubles','team_level')
on conflict (id) do update set scouting_report = excluded.scouting_report;
