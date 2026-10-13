-- Exempt competitions remain normal Schedule events, but do not consume a
-- competition date. Keep the existing column as the single source of truth.

update public.team_schedule_events
set
  counts_as_competition_date = false,
  competition_date_number = null,
  competition_date_group = null,
  notes = case
    when coalesce(notes, '') ilike '%exempt from competition date count%' then notes
    when nullif(trim(notes), '') is null then 'Exempt from competition date count'
    else notes || E'\nExempt from competition date count'
  end,
  updated_at = now()
where lower(coalesce(event_name, '')) in ('ita cup', 'ita cup event')
   or lower(coalesce(opponent_name, '')) in ('ita cup', 'ita cup event');
