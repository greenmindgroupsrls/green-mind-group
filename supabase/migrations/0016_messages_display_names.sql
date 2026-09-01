-- I messaggi possono viaggiare in qualunque direzione dell'albero (es. un
-- downline scrive al proprio upline), non solo dentro il proprio sotto-albero.
-- members_select e' scoped via is_self_or_descendant, quindi il destinatario
-- non potrebbe risolvere lo username del mittente con una semplice join se il
-- mittente non e' un suo discendente. Soluzione: denormalizzare lo username
-- di entrambe le parti direttamente sulla riga messages al momento dell'invio
-- (send_message gira SECURITY DEFINER e vede entrambe le righe members).

alter table messages add column if not exists sender_username text not null default '';
alter table messages add column if not exists recipient_username text not null default '';

create or replace function send_message(p_recipient text, p_subject text, p_body text)
returns messages
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  caller_username text;
  recipient_code integer;
  recipient_username_val text;
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
    select activity_code, username into recipient_code, recipient_username_val
    from members where activity_code = p_recipient::integer;
  else
    select activity_code, username into recipient_code, recipient_username_val
    from members where username = trim(p_recipient);
  end if;

  if recipient_code is null then
    raise exception 'Destinatario "%" non trovato', p_recipient;
  end if;

  select username into caller_username from members where activity_code = caller;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (caller, caller_username, recipient_code, recipient_username_val, trim(p_subject), trim(p_body))
  returning * into new_message;

  return new_message;
end;
$$;
