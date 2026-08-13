-- Player Family Notes — family-context notes on the Player record.
-- Distinct from Person.notes (individual / parent Contact Information notes).

alter table public.production_people
  add column if not exists family_notes text;

comment on column public.production_people.family_notes is
  'Player-level Family workspace notes (siblings, dynamics, recruiting family context). Not parent Person.notes.';
