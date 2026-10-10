-- Normalize legacy compound scouting rows into the structured doubles model.
-- Conservative by design: only unlinked team-level rows with two slash-delimited
-- names are converted. Individual player records are never relinked or created.

update public.scouting_form_submissions
set is_doubles = true,
    report_type = 'doubles',
    doubles_details = jsonb_build_object(
      'opponentOneName', trim(split_part(opponent_display_name, '/', 1)),
      'opponentOnePosition', '',
      'opponentTwoName', trim(split_part(opponent_display_name, '/', 2)),
      'opponentTwoPosition', '',
      'deuceSide', '',
      'adSide', '',
      'servesFirst', ''
    ),
    handedness = null,
    updated_at = now()
where report_type = 'singles'
  and opponent_display_name like '%/%'
  and trim(split_part(opponent_display_name, '/', 1)) <> ''
  and trim(split_part(opponent_display_name, '/', 2)) <> '';

update public.scouting_direct_reports
set is_doubles = true,
    report_type = 'doubles',
    doubles_details = jsonb_build_object(
      'opponentOneName', trim(split_part(opponent_display_name, '/', 1)),
      'opponentOnePosition', '',
      'opponentTwoName', trim(split_part(opponent_display_name, '/', 2)),
      'opponentTwoPosition', '',
      'deuceSide', '',
      'adSide', '',
      'servesFirst', ''
    ),
    handedness = null,
    handedness_raw = '',
    import_status = 'team_level',
    updated_at = now()
where opponent_player_id is null
  and report_type = 'singles'
  and opponent_display_name like '%/%'
  and trim(split_part(opponent_display_name, '/', 1)) <> ''
  and trim(split_part(opponent_display_name, '/', 2)) <> '';

comment on column public.scouting_direct_reports.doubles_details is
  'Structured doubles alignment. Legacy slash-delimited team reports are backfilled by migration 0079; unknown court assignments remain blank.';
