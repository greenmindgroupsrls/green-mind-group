-- Messaggistica interna tra membri + ticket di supporto verso l'azienda.
--
-- messages: conversazioni private punto-a-punto tra due membri (chi manda,
-- chi riceve). Visibilita' ristretta a mittente/destinatario, SENZA eccezione
-- per l'azienda (0): sono messaggi privati tra utenti, non dati di rete/team.
--
-- support_tickets: richieste di assistenza verso l'azienda. L'id seriale
-- funge direttamente da numero di ticket, sequenziale su tutta la piattaforma
-- (non per utente). L'azienda (0) vede tutti i ticket, ogni altro utente vede
-- solo i propri.

create table if not exists messages (
  id bigserial primary key,
  sender_code integer not null references members (activity_code),
  recipient_code integer not null references members (activity_code),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_code_idx on messages (sender_code);
create index if not exists messages_recipient_code_idx on messages (recipient_code);

alter table messages enable row level security;

drop policy if exists messages_select on messages;
create policy messages_select on messages
  for select
  using (sender_code = current_member_code() or recipient_code = current_member_code());

create table if not exists support_tickets (
  id bigserial primary key,
  activity_code integer not null references members (activity_code),
  topic text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_activity_code_idx on support_tickets (activity_code);

alter table support_tickets enable row level security;

drop policy if exists support_tickets_select on support_tickets;
create policy support_tickets_select on support_tickets
  for select
  using (activity_code = current_member_code() or current_member_code() = 0);

-- p_recipient accetta sia un codice attivita' numerico ("8") sia uno username
-- ("mario.rossi"), coerente con la richiesta "A: username o codice attivita'".
create or replace function send_message(p_recipient text, p_subject text, p_body text)
returns messages
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  recipient_code integer;
  new_message messages;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per inviare un messaggio';
  end if;
  if p_subject is null or trim(p_subject) = '' then
    raise exception 'Oggetto obbligatorio';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'Testo del messaggio obbligatorio';
  end if;

  if p_recipient ~ '^[0-9]+$' then
    select activity_code into recipient_code from members where activity_code = p_recipient::integer;
  else
    select activity_code into recipient_code from members where username = trim(p_recipient);
  end if;

  if recipient_code is null then
    raise exception 'Destinatario "%" non trovato', p_recipient;
  end if;

  insert into messages (sender_code, recipient_code, subject, body)
  values (caller, recipient_code, trim(p_subject), trim(p_body))
  returning * into new_message;

  return new_message;
end;
$$;

create or replace function create_support_ticket(p_topic text, p_message text)
returns support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  new_ticket support_tickets;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per aprire un ticket';
  end if;
  if p_topic is null or trim(p_topic) = '' then
    raise exception 'Argomento obbligatorio';
  end if;
  if p_message is null or trim(p_message) = '' then
    raise exception 'Messaggio obbligatorio';
  end if;

  insert into support_tickets (activity_code, topic, message)
  values (caller, trim(p_topic), trim(p_message))
  returning * into new_ticket;

  return new_ticket;
end;
$$;

revoke all on function send_message(text, text, text) from public, anon;
grant execute on function send_message(text, text, text) to authenticated;

revoke all on function create_support_ticket(text, text) from public, anon;
grant execute on function create_support_ticket(text, text) to authenticated;
