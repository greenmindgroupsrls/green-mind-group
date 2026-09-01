-- notify_root() si fidava del parametro p_sender_code: un utente registrato
-- poteva chiamarla via PostgREST passando il codice di un altro membro e
-- recapitare all'azienda un messaggio a nome di quella persona.
-- Impatto limitato (solo messaggi, nessun accesso a dati altrui), ma e'
-- comunque una falsificazione del mittente.
--
-- Doppia difesa:
--   1) il mittente non viene piu' letto dal parametro ma da
--      current_member_code(), quindi non e' falsificabile nemmeno da chi
--      riuscisse a invocare la funzione;
--   2) EXECUTE revocato ad anon e authenticated: nessuno puo' piu'
--      chiamarla direttamente dall'API.
--
-- Le tre chiamate interne (create_withdrawal_request, create_support_ticket,
-- create_shop_order) continuano a funzionare: sono SECURITY DEFINER di
-- proprieta' di postgres, che possiede anche notify_root, quindi il
-- controllo dei permessi passa dal proprietario e non dal ruolo del
-- chiamante. Tutte e tre passavano gia' current_member_code() come
-- p_sender_code, quindi il comportamento reale non cambia.
--
-- Il parametro p_sender_code resta nella firma solo per non dover
-- modificare le tre funzioni chiamanti: il suo valore viene ignorato.

create or replace function notify_root(p_sender_code integer, p_subject text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_sender integer := current_member_code();
  sender_username_val text;
begin
  if actual_sender is null then
    raise exception 'Devi essere autenticato per inviare una notifica';
  end if;

  select username into sender_username_val from members where activity_code = actual_sender;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (actual_sender, coalesce(sender_username_val, ''), 0, 'azienda', p_subject, p_body);
end;
$$;

revoke all on function notify_root(integer, text, text) from public, anon, authenticated;
