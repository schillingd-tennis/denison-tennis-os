-- One durable, retrievable public form for every Denison player scouting report.
-- Specialized legacy links remain valid, but the coach UI manages only this primary link.

alter table public.scouting_form_links
  add column if not exists is_primary boolean not null default false,
  add column if not exists public_token text;

create unique index if not exists scouting_form_links_one_primary_idx
  on public.scouting_form_links (is_primary)
  where is_primary;

create unique index if not exists scouting_form_links_public_token_idx
  on public.scouting_form_links (public_token)
  where public_token is not null;

do $$
declare
  v_token text;
begin
  if not exists (select 1 from public.scouting_form_links where is_primary) then
    v_token := translate(trim(trailing '=' from encode(extensions.gen_random_bytes(32), 'base64')), '+/', '-_');
    insert into public.scouting_form_links (
      token_hash,
      public_token,
      label,
      team_id,
      opponent_player_id,
      expires_at,
      is_primary
    ) values (
      encode(extensions.digest(v_token, 'sha256'), 'hex'),
      v_token,
      'Denison Player Scouting Form',
      null,
      null,
      null,
      true
    );
  end if;
end;
$$;

comment on column public.scouting_form_links.is_primary is
  'The one permanent, general-purpose Denison player scouting form.';
comment on column public.scouting_form_links.public_token is
  'Retrievable public URL token for the primary form; never grants authenticated OS access.';
