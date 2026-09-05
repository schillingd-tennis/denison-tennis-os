-- Additive: coach-controlled Rank Board tier (1–5). NULL = unassigned.
-- Does not alter coach_rank, priority, or other evaluation fields.

alter table public.recruit_profiles
  add column if not exists tier smallint;

alter table public.recruit_profiles
  drop constraint if exists recruit_profiles_tier_valid;

alter table public.recruit_profiles
  add constraint recruit_profiles_tier_valid
  check (tier is null or tier between 1 and 5);

create index if not exists recruit_profiles_tier_idx
  on public.recruit_profiles (tier);

comment on column public.recruit_profiles.tier is
  'Coach Rank Board tier 1 (highest) through 5. NULL = unassigned. Independent of coach_rank and calculated analytics tier.';
