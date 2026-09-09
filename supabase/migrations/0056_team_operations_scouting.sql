-- Team Operations: Scouting submodule (CSV import + form links).
-- Idempotent seed: ON CONFLICT DO NOTHING on import/source keys — never overwrite user edits.

create table if not exists public.scouting_teams (
  id uuid primary key default gen_random_uuid(),
  import_key text unique,
  display_name text not null,
  identity_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_teams_display_name_unique unique (display_name)
);

create table if not exists public.scouting_opponent_players (
  id uuid primary key default gen_random_uuid(),
  import_key text unique,
  team_id uuid not null references public.scouting_teams(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  handedness text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_opponent_players_handedness_check check (
    handedness is null or handedness in ('Right', 'Left')
  ),
  constraint scouting_opponent_players_team_name_unique unique (team_id, normalized_name)
);

create index if not exists scouting_opponent_players_team_idx on public.scouting_opponent_players (team_id);
create index if not exists scouting_opponent_players_name_idx on public.scouting_opponent_players (normalized_name);

create table if not exists public.scouting_direct_reports (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source text not null default 'csv_import',
  team_id uuid not null references public.scouting_teams(id) on delete cascade,
  opponent_player_id uuid references public.scouting_opponent_players(id) on delete set null,
  opponent_display_name text not null default '',
  match_date date,
  match_date_raw text,
  handedness text,
  handedness_raw text,
  strengths_weaknesses text,
  scouting_report text,
  report_by text,
  is_doubles boolean not null default false,
  import_status text not null default 'imported',
  attachment_refs jsonb not null default '[]'::jsonb,
  user_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_direct_reports_source_check check (
    source in ('csv_import', 'coach_entry', 'player_form')
  ),
  constraint scouting_direct_reports_handedness_check check (
    handedness is null or handedness in ('Right', 'Left')
  ),
  constraint scouting_direct_reports_import_status_check check (
    import_status in ('imported', 'unresolved_review', 'compound_unresolved', 'team_level')
  )
);

create index if not exists scouting_direct_reports_team_idx on public.scouting_direct_reports (team_id);
create index if not exists scouting_direct_reports_player_idx on public.scouting_direct_reports (opponent_player_id);
create index if not exists scouting_direct_reports_date_idx on public.scouting_direct_reports (match_date desc nulls last);

create table if not exists public.scouting_player_reports (
  id uuid primary key default gen_random_uuid(),
  opponent_player_id uuid not null references public.scouting_opponent_players(id) on delete cascade,
  kind text not null,
  body text not null default '',
  status text not null default 'draft',
  cited_direct_report_ids uuid[] not null default '{}',
  stale boolean not null default false,
  generated_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_player_reports_kind_check check (kind in ('manual', 'ai_generated')),
  constraint scouting_player_reports_status_check check (status in ('draft', 'reviewed'))
);

create unique index if not exists scouting_player_reports_one_manual
  on public.scouting_player_reports (opponent_player_id) where kind = 'manual';
create unique index if not exists scouting_player_reports_one_ai
  on public.scouting_player_reports (opponent_player_id) where kind = 'ai_generated';

create table if not exists public.scouting_team_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.scouting_teams(id) on delete cascade,
  kind text not null,
  body text not null default '',
  status text not null default 'draft',
  cited_direct_report_ids uuid[] not null default '{}',
  cited_player_report_ids uuid[] not null default '{}',
  attachment_refs jsonb not null default '[]'::jsonb,
  stale boolean not null default false,
  generated_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_team_reports_kind_check check (kind in ('manual', 'ai_generated')),
  constraint scouting_team_reports_status_check check (status in ('draft', 'reviewed'))
);

create table if not exists public.scouting_form_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null default '',
  team_id uuid references public.scouting_teams(id) on delete set null,
  opponent_player_id uuid references public.scouting_opponent_players(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scouting_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_link_id uuid not null references public.scouting_form_links(id) on delete cascade,
  status text not null default 'new',
  opponent_display_name text not null default '',
  team_display_name text not null default '',
  match_date date,
  handedness text,
  strengths_weaknesses text,
  scouting_report text,
  report_by text,
  is_doubles boolean not null default false,
  client_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint scouting_form_submissions_status_check check (
    status in ('new', 'reviewed', 'needs_clarification', 'archived')
  ),
  constraint scouting_form_submissions_handedness_check check (
    handedness is null or handedness in ('Right', 'Left')
  )
);

create index if not exists scouting_form_submissions_link_idx on public.scouting_form_submissions (form_link_id);
create index if not exists scouting_form_submissions_status_idx on public.scouting_form_submissions (status);

-- Rate-limit bucket for public form posts (token hash + minute window).
create table if not exists public.scouting_form_rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  window_started_at timestamptz not null default date_trunc('minute', now()),
  hit_count integer not null default 1,
  constraint scouting_form_rate_limits_bucket_unique unique (bucket_key, window_started_at)
);

grant select, insert, update, delete on table public.scouting_teams to authenticated;
grant select, insert, update, delete on table public.scouting_opponent_players to authenticated;
grant select, insert, update, delete on table public.scouting_direct_reports to authenticated;
grant select, insert, update, delete on table public.scouting_player_reports to authenticated;
grant select, insert, update, delete on table public.scouting_team_reports to authenticated;
grant select, insert, update, delete on table public.scouting_form_links to authenticated;
grant select, insert, update, delete on table public.scouting_form_submissions to authenticated;
grant select, insert, update, delete on table public.scouting_form_rate_limits to authenticated;

alter table public.scouting_teams enable row level security;
alter table public.scouting_opponent_players enable row level security;
alter table public.scouting_direct_reports enable row level security;
alter table public.scouting_player_reports enable row level security;
alter table public.scouting_team_reports enable row level security;
alter table public.scouting_form_links enable row level security;
alter table public.scouting_form_submissions enable row level security;
alter table public.scouting_form_rate_limits enable row level security;

drop policy if exists "Authenticated users can read scouting teams" on public.scouting_teams;
create policy "Authenticated users can read scouting teams" on public.scouting_teams for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting teams" on public.scouting_teams;
create policy "Authenticated users can write scouting teams" on public.scouting_teams for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting players" on public.scouting_opponent_players;
create policy "Authenticated users can read scouting players" on public.scouting_opponent_players for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting players" on public.scouting_opponent_players;
create policy "Authenticated users can write scouting players" on public.scouting_opponent_players for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting direct reports" on public.scouting_direct_reports;
create policy "Authenticated users can read scouting direct reports" on public.scouting_direct_reports for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting direct reports" on public.scouting_direct_reports;
create policy "Authenticated users can write scouting direct reports" on public.scouting_direct_reports for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting player reports" on public.scouting_player_reports;
create policy "Authenticated users can read scouting player reports" on public.scouting_player_reports for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting player reports" on public.scouting_player_reports;
create policy "Authenticated users can write scouting player reports" on public.scouting_player_reports for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting team reports" on public.scouting_team_reports;
create policy "Authenticated users can read scouting team reports" on public.scouting_team_reports for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting team reports" on public.scouting_team_reports;
create policy "Authenticated users can write scouting team reports" on public.scouting_team_reports for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting form links" on public.scouting_form_links;
create policy "Authenticated users can read scouting form links" on public.scouting_form_links for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting form links" on public.scouting_form_links;
create policy "Authenticated users can write scouting form links" on public.scouting_form_links for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read scouting form submissions" on public.scouting_form_submissions;
create policy "Authenticated users can read scouting form submissions" on public.scouting_form_submissions for select to authenticated using (true);
drop policy if exists "Authenticated users can write scouting form submissions" on public.scouting_form_submissions;
create policy "Authenticated users can write scouting form submissions" on public.scouting_form_submissions for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can manage scouting rate limits" on public.scouting_form_rate_limits;
create policy "Authenticated users can manage scouting rate limits" on public.scouting_form_rate_limits for all to authenticated using (true) with check (true);

-- Public form: resolve link metadata (no auth). Never returns token_hash.
create or replace function public.scouting_resolve_form_link(p_token_hash text)
returns table (
  link_id uuid,
  label text,
  team_display_name text,
  player_display_name text,
  expires_at timestamptz,
  revoked boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return;
  end if;
  return query
  select
    l.id,
    l.label,
    t.display_name,
    p.display_name,
    l.expires_at,
    (l.revoked_at is not null) as revoked
  from public.scouting_form_links l
  left join public.scouting_teams t on t.id = l.team_id
  left join public.scouting_opponent_players p on p.id = l.opponent_player_id
  where l.token_hash = lower(p_token_hash)
  limit 1;
end;
$$;

-- Public form submit with rate limit (8 posts / token / minute).
create or replace function public.scouting_submit_form_response(
  p_token_hash text,
  p_opponent_display_name text,
  p_team_display_name text,
  p_match_date date,
  p_handedness text,
  p_strengths_weaknesses text,
  p_scouting_report text,
  p_report_by text,
  p_is_doubles boolean,
  p_client_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := lower(trim(p_token_hash));
  v_link public.scouting_form_links%rowtype;
  v_window timestamptz := date_trunc('minute', now());
  v_hits integer;
  v_id uuid;
begin
  if v_hash is null or length(v_hash) < 32 then
    raise exception 'invalid_token';
  end if;

  select * into v_link from public.scouting_form_links where token_hash = v_hash;
  if not found then
    raise exception 'invalid_token';
  end if;
  if v_link.revoked_at is not null then
    raise exception 'revoked_token';
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'expired_token';
  end if;

  insert into public.scouting_form_rate_limits (bucket_key, window_started_at, hit_count)
  values (v_hash, v_window, 1)
  on conflict (bucket_key, window_started_at)
  do update set hit_count = public.scouting_form_rate_limits.hit_count + 1
  returning hit_count into v_hits;

  if v_hits > 8 then
    raise exception 'rate_limited';
  end if;

  if p_handedness is not null and p_handedness not in ('Right', 'Left') then
    raise exception 'invalid_handedness';
  end if;

  if coalesce(trim(p_opponent_display_name), '') = '' and coalesce(trim(p_strengths_weaknesses), '') = '' and coalesce(trim(p_scouting_report), '') = '' then
    raise exception 'empty_submission';
  end if;

  insert into public.scouting_form_submissions (
    form_link_id, status, opponent_display_name, team_display_name, match_date,
    handedness, strengths_weaknesses, scouting_report, report_by, is_doubles, client_fingerprint
  ) values (
    v_link.id, 'new', coalesce(p_opponent_display_name, ''), coalesce(p_team_display_name, ''), p_match_date,
    p_handedness, p_strengths_weaknesses, p_scouting_report, p_report_by, coalesce(p_is_doubles, false), p_client_fingerprint
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.scouting_resolve_form_link(text) from public;
revoke all on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) from public;
grant execute on function public.scouting_resolve_form_link(text) to anon, authenticated;
grant execute on function public.scouting_submit_form_response(text, text, text, date, text, text, text, text, boolean, text) to anon, authenticated;

-- Seed teams
insert into public.scouting_teams (import_key, display_name)
values
  ('cebb2a3935665104537e0dcf0ea08468', 'Amherst'),
  ('cba2af0d6f76d9e2adc8e4b184559573', 'CWRU'),
  ('90902896273bcab4f8eb1caaa4c2258e', 'Chicago'),
  ('7bab4292ef94654b81c4679c67efdfde', 'Emory'),
  ('f0de0947e79b02bb06c26bd52d50a55e', 'Gustavus'),
  ('7956f13676f90f7adf5729a23215617a', 'Kenyon'),
  ('517cf2dd35fae563019c33aa1fe4ed6f', 'Swarthmore'),
  ('81732cf236e177ec466f141109edb253', 'Wash U')
on conflict (import_key) do nothing;

-- Link identity_slug from known school helpers (display-name based; no duplicate school table).
update public.scouting_teams set identity_slug = case lower(display_name)
  when 'amherst' then 'amherst'
  when 'wash u' then 'wash-u'
  when 'kenyon' then 'kenyon'
  when 'swarthmore' then 'swarthmore'
  when 'chicago' then 'chicago'
  when 'cwru' then 'case-western'
  when 'emory' then 'emory'
  when 'gustavus' then 'gustavus-adolphus'
  else identity_slug
end
where import_key is not null;

-- Seed players
insert into public.scouting_opponent_players (import_key, team_id, display_name, normalized_name, handedness)
select
  v.import_key,
  t.id,
  v.display_name,
  v.normalized_name,
  v.handedness
from (values
  ('88701c06762822e3d4b18e34bce24e17', 'Swarthmore', 'Michael Melnikov', 'michael melnikov', 'Right'),
  ('a54ba120531e026b225ea9fc5f14f47b', 'Kenyon', 'Stylianos Papamichael', 'stylianos papamichael', 'Right'),
  ('bc2e5d05cdecf83a9ef58a27c0f62829', 'Kenyon', 'Paulo Pocasangre', 'paulo pocasangre', 'Right'),
  ('00951bf0c369323f2a6456398f5dab79', 'Kenyon', 'Jay Dixit', 'jay dixit', 'Right'),
  ('6a31cc3c425f6c3906f33fc1d90096d8', 'Kenyon', 'Gonzalez Gonzalez', 'gonzalez gonzalez', 'Right'),
  ('a43798d6a2b3854649cf0b50b255f5fb', 'Kenyon', 'Alejandro Gonzalez', 'alejandro gonzalez', 'Right'),
  ('50828e4f29ae2b86cf76cb7b9707aa37', 'Kenyon', 'Maximo Castellanos', 'maximo castellanos', 'Right'),
  ('9725cc781d08d812e99ca84e0c23d4d0', 'Emory', 'Matthew Johnstone', 'matthew johnstone', 'Right'),
  ('de40cad6bcb2b83eaafe7d1c40bf1ab1', 'Emory', 'Ruin Feng', 'ruin feng', 'Right'),
  ('9df4c4b6832e5abd0c312fe878ce25f6', 'Amherst', 'Andreas Sillaste', 'andreas sillaste', 'Right'),
  ('3dd52c4e82204c1625cd1d3c77cc3132', 'Amherst', 'Cal Wider', 'cal wider', 'Left'),
  ('d511c0de40cc7a86d96c4385ab53244e', 'Amherst', 'George Chaimados', 'george chaimados', 'Left'),
  ('c502196b3d73039d5b909a119c86db60', 'Amherst', 'Lukas Fraganberg', 'lukas fraganberg', 'Right'),
  ('12d540a7d321f83443b458ae99aa38b5', 'Amherst', 'Aldiyar Abzhan', 'aldiyar abzhan', 'Left'),
  ('1380baaa391b4d32a1e303f179945954', 'Amherst', 'Rex Harrison', 'rex harrison', 'Left'),
  ('66008c3e387319fbb7e7529082419dbb', 'Amherst', 'Ronald Gualario', 'ronald gualario', 'Right'),
  ('6822df9338772c506fb7903c76865320', 'Chicago', 'Ajer Sher', 'ajer sher', 'Right'),
  ('1098f6b842b9d2307e5aada3ffc7797d', 'Swarthmore', 'Seth Sadikov', 'seth sadikov', 'Right'),
  ('6cfb398f3fd4c6b769ffb8d521907c69', 'Gustavus', 'Deuce Daniel', 'deuce daniel', 'Right'),
  ('8732819e67c63485c40b20f546e6e3cb', 'CWRU', 'Anmay Devaraj', 'anmay devaraj', 'Right'),
  ('35641a733ba9303dd9434ab844c63652', 'CWRU', 'Jon Totorica', 'jon totorica', 'Right'),
  ('232e0bc0eb49002b141f164779f9c0b7', 'Chicago', 'Alex Ekstrand', 'alex ekstrand', 'Right'),
  ('05eab95bf9730e8e2ba8daca3ba4b79a', 'Wash U', 'Jeremy Sieben', 'jeremy sieben', 'Right'),
  ('212de3424c2e9a6f0a6bb170f96f6ef5', 'Wash U', 'Coleman Merce', 'coleman merce', 'Right'),
  ('2f87cfcf7282369b8d0a524ff0f61a3e', 'Wash U', 'Case Fagan', 'case fagan', 'Right'),
  ('d8c2e66ada76a837762395ef4e3f1163', 'Wash U', 'Eric Kuo', 'eric kuo', 'Right')
) as v(import_key, team_display_name, display_name, normalized_name, handedness)
join public.scouting_teams t on t.display_name = v.team_display_name
on conflict (import_key) do nothing;

-- Seed direct reports from JSON (preserves newlines / bullets)
with source as (
  select * from jsonb_to_recordset($scouting$[{"source_key":"4536a3cfda328e4a3b02773b5f3b5baa","kind":"player_report","team_display_name":"Swarthmore","player_import_key":"88701c06762822e3d4b18e34bce24e17","opponent_display_name":"Michael Melnikov","match_date":"2026-06-27","date_raw":"6/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Melnikov won the match after Kael took the first set. Melnikov attacked Kael's second serve and kept him on defense throughout the match.\n\n• Big serve, tough to break\n• Loves low balls and goes for winners\n• BH stronger than FH\n• Willing to come to net with good volley\n• Hard to lob\n\nATTACK:\n• Huge serve\n• Attacks second serve\n• Goes for winners on low balls\n• Good volley at net\n\nWATCH OUT FOR:\n• Get the ball up on him\n• Don't try to lob him","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"f982bc648051a0566f4c238cfbe9311a","kind":"player_report","team_display_name":"Kenyon","player_import_key":"a54ba120531e026b225ea9fc5f14f47b","opponent_display_name":"Stylianos Papamichael","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strengths:\n\nmovement\n\npassing shots \n\nconsistency\n\nslice\n\n\n\nWeaknesses:\n\nserve\n\nnet play \n\napproach shots \n\nforehand return","scouting_report":"","report_by":"Aidan","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"86886fd89169760ce19783e9a6878c68","kind":"compound_opponent","team_display_name":"Kenyon","player_import_key":null,"opponent_display_name":"Alejandro Gonzalez and Eliezer Gonzalez","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"We both served very well. Alejandro and Eli didn't play very offensively, which allowed us to take control. We both hit hard and deep which helped. We moved at the net at the right time. ","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"7df178fe02d8c7b5b63af7a4c1ccc396","kind":"player_report","team_display_name":"Kenyon","player_import_key":"bc2e5d05cdecf83a9ef58a27c0f62829","opponent_display_name":"Paulo Pocasangre","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Paulo had a good serve and good forehand. He didn’t have a weapon with his backhand and sliced a lot. I could've served better, but I hit the ball well. I should have come in more on balls that stretched Paulo wide. ","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"27223e3b9d288ef2a7655c5d7cb18bd7","kind":"player_report","team_display_name":"Kenyon","player_import_key":"00951bf0c369323f2a6456398f5dab79","opponent_display_name":"Jay Dixit","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strenghts:\n\n* Very good kick serve on Ad and Deuce as well very hard to get a forehand on Deuce side, but Ad side kick serve is even better had to either short hop SABR or bleed it out super deep\n* Slice very good as well used it I would say about 60-70% of the time instead of a backahdn\n* Big forehand if ball is left short or slow\n* Loves hitting low flat balls at his waist his prime position\n* Great hands in second set, first not really but second very good with volleys\n* Good with on the run passing shots, going middle to come in was better likes to be stretched\n* Likes to come in when he can not an insane amount, if he served and volleyed more with the kick it would’ve been a much tougher match\n\nWeaknesses:\n\n* Movement if you wrong foot him very hard for him to get to ball\n* Passing shots were not great unless court was wide open\n* Backhand didn’t do much\n* Breaks down and misses randomly\n* Return isn’t special not terrible but all he can do really is block back or slap a forehand if he gets lucky, missed about 4-6 forehand deuce side returns in the net and maybe hit one winner on it max","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"ee82394b07ff72d6d855ce8d4e51ffad","kind":"player_report","team_display_name":"Kenyon","player_import_key":"6a31cc3c425f6c3906f33fc1d90096d8","opponent_display_name":"Gonzalez Gonzalez","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"alejandro weak backhand return, can’t stick volley, a lot of drop volleys. Doesn’t miss on the forehand strong serve\n\neli cross formation to the forehand stronger volleys moves a lot at the net. Strong serves but breaks down a lot more.","scouting_report":"","report_by":"Wesley","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a5d73c462c11ca57ad183dde7ac97f14","kind":"player_report","team_display_name":"Kenyon","player_import_key":"a43798d6a2b3854649cf0b50b255f5fb","opponent_display_name":"Alejandro Gonzalez","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Backhand Weakness\n\nGreat Mover\n\nSolid Volleys\n\nMakes lots of good first serves","scouting_report":"","report_by":"Ethan","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"47dbc19c93d954741b9a503484ce49b5","kind":"player_report","team_display_name":"Kenyon","player_import_key":"50828e4f29ae2b86cf76cb7b9707aa37","opponent_display_name":"Maximo Castellanos","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Solid from both ends. Forehand is weapon and looks to hit majority forehands. Serve will start off well but then drop off, not confident at the net, mentally weak.","scouting_report":"","report_by":"Kael","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"3d3b29f390e925022a1b36e40190de5c","kind":"player_report","team_display_name":"Kenyon","player_import_key":"a43798d6a2b3854649cf0b50b255f5fb","opponent_display_name":"Alejandro Gonzalez","match_date":"2026-04-18","date_raw":"4/18/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"ATTACK:\n• Come forward whenever he pushes short—he's vulnerable at net despite decent volleys\n• Hit hard at him or go over him on approach shots; don't float soft balls to his sides\n• Play through the middle to force him into creation mode rather than defense\n\nWATCH OUT FOR:\n• His defensive consistency—won't give free points, so avoid going for too much early\n• Solid volley technique on soft balls, so keep approach shots firm and varied\n• Patient baseline game; he'll absorb pace and wait for opportunities","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"c3ee84f276588ee7afbd8609ae872485","kind":"player_report","team_display_name":"Emory","player_import_key":"9725cc781d08d812e99ca84e0c23d4d0","opponent_display_name":"Matthew Johnstone","match_date":"2026-03-29","date_raw":"3/29/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"S:\n\n* Ball tolerance and movement\n* Fighting spirit and energy\n* Returns good didn’t miss any but didn’t put much pressure on you unless you gave him a deuce side forehand he hit a couple winners short cross on me\n* Angles especially forehand side can push you out wide very very easily\n\nW:\n\n* Serve can’t hurt you every one of them is a slice don’t think he hit a single kick\n* Hurting you, can’t do it unless ball is left insanely short, he came to the net I believe three times total in the match and only hit one volley\n* Don’t think he can volley to well maybe more towards the neutral side then weakness\n\nN:\n\n* Backhand and forehand both pretty even all around","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a2b290003e8a83dfd565baa5acf0c3ed","kind":"player_report","team_display_name":"Emory","player_import_key":"de40cad6bcb2b83eaafe7d1c40bf1ab1","opponent_display_name":"Ruin Feng","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"","scouting_report":"","report_by":"","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a592b700b8eed2d4b7a798eb304fd6e0","kind":"player_report","team_display_name":"Amherst","player_import_key":"9df4c4b6832e5abd0c312fe878ce25f6","opponent_display_name":"Andreas Sillaste","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a34472cc94670f2b44f1e3314bfd9c69","kind":"player_report","team_display_name":"Amherst","player_import_key":"3dd52c4e82204c1625cd1d3c77cc3132","opponent_display_name":"Cal Wider","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"2cde9d0ec40098fd7fc8a5396f643f8f","kind":"player_report","team_display_name":"Amherst","player_import_key":"d511c0de40cc7a86d96c4385ab53244e","opponent_display_name":"George Chaimados","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"Lefty. Crafty and patient. Drops deep behind the baseline and runs well. A lot of heart.  Probably heart of team. A lot of chip forehand and junk. Will serve and volley from time to time.  Keeps you off balance and out of rhythm. His cc forehand from d can’t hurt you and if he tries to go line he breaks down. He is all loop forehand cc.  Need to stay steady on that side. Jake would probably try and pull trigger dtl too soon.  Chapi stays in discipline and gets George to go for the dtl. Likes to sneak in off of slice backhand. Backhand maybe better than forehand. Can’t really hurt you with forehand. \n\n\n\n\nWhen he sneaks in make him volley. Slow passing shots or chips are effective. Very erratic volley. \n\n\n","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"27b71aa22150302418a625d4ea19e17d","kind":"player_report","team_display_name":"Amherst","player_import_key":"c502196b3d73039d5b909a119c86db60","opponent_display_name":"Lukas Fraganberg","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Volley suspect. Hits big and wants to dictate with forehand. Will df some. Rushed his serve. Natural cc forehand pretty good. Good with forehand from b/c. Playing him middle forehand like Sarmiento might be the play.  Have to have pace.  Forehand from B suspect as footwork is not great.  Off pace is a good play too. ","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"06c55cb8c34422587ea66bde7557fbc7","kind":"player_report","team_display_name":"Amherst","player_import_key":"12d540a7d321f83443b458ae99aa38b5","opponent_display_name":"Aldiyar Abzhan","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"Lefty - big size. Willing to come in - but no agility. GIves ground easily as he needs time to setup, especially on forehand. 2H backhand good when he can step in. Anything that makes him move is good. A little double hitch on the backhand ( a bit like Nick) - does this timing thing. When he comes in, he is kind of an easy pass as he has no lateral movement - don’t need to be too good with the passing shot.  Loves the flat inside out serve, but doesn’t really make it that much.  Much more likely to step into a backhand than a forehand (since he backs up (gives ground) easily). Not much ball tolerance - meaning he doesn’t want long points.  Prefers inside-out forehand from middle of the court - as that is one of his best weapons (but not consistent). Not a terribly cerebral or confident player. Need to get on him early and make him frustrated.  When he tries to slice his backhand it is a mess - long and sloppy. Doesn’t move well at baseline - need time to feel good about his groundstrokes.  He is pretty good attacking short balls (inside the service line) - but again - not great at the net. Wants to play big and come in - but is probably not good enough to do it consistently.  Chapi and Jake are probably both good match ups for him. With time (to set up his groundstrokes) he is pretty good - take time away and he falls off significantly because his footwork is very suspect.  He has a decent volley if it comes to him in a comfortable position.  Good overhead and is 6’5 so don’t Try and lob early in the point when you are on defense because he has come in to the net.","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"75b649d1b84dbcc5e8e011173a4560a9","kind":"player_report","team_display_name":"Amherst","player_import_key":"1380baaa391b4d32a1e303f179945954","opponent_display_name":"Rex Harrison","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"Lefty. Steady. Good 2H backhand that he can hit in either direction. Forehand to his D position - can’t really hurt you. Big windup on Forehand if you can hit pace to that side. Runs pretty well - but not a great athlete - competes hard. Clean footwork. Good movement on lefty slice serve. Defense is suspect running to his left. Patience may be a question. \n\nreally leans into the lefty serve stuff. Lots of hard slice. 2H backhand from middle of the court can breakdown as he gets lazy. Forehand is good but when he tries to go inside out from middle of the court- the footwork breaks down and he will make errors.  Will come in and look to attach short balls. Good athlete with good flexibility.  Can play defense with his hands and flex. Doesn’t run great - especially up and back. Loves to dictate with his forehand - especially from “A” position and “B” position. Hard to read where he is hitting his forehand. Will serve and volley some.  Prototypical lefty game. \n\nStronger kid than I would have thought. Has good pace, and penetration off of groundstrokes. Comes into the net a fair amount (53 times out of 180 points 29%).  Backhand is short and compact and clean.  Good stroke.  Likes to play “Big Tennis” “First Strike” tennis.  Backhand can hurt you.  Can probably lob him when he comes in as he is tight on the net. Up high on the backhand will create some errors. Will double fault some \n\nI don’t think his “ball tolerance” (willingness to stay in a baseline rally) is high based on video and his net appearances stats. \n\nCan’t really hurt you from “d” - more dangerous from “a”.  Loves to hit inside out forehand from “B” to “A” .  He loves “B” to “A” as a lefty\n\nCan probably lob him as he is fairly close to the next when he comes in. For a guy that comes in a lot - he doesn’t serve and volley much\n\n** From Forehand corner (“ D” as a lefty) he wants to hit 1 crosscourt then go for the big forehand down the line - which is really 50/50 hit or miss\n\n** He hits his forehand to the open court a really high percentage of the time. \n\nFor the amount of times he comes in - he is not a great volleyer.  Will make errors and not terribly agile.  Backhand volley might be better / more reliable than forehand volley. Overhead not great. \n\n\n\n\n\n\n\nWill Double fault some \n\n\n","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"e1b3a64a5b703966e46f4dbd30b34c50","kind":"player_report","team_display_name":"Amherst","player_import_key":"66008c3e387319fbb7e7529082419dbb","opponent_display_name":"Ronald Gualario","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Big Guy. 1H backhand - not a threat. Big serve and relies on it. Not fast and doesn’t run great - but he does run hard. Forehand is long and straight armed. Footwork is suspect in the middle of the court - so that might be a good target. 1H backhand is good from the sidelie (postion D) and if he can get his arm extended. Serves and Volleys a fair amount - GO AT BACKHAND VOLLEY BODY (don’t let him get his arms extended -  jam him).  Wants to come in and play agressive - not looking to grind. Anthony should be a good matchup. Will run around backhand to get forehands from C and D.  Closes hard at the net - so you can go over him with a lob - especially after the first volley.   His favorite serve is the hard slice serve on both sides, that moves a lot. He let’s the “bounce do the work”.  He is pretty “chill” and not terribly loud - but he does get frustrated and shows in his body language. Good traditional volley if he has time. Not much ball tolerance - wants to attack quickly with big groundstrokes.  Straight arm forehand is a problem for him - especially from the middle of the court.","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"9fede5641b60f7aeef7a6307da854ce3","kind":"compound_opponent","team_display_name":"Amherst","player_import_key":null,"opponent_display_name":"Sillaste / Frangenberg","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"","handedness":null,"strengths_weaknesses":"","scouting_report":"","report_by":"","is_doubles":true,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"3e4fa244002be67aef1e91881b9fae82","kind":"compound_opponent","team_display_name":"Amherst","player_import_key":null,"opponent_display_name":"Chaidemenos (ad) /Harrison (deuce)","match_date":"2026-03-27","date_raw":"3/27/2026","handedness_raw":"","handedness":null,"strengths_weaknesses":"","scouting_report":"","report_by":"Schills","is_doubles":true,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"678399b5a0db609a8e2d58e57be2e9a5","kind":"player_report","team_display_name":"Amherst","player_import_key":"1380baaa391b4d32a1e303f179945954","opponent_display_name":"Rex Harrison","match_date":"2026-03-18","date_raw":"3/18/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"S:\n\n* Forehand, spinny and good with angles and being able to attack it when given a pretty obvious opportunity\n* Movement was pretty good able to get to both sides of the court well doesn’t mind being stretched out, I can’t remember about hitting middle to him but I think it was just pretty standard rally balls back cuts off his angles\n\nW: \n\n* Shot tolerance after about 10 balls would start to see more errors creep in\n* Keeping him deep and held back spinny high balls good to can’t hurt you if you do that\n* Mental strength when he isn’t winning or even close in score\n\n\n\nNeutral:\n\n* Volleys (unsure but I think average)\n* Serve\n* Backhand","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a5674f7f0fcab529af667236ecfce5c9","kind":"compound_opponent","team_display_name":"Swarthmore","player_import_key":null,"opponent_display_name":"Max Lindstrom and Winston Zhang - Swarthmore","match_date":"2026-02-28","date_raw":"2/28/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"We served and returned well. Hit volleys well. We need to work on not making easy mistakes during rally balls. ","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"0e854fd2734df4d12a86259a0e5a29bb","kind":"compound_opponent","team_display_name":"Swarthmore","player_import_key":null,"opponent_display_name":"Nikola Galov - Swarthmore","match_date":"2026-02-28","date_raw":"2/28/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"I need to cut down on double faults. After first set, I did better playing the point longer and more smart. I stayed really strong mentally. ","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"6d48ac8fb730be8cab1f85331e2555f5","kind":"player_report","team_display_name":"Chicago","player_import_key":"6822df9338772c506fb7903c76865320","opponent_display_name":"Ajer Sher","match_date":"2026-02-28","date_raw":"2/28/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"S:\n\n* Very hard hitter especially when ball is middle third of the court\n* Great inside out forehand\n* Serve is better than average but not insanely fast\n* Good shot tolerance and movement\n* Gets to both corners well and able to handle pace back well to\n* Volleys unsure didn’t come to net enough to tell\n\nW:\n\n* Middle deep balls seemed to be effective at getting a short ball\n* Approaching to the backhand seemed a bit better than forehand, would generally press for a passing shot when I came in rather than making me volley\n* Drew more errors from either first couple shots or past the 8+ ball mark, rarely missed in the 5-8 rallies\n* Getting return back deep and low generated a couple errors, not giving him time to do anything but give same ball or worse back to me","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"d40a3cb4dfafd7aec0c1ccc9efed8946","kind":"player_report","team_display_name":"Swarthmore","player_import_key":"1098f6b842b9d2307e5aada3ffc7797d","opponent_display_name":"Seth Sadikov","match_date":"2026-02-28","date_raw":"2/28/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"S:\n\n* Backhand (one hander) might not look better technique, but is able to pressure with it and more consistent with it\n* Slices\n* Making you play one more ball and volley in weird positions\n* Movement, able to get to every ball quite well unless it was a put away, or went behind him on a short ball\n\nW:\n\n* Forehand when kept deep\n* Breaks down after like 8+ balls especially when keeping to forehand, if not missing will definitely give a short ball\n* Cannot hurt you almost ever unless ball is landing on the service box slow\n* Serve isn’t great, outwide serve is probably his best serve and doesn’t really have a kick all slice serves from my memory. Pretty good AD side T serve though\n\n","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"a99c08bc9263f4c515d4e7bfee543fed","kind":"player_report","team_display_name":"Gustavus","player_import_key":"6cfb398f3fd4c6b769ffb8d521907c69","opponent_display_name":"Deuce Daniel","match_date":"2026-02-27","date_raw":"2/27/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strengths:\n\n* Consistency from both wings\n* Good movement\n* Serve and volleys pretty well occasionally\n* Gets to a lot of balls and makes you play one more\n\nWeaknesses:\n\n* Mixing up pace, variety especially short low slices will spray errors\n* Gets tired after getting deeper into match (Started to semi cramp a bit at about 3-1 in the third set)\n* Pace, can’t hurt you too bad unless ball is left short","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"21e21781b0fe8bdf5dd9b99d30aa7753","kind":"compound_opponent","team_display_name":"CWRU","player_import_key":null,"opponent_display_name":"Jon Totorica and Leon Chen","match_date":"2026-02-22","date_raw":"2/22/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"We served and returned well. We need to work on aggressiveness at the net and in general.","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"15d0c4457f363601486c21cf764fdd04","kind":"player_report","team_display_name":"CWRU","player_import_key":"8732819e67c63485c40b20f546e6e3cb","opponent_display_name":"Anmay Devaraj","match_date":"2026-02-22","date_raw":"2/22/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"I did well to stay in points and not try to hit winners too early. However, I need to work on my serve and hitting through my forehand. ","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"46d0d78beb1622425b6629609e717409","kind":"player_report","team_display_name":"CWRU","player_import_key":"35641a733ba9303dd9434ab844c63652","opponent_display_name":"Jon Totorica","match_date":"2026-02-22","date_raw":"2/22/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"S:\n\n* Serve (not insanely hard but definitely placed well and generated some aces)\n* Consistency and keeping the balls deep\n* Passing shots when not on the dead run or completely jammed, had to wait for very correct opportunity to come in, also would always try to make me volley for majority of the time when on the run especially\n* Attitude and fight\n\nW:\n\n* Movement after 3-4 balls would start to break down and gave a short ball to attack\n* Returns weren’t unbelievable would miss some especially when mixing up pace and placement a lot, faster serve wasn’t always better\n* Couldn’t really hurt you as long as ball was kept deep\n* Tentative when closer scoreline","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"59243dd3c58bb84b2d689ad2b67d8ce1","kind":"player_report","team_display_name":"Chicago","player_import_key":"232e0bc0eb49002b141f164779f9c0b7","opponent_display_name":"Alex Ekstrand","match_date":"2026-02-21","date_raw":"2/21/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"I did well staying in rallies, but he hit the ball very low which made it hard. He had a better serve and really good hands","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"90806e081d7294946df8ed12a2dafdc5","kind":"compound_opponent","team_display_name":"Chicago","player_import_key":null,"opponent_display_name":"Jack Wong/Robert Zhang","match_date":"2026-02-21","date_raw":"2/21/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"We had a lot of serve issues. Returns got better midway through match. We were a lot more aggressive. We need to work on not starting slow.","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"c9e5296d333303d0c80403bc0f2b77e2","kind":"player_report","team_display_name":"Wash U","player_import_key":"05eab95bf9730e8e2ba8daca3ba4b79a","opponent_display_name":"Jeremy Sieben","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Forehand is huge.  He is a complete slap and can hit with great pace.  BACKHAND is much weaker. Isolate the backhand as much as possible.  ","scouting_report":"","report_by":"Schills","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"3fd1cbe2b36181463fc0217a8ba20880","kind":"player_report","team_display_name":"Wash U","player_import_key":"212de3424c2e9a6f0a6bb170f96f6ef5","opponent_display_name":"Coleman Merce","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strengths - forehand when ball is short\n\nweaknesses - serve (2nd)\nleaving balls short\nrally tollerance after 10+ balls (sometimes)","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"ad7fee1172917d3b3e2edb39b908ac07","kind":"compound_opponent","team_display_name":"Wash U","player_import_key":null,"opponent_display_name":"Scruggs /Kuo","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strengths: rally ball and forcing the error \nWeaknesses: returns, aggressiveness","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"d85ac5975a1dc089f7406c250b8d27b6","kind":"player_report","team_display_name":"Wash U","player_import_key":"05eab95bf9730e8e2ba8daca3ba4b79a","opponent_display_name":"Jeremy Sieben","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Strengths: consistency, shot selection\nWeaknesses: forehand rally ball","scouting_report":"","report_by":"Jake","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"94ffce26e3695292291e7ddac21d4ee3","kind":"compound_opponent","team_display_name":"Wash U","player_import_key":null,"opponent_display_name":"Ethan Wu Case Fagan","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"","handedness":null,"strengths_weaknesses":"Wu on the deuce, doesn't return well with body serves but can return pretty well when he can extend his arms. Very good volleys but you have to go at him. \nFagan on the AD side, he can slap a few forehands but shouldn't worry about it. Should go at him at the net. His second serve is weak","scouting_report":"","report_by":"Chapi","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"2fca8bcee9cbd920c5e47751fcd64a0e","kind":"compound_opponent","team_display_name":"Wash U","player_import_key":null,"opponent_display_name":"Ethan Wu Case Fagan","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Left Handed","handedness":"Left","strengths_weaknesses":"Wu - Deuce (Lefty)\nS - good volleys able to close net hard and solid lefty serve main guy we didn’t want to hit to\nW - unsure other than getting ball right at him not letting him extend especially on return\nFagan - Ad (Righty)\nS - hit hard at you able to close net well\nW - return body and backhand return, goes for too much sometimes all shots are low flat and hard, volleys aren’t great, second serve very slow and easy to hit hard on\n\nthey close well together, serves are pretty solid, hitting to Fagan only and hitting straight in the middle of the court, and not letting them extend themselves\n","scouting_report":"","report_by":"Nick","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"fa319dfdf2b2738325fe00ee0834df57","kind":"player_report","team_display_name":"Wash U","player_import_key":"2f87cfcf7282369b8d0a524ff0f61a3e","opponent_display_name":"Case Fagan","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Serve can be very up and down but his second serve is weak. He has a good forehand especially inside out and inside in but only when the ball is low. When balls are up high he cant do anything. Breaking the rythm is a great strategy because he likes pace ","scouting_report":"","report_by":"Chapi","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"4e901e9db5bd2f149ce37b310f03a188","kind":"compound_opponent","team_display_name":"Wash U","player_import_key":null,"opponent_display_name":"kuo / scruggs","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"Kuo strengths\n\n* strong forehand \n* 1st serve\n* decent 2nd serve\n* gets in on the return\n* Volley on top of the net\n* Different looks at the net (formations)\n* move well at the net \n\nweaknesses \n\n* backhand returns\n* backhand volleys \n* Pick up volleys\n* slapps forehand at the net guy ( be ready)\n\n\n\nScruggs Strengths \n\n* solid all round player\n* good serves \n* moves well at the net \n* solid ground strokes\n\n\n\nweakness\n\n* missed forehand returns\n* mid player \n\n\n\n","scouting_report":"","report_by":"Wesley","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"3e41c012bcf8179cc0f5932410d102fb","kind":"player_report","team_display_name":"Wash U","player_import_key":"d8c2e66ada76a837762395ef4e3f1163","opponent_display_name":"Eric Kuo","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"* Hard and flat forehand\n* Pretty good serve\n* Cannot volley\n* backhand is average, can’t do damage\n* goes for too much sometimes","scouting_report":"","report_by":"Kael","is_doubles":false,"attachment_refs":[],"import_status":"imported"},{"source_key":"39a83751d652407fa0513db1b43e7004","kind":"compound_opponent","team_display_name":"Wash U","player_import_key":null,"opponent_display_name":"Jeremy Sieben And Colin Fox","match_date":"2026-02-07","date_raw":"2/7/2026","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"* they play big power doubles \n* Fox misses a ton of forehand returns \n* not great at the net\n* both serve big \n* ","scouting_report":"","report_by":"Kael","is_doubles":false,"attachment_refs":[],"import_status":"compound_unresolved"},{"source_key":"fc10230afa26aa0d7559c0187108666c","kind":"unresolved_incomplete","team_display_name":"Chicago","player_import_key":null,"opponent_display_name":"","match_date":null,"date_raw":"","handedness_raw":"Right Handed","handedness":"Right","strengths_weaknesses":"* His backhand is attackable and will drop short.\n* first and second serve are very weak.\n* forehand is super spinny and hard to handle if it gets above your head. \n* super solid on return but start off missing a few forehand returns before getting a rhythm.\n* Passes crosscourt on the forehand side almost every time. \n* Will not miss in a rally so you have to win the point.\n* moves quick and hits good passing shots especially in the forehand side.","scouting_report":"","report_by":"Aidan","is_doubles":false,"attachment_refs":[],"import_status":"unresolved_review"},{"source_key":"adce1b8341b726275e8f7bca300f6c2d","kind":"team_level","team_display_name":"Amherst","player_import_key":null,"opponent_display_name":"TEAM - AMHERST","match_date":null,"date_raw":"","handedness_raw":"","handedness":null,"strengths_weaknesses":"","scouting_report":"Amherst_Summary_Scouting_2026.pdf,Amherst_Stat_Breakdown_2026.pdf","report_by":"Schills","is_doubles":false,"attachment_refs":["Amherst_Summary_Scouting_2026.pdf","Amherst_Stat_Breakdown_2026.pdf"],"import_status":"team_level"}]$scouting$::jsonb)
  as x(
    source_key text,
    kind text,
    team_display_name text,
    player_import_key text,
    opponent_display_name text,
    match_date text,
    date_raw text,
    handedness_raw text,
    handedness text,
    strengths_weaknesses text,
    scouting_report text,
    report_by text,
    is_doubles boolean,
    attachment_refs jsonb,
    import_status text
  )
)
insert into public.scouting_direct_reports (
  source_key, source, team_id, opponent_player_id, opponent_display_name,
  match_date, match_date_raw, handedness, handedness_raw,
  strengths_weaknesses, scouting_report, report_by, is_doubles,
  import_status, attachment_refs
)
select
  s.source_key,
  'csv_import',
  t.id,
  p.id,
  coalesce(s.opponent_display_name, ''),
  nullif(s.match_date, '')::date,
  nullif(s.date_raw, ''),
  nullif(s.handedness, ''),
  nullif(s.handedness_raw, ''),
  s.strengths_weaknesses,
  s.scouting_report,
  nullif(s.report_by, ''),
  coalesce(s.is_doubles, false),
  s.import_status,
  coalesce(s.attachment_refs, '[]'::jsonb)
from source s
join public.scouting_teams t on t.display_name = s.team_display_name
left join public.scouting_opponent_players p on p.import_key = s.player_import_key
on conflict (source_key) do nothing;

-- Amherst team-level report shell with attachment refs (manual team report; PDFs not uploaded).
insert into public.scouting_team_reports (team_id, kind, body, status, attachment_refs)
select t.id, 'manual',
  'Team-level Amherst scouting package. PDF attachments referenced but not yet uploaded.',
  'draft',
  '["Amherst_Summary_Scouting_2026.pdf","Amherst_Stat_Breakdown_2026.pdf"]'::jsonb
from public.scouting_teams t
where t.display_name = 'Amherst'
  and not exists (
    select 1 from public.scouting_team_reports r
    where r.team_id = t.id and r.kind = 'manual'
      and r.attachment_refs @> '["Amherst_Summary_Scouting_2026.pdf"]'::jsonb
  );

comment on table public.scouting_teams is 'Scouting opponent teams; identity_slug links existing schoolIdentity helpers (no duplicate school catalog).';
comment on table public.scouting_direct_reports is 'Direct match reports; CSV seeded insert-only on source_key.';
comment on function public.scouting_submit_form_response is 'Public tokenized post-match form submit; hashed token + rate limit; no broad anon table grants.';
