-- Player Equipment workspace — apparel sizes and tennis gear on Person.
-- These are player attributes, not Operations inventory (EquipmentItem).

alter table public.production_people
  add column if not exists t_shirt_size text;

alter table public.production_people
  add column if not exists dri_fit_size text;

alter table public.production_people
  add column if not exists collared_shirt_size text;

alter table public.production_people
  add column if not exists long_sleeve_size text;

alter table public.production_people
  add column if not exists jacket_size text;

alter table public.production_people
  add column if not exists hoodie_size text;

alter table public.production_people
  add column if not exists shorts_size text;

alter table public.production_people
  add column if not exists pants_size text;

alter table public.production_people
  add column if not exists shoe_size numeric;

alter table public.production_people
  add column if not exists racket text;

alter table public.production_people
  add column if not exists grip_size text;

alter table public.production_people
  add column if not exists string text;

alter table public.production_people
  drop constraint if exists production_people_apparel_size_valid;

alter table public.production_people
  add constraint production_people_apparel_size_valid
  check (
    (t_shirt_size is null or t_shirt_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (dri_fit_size is null or dri_fit_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (collared_shirt_size is null or collared_shirt_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (long_sleeve_size is null or long_sleeve_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (jacket_size is null or jacket_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (hoodie_size is null or hoodie_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (shorts_size is null or shorts_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
    and (pants_size is null or pants_size in ('Small', 'Medium', 'Large', 'XL', 'XXL'))
  );

alter table public.production_people
  drop constraint if exists production_people_grip_size_valid;

alter table public.production_people
  add constraint production_people_grip_size_valid
  check (
    grip_size is null or grip_size in (
      '4"',
      '4 1/8"',
      '4 1/4"',
      '4 3/8"',
      '4 1/2"',
      '4 5/8"'
    )
  );

comment on column public.production_people.t_shirt_size is
  'Player apparel size. Shared Small–XXL vocabulary.';
comment on column public.production_people.dri_fit_size is
  'Player dri-fit size. Shared Small–XXL vocabulary.';
comment on column public.production_people.collared_shirt_size is
  'Player collared-shirt size. Shared Small–XXL vocabulary.';
comment on column public.production_people.long_sleeve_size is
  'Player long-sleeve size. Shared Small–XXL vocabulary.';
comment on column public.production_people.jacket_size is
  'Player jacket size. Shared Small–XXL vocabulary.';
comment on column public.production_people.hoodie_size is
  'Player hoodie/sweatshirt size. Shared Small–XXL vocabulary.';
comment on column public.production_people.shorts_size is
  'Player shorts size. Shared Small–XXL vocabulary.';
comment on column public.production_people.pants_size is
  'Player pants size. Shared Small–XXL vocabulary.';
comment on column public.production_people.shoe_size is
  'Player shoe size (numeric, e.g. 10.5).';
comment on column public.production_people.racket is
  'Player tennis racket (brand/model text).';
comment on column public.production_people.grip_size is
  'Tennis grip size (4" through 4 5/8").';
comment on column public.production_people.string is
  'Tennis string setup (brand/gauge text).';
