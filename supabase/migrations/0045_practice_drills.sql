-- Team Operations: Practice drill library. Source values mirror Drills.csv exactly.

create table if not exists public.practice_drills (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique,
  name text not null,
  description text,
  source_tags text,
  tags text[] not null default '{}',
  category text,
  notes text,
  frequency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practice_drills_name_idx on public.practice_drills (name);
create index if not exists practice_drills_tags_idx on public.practice_drills using gin (tags);

grant select, insert, update, delete on table public.practice_drills to authenticated;
alter table public.practice_drills enable row level security;

drop policy if exists "Authenticated users can read practice drills" on public.practice_drills;
create policy "Authenticated users can read practice drills" on public.practice_drills for select to authenticated using (true);
drop policy if exists "Authenticated users can create practice drills" on public.practice_drills;
create policy "Authenticated users can create practice drills" on public.practice_drills for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update practice drills" on public.practice_drills;
create policy "Authenticated users can update practice drills" on public.practice_drills for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete practice drills" on public.practice_drills;
create policy "Authenticated users can delete practice drills" on public.practice_drills for delete to authenticated using (true);

with source(name, description, source_tags, category, notes, frequency) as (values
  ('Take the Volley & Come in Singles:', '', 'Drills,Volley', 'Drills', '', '2'),
  ('Take Volley and Come in Doubles', '', 'Drills,Volley', 'Drills', '', '2'),
  ('221 Drill', 'groundstroke to B or A, second groundstrokes to B or A, third groundstroke to D to open up backhand', 'Live Ball,Groundstrokes', 'Drills', '', '3'),
  ('Portnoy ISO drill', 'Breakdown the A or Breakdown for Forehand', 'Live Ball,Groundstrokes,Forehand', 'Drills', '', ''),
  ('Serve + 1', 'Serves + First Groundstroke', 'Serve,Live Ball,Groundstrokes', 'Drills', '', '2'),
  ('Middle Forehands', 'Rally through the middle hitting all forehand ', 'Forehand,Live Ball', 'Drills', '', '1'),
  ('Return + 1', 'Returns', 'Live Ball,Returns', 'Drills', '', '3'),
  ('VT Drill (Volley Tolerance)', 'One side at the baseline /  one side of the net  / switch every three points up the line only Allelys are good.  no Lobs and no drop Volleys. We are working on building that Ball tolerance.', 'Volley,Games', 'Drills', '', '2'),
  ('Pin & Attack Drill', 'Start feed through middle, rally from baseline.  Try and keep your opponent “pinned” deep (3) and look to attach middle third (2)', 'Groundstrokes,Drills', 'Drills', '', '2'),
  ('Big Serve - 10 Pointer', 'Give each player 10 points to serve. If they win the point with a first serve made - they get 3 points, if they win the point off of a second serve, they get two points. If they lose the point - they subtract 1 for the total. Most points win', 'Serve', 'Games', '', ''),
  ('10/10/10/10', 'Serves', 'Serve', 'Drills', '', ''),
  ('Volley Volley', 'Step to the ball ', 'Serve', 'Drills', '', ''),
  ('15 Overheads', 'Hit them all flat and straight line', 'Overheads', 'Drills', '', ''),
  ('High / Low Volleys & Overheads', '1 baseline, 1 net. Baseline hits high and low volleys, touch shots & lobes', 'Volley', 'Drills', '', ''),
  ('Inside out / Inside in FH', '2 on 1.  The one is hitting II & IO', 'Groundstrokes', 'Drills', '', ''),
  ('Dead ball high feed to inside in forehand', 'Start with high soft feed to D. Player hits inside - in forehand to start point', 'Groundstrokes,Defense ', 'Games', '', ''),
  ('Plus Minus Point Play', 'Players play baseline game. 1 player is the “Plus” and gets +1 over every point, the other is the “Minus”. Game to Plus 2 or Minus 2', 'Groundstrokes', 'Games', '', ''),
  ('Serve-under-pressure: ', 'Service games from 30-30 with second serve only', 'Serve', 'Games', '', '2'),
  ('10-ball Service Efficiency Challenge', '10 first serves; must make 6, win 4. If you do this - you get a “Hold” - next player serves.  Games to 2 holds', 'Serve', 'Games', '', '2'),
  ('“attack-return” defense drills ', 'erve second serves and simulate aggressive first-ball defense to neutralize those early winners.', 'Serve,Returns', 'Drills', '', ''),
  ('3 Levels Return', 'Alcaraz Drill.  3 levels of returning of serve', 'Returns,Serve', '', '', ''),
  ('No Wide or in the Net', 'Play Baseline points where all points won count as 2 points. If you miss wide or in the net - you lose 3 points ', 'Groundstrokes', 'Games', '', ''),
  ('Volley Volley Ping Pong', 'Volley. Violley Ping Pomg', 'Volley', 'Games', '', ''),
  ('Power and poach dubs', 'Fees to baseline.  He goes middle or line and net man poaches ', 'Volley,Doubles', 'Drills', '', ''),
  ('Cash Drill', '10 balls at the Net - run up and grab one if you win the points', 'Doubles', 'Games', '', ''),
  ('Defensive Singles', 'Games to 5, feed the ball in as soon as the previous point ends, player receiving feed should be on the run or on defense immediately - not running for ball = lose game ', 'Singles', 'Games', '', '')
), normalized as (
  select
    md5(concat_ws(E'\u001f', name, description, source_tags, category, notes, frequency)) as import_key,
    name, description, source_tags,
    array(select btrim(tag) from unnest(string_to_array(source_tags, ',')) tag) as tags,
    category, notes, frequency
  from source
)
insert into public.practice_drills (import_key, name, description, source_tags, tags, category, notes, frequency)
select import_key, name, description, source_tags, tags, category, notes, frequency from normalized
on conflict (import_key) do update set
  name = excluded.name,
  description = excluded.description,
  source_tags = excluded.source_tags,
  tags = excluded.tags,
  category = excluded.category,
  notes = excluded.notes,
  frequency = excluded.frequency,
  updated_at = now();

comment on table public.practice_drills is
  'Reusable Team Operations practice drills; initial rows imported idempotently from Drills.csv.';
