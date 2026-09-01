-- Annunci broadcast dall'azienda a tutta la rete (diverso dai Messaggi,
-- che sono punto-a-punto): una tabella sola letta da tutti, scritta solo
-- dall'azienda — evita di duplicare N righe per ogni destinatario.

create table if not exists announcements (
  id bigserial primary key,
  title text not null,
  body text not null,
  created_by integer not null references members (activity_code),
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

drop policy if exists announcements_select on announcements;
create policy announcements_select on announcements
  for select
  using (true);

create or replace function create_announcement(p_title text, p_body text)
returns announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  new_announcement announcements;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'Titolo obbligatorio';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'Testo obbligatorio';
  end if;

  insert into announcements (title, body, created_by)
  values (trim(p_title), trim(p_body), caller)
  returning * into new_announcement;

  return new_announcement;
end;
$$;

revoke all on function create_announcement(text, text) from public, anon;
grant execute on function create_announcement(text, text) to authenticated;
