-- BP-039B / B2A — Person-to-person relationships foundation.
--
-- Parents/guardians are Person rows (typically role `family` when newly
-- created). The link to a player lives here — not on embedded FamilyContact
-- demo data and not in production_people.relationships jsonb.
--
-- Direction: person_id = source (player), related_person_id = related person
-- (parent/guardian). Inverse queries use related_person_id.
-- Linking an existing Person does not change their role (Option A).
--
-- B2A is read-model foundation only: SELECT for anon/authenticated.
-- INSERT/UPDATE/DELETE policies land with create/link write flows.

create table if not exists public.person_relationships (
  id text primary key,
  person_id text not null references public.production_people (id) on delete cascade,
  related_person_id text not null references public.production_people (id) on delete cascade,
  relationship_type text not null,
  is_primary_contact boolean not null default false,
  is_emergency_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint person_relationships_type_valid check (
    relationship_type in ('mother', 'father', 'guardian', 'other')
  ),
  constraint person_relationships_not_self check (person_id <> related_person_id),
  constraint person_relationships_pair_unique unique (person_id, related_person_id)
);

comment on table public.person_relationships is
  'Person↔Person edges (B2A). Player→parent/guardian links; inverse via related_person_id.';
comment on column public.person_relationships.person_id is
  'Source person (typically a player).';
comment on column public.person_relationships.related_person_id is
  'Related person (typically a parent/guardian).';
comment on column public.person_relationships.relationship_type is
  'Edge label key: mother | father | guardian | other (display: Mother/Father/Guardian/Other).';

create index if not exists person_relationships_person_id_idx
  on public.person_relationships (person_id);

create index if not exists person_relationships_related_person_id_idx
  on public.person_relationships (related_person_id);

create or replace function public.set_person_relationships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_person_relationships_updated_at on public.person_relationships;
create trigger trg_person_relationships_updated_at
  before update on public.person_relationships
  for each row
  execute function public.set_person_relationships_updated_at();

alter table public.person_relationships enable row level security;

drop policy if exists "Allow anon read access" on public.person_relationships;
create policy "Allow anon read access"
  on public.person_relationships
  for select
  to anon, authenticated
  using (true);

grant select on table public.person_relationships to anon, authenticated;
