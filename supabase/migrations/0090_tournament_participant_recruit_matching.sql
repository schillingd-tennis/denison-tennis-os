alter table public.recruiting_tournament_participants
  add column if not exists recruit_link_status text not null default 'unmatched';

alter table public.recruiting_tournament_participants
  drop constraint if exists recruiting_tournament_participants_link_status_valid;
alter table public.recruiting_tournament_participants
  add constraint recruiting_tournament_participants_link_status_valid
  check (recruit_link_status in ('matched', 'created', 'ambiguous', 'unmatched'));

comment on column public.recruiting_tournament_participants.recruit_link_status is
  'Recruiting OS identity reconciliation: matched | created | ambiguous | unmatched.';

update public.recruiting_tournament_participants set recruit_link_status = 'matched'
where recruit_person_id is not null and recruit_link_status = 'unmatched';
