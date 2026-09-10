-- Knowledge: Officials directory. 25 rows from Officials List.csv, normalized conservatively.
create table if not exists public.knowledge_officials (
  id uuid primary key default gen_random_uuid(),
  import_key text unique,
  name text not null,
  email text,
  phone text,
  preferred_contact text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  rate text,
  ranking smallint,
  is_area_assignor boolean not null default false,
  assignor_area text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_officials_ranking_check check (ranking is null or (ranking between 1 and 5)),
  constraint knowledge_officials_preferred_contact_check check (
    preferred_contact is null
    or preferred_contact in ('Email', 'Phone', 'Text', 'No preference')
  )
);

create index if not exists knowledge_officials_name_idx on public.knowledge_officials (name);
create index if not exists knowledge_officials_location_idx on public.knowledge_officials (state, city);
create index if not exists knowledge_officials_ranking_idx on public.knowledge_officials (ranking);

grant select, insert, update, delete on table public.knowledge_officials to authenticated;
alter table public.knowledge_officials enable row level security;
drop policy if exists "Authenticated users can read officials" on public.knowledge_officials;
create policy "Authenticated users can read officials" on public.knowledge_officials for select to authenticated using (true);
drop policy if exists "Authenticated users can create officials" on public.knowledge_officials;
create policy "Authenticated users can create officials" on public.knowledge_officials for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update officials" on public.knowledge_officials;
create policy "Authenticated users can update officials" on public.knowledge_officials for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete officials" on public.knowledge_officials;
create policy "Authenticated users can delete officials" on public.knowledge_officials for delete to authenticated using (true);

-- Idempotent seed: insert missing import_key rows only (never overwrite user edits; never delete manual rows).
insert into public.knowledge_officials (
  import_key, name, email, phone, city, rate, notes, ranking, is_area_assignor
)
values
  ('eefb8cabb6a1534b79bb5ed2e1e0b0be','Barry Fittes','bfittes10s@gmail.com','(513) 265-0090','Cincinnati','$135 for 2',null,4,false),
  ('4afedccb52d3ea4c539b5eaf9834165e','Jim Nelson','essenhaus@aol.com','330-465-0078','Wooster',null,null,4,false),
  ('cff088fdc73c30bb2398599739afbc93','Julio Colon','juliocatopr@gmail.com','?(614) 999-2735?',null,null,'Source phone marked uncertain: ?(614) 999-2735?',5,false),
  ('4af87904df0e14e22c114166fddd009d','Matt Swaim','matthew.swaim.2013@owu.edu',null,null,'ITA referee, young guy at NCAC',null,5,false),
  ('429d141fc990fd1f4f664d202d909f74','Mark Anderson','msanderson891@gmail.com',null,null,null,null,1,false),
  ('c9002215641ae50d78ceffa68f458f4a','Joel Moor','jmmoor10s@gmail.com',null,null,null,null,3,false),
  ('22a4f4aee6442c602bac041f121fafcc','Dave Engle','dengle3@woh.rr.com',null,null,null,null,1,false),
  ('15865d99abd46805efc2371d4d5812bc','Marcus Lee','mlee1458@aol.com',null,null,null,null,5,false),
  ('00ce89e1dc818d5a3587148c8fc77b4d','Martin Smith','vector4tfc@protonmail.com',null,null,null,'Ysu invite. Based in Cleveland',5,false),
  ('3fab02e57cfeefdbaa65e87e7db07106','Steve Chenenko','schenenko@gmail.com','(614) 746-9715',null,null,'No longer in OH.',null,false),
  ('7f4dd0e6a0d8917d0fabef6ff5cbff14','Alma Makurat','amakurat@aol.com',null,null,'Indianapolis','Indy',null,false),
  ('19098774a15318e3c0ae0f9a7bcbfe3c','James Patton','jaelpatton@yahoo.com',null,null,'Indianapolis','Indy',null,false),
  ('d9c40472c3ea9b854c6514f7031cdb1f','Phil Christman','phil.d.christman@gmail.com',null,null,null,null,4,false),
  ('ee67112bdb5848f3e565d644c1c9e414','Deanna Brougher','deannatennis@gmail.com',null,null,null,null,2,false),
  ('057bfd79e8edbb48787f852f158250ce','Wynndel Burns','wynndelb@gmail.com',null,null,null,'OVTA supervisor?',null,false),
  ('7e5821aa3e83f8df3f1ab1713485894e','Gary Samuels','ghsamuels@gmail.com',null,null,null,null,5,false),
  ('55a77e81a9f064a567c523ea832fe0fe','Deb Hodges','dh2044103@gmail.com',null,null,'Coordinator','NEO Supervisor. Name had trailing asterisk (*) in source CSV.',5,false),
  ('a63629803f045620f97ac870101dec94','Joe Zabowski','lazijoe@gmail.com','419-262-9059',null,'Canton','originally Fri/Sat',null,false),
  ('f12540e43aa3cf58ea3b3945e5f92df5','Sue Nugent','suenugent1@aol.com',null,null,null,null,1,false),
  ('1487515c45b48cd27280ed9aed6a9516','Robert Velasco','velascorobert@yahoo.com',null,null,'NWU -',null,null,false),
  ('d4b7b3c058961286dd6d20c490c96458','Kay Meyers','myk740@yahoo.com',null,null,null,null,null,false),
  ('df7303677adf2b7b5d0ab1fa91aa689b','Udeme Ukutt','uukutt007@gmail.com',null,null,'Buffalo',null,null,false),
  ('9d2960df0285b2ae662d6a1f0c7f6bea','Michael Scrogham','voyager3n1@msn.com',null,null,null,null,null,false),
  ('f9aafba37983872b7dc2bd48eac57a47','Scott Elbin','scott.elbin@gmail.com',null,null,null,null,null,false),
  ('5a182a8e27cc75b1ae6d15e31f9bc0df','Sheila Shiu','sheilashiu13@gmail.com','330-329-1743',null,null,'NEO',null,false)
on conflict (import_key) do nothing;

comment on table public.knowledge_officials is 'Knowledge officials directory; Officials List.csv imported idempotently (insert-only on import_key).';
