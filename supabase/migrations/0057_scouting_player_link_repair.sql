-- Additive idempotent repair: link orphaned imported direct reports to existing
-- opponent players by exact normalized name + team. Does not invent players,
-- does not approximate compound names, does not delete or overwrite user edits.

-- Ensure seed players exist (no-op when already present from 0056).
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

-- Link imported reports whose opponent_player_id is null but match a player
-- on the same team by exact normalized display name. Never links compound /
-- team_level / unresolved_review rows.
update public.scouting_direct_reports r
set
  opponent_player_id = p.id,
  updated_at = now()
from public.scouting_opponent_players p
where r.opponent_player_id is null
  and r.import_status = 'imported'
  and r.user_edited_at is null
  and r.team_id = p.team_id
  and lower(trim(regexp_replace(coalesce(r.opponent_display_name, ''), '\s+', ' ', 'g'))) = p.normalized_name;

comment on table public.scouting_direct_reports is
  'Direct match reports; CSV seeded insert-only on source_key. 0057 repairs null opponent_player_id links by exact name+team only.';
