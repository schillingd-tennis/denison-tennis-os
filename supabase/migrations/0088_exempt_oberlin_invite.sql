-- Apply the requested exemption to the existing Oberlin Invite record.
update public.team_schedule_events
set counts_as_competition_date = false,
    competition_date_number = null,
    competition_date_group = null,
    notes = case
      when coalesce(notes, '') ilike '%exempt from competition date count%' then notes
      when nullif(trim(notes), '') is null then 'Exempt from competition date count'
      else trim(notes) || E'\nExempt from competition date count'
    end,
    updated_at = now()
where lower(trim(coalesce(event_name, ''))) = 'oberlin invite';
