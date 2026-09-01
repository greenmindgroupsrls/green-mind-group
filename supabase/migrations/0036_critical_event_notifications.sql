-- Notifiche automatiche per eventi critici che richiedono l'attenzione
-- dell'azienda: nuova richiesta di prelievo, nuovo ticket di supporto,
-- nuovo ordine shop. Riusa l'inbox messaggi già esistente (stesso badge
-- "non letti" già in sidebar) invece di costruire un sistema di notifiche
-- separato — il destinatario è sempre l'azienda (activity_code = 0).
-- L'invio email a root (best-effort, vedi src/lib/email.ts) è gestito
-- lato Next.js nelle rispettive server action, non da qui: Postgres non
-- può chiamare l'API di Resend direttamente.
create or replace function notify_root(p_sender_code integer, p_subject text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_username_val text;
begin
  select username into sender_username_val from members where activity_code = p_sender_code;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (p_sender_code, coalesce(sender_username_val, ''), 0, 'azienda', p_subject, p_body);
end;
$$;

revoke all on function notify_root(integer, text, text) from public, anon;
grant execute on function notify_root(integer, text, text) to authenticated;

-- create_withdrawal_request: notifica dopo la creazione della richiesta
-- (corpo live recuperato via pg_get_functiondef prima di questa modifica).
create or replace function create_withdrawal_request(
  p_amount numeric, p_bank_name text, p_iban text, p_account_type text, p_swift_code text
)
returns withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  earned numeric;
  already_withdrawn numeric;
  available numeric;
  fixed_charge constant numeric := 3.00;
  net numeric;
  new_request withdrawal_requests;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per richiedere un prelievo';
  end if;
  if p_amount is null or p_amount < 10 then
    raise exception 'L''importo minimo di prelievo è 10€';
  end if;
  if p_bank_name is null or trim(p_bank_name) = '' then
    raise exception 'Nome banca e indirizzo obbligatori';
  end if;
  if p_iban is null or trim(p_iban) = '' then
    raise exception 'IBAN obbligatorio';
  end if;

  select coalesce(sum(amount), 0) into earned
  from commission_entries where beneficiary_code = caller;

  select coalesce(sum(net_amount), 0) into already_withdrawn
  from withdrawal_requests where activity_code = caller and status <> 'rejected';

  available := earned - already_withdrawn;

  if p_amount > available then
    raise exception 'Importo superiore al saldo disponibile (% disponibili)', available;
  end if;

  net := p_amount - fixed_charge;

  insert into withdrawal_requests (
    activity_code, amount, charges, tax, net_amount, bank_name, iban, account_type, swift_code
  )
  values (
    caller, p_amount, fixed_charge, 0, net,
    trim(p_bank_name), trim(p_iban), nullif(trim(p_account_type), ''), nullif(trim(p_swift_code), '')
  )
  returning * into new_request;

  if caller <> 0 then
    perform notify_root(
      caller,
      'Nuova richiesta di prelievo',
      format('Richiesto un prelievo di %s€ (netto %s€).', p_amount, net)
    );
  end if;

  return new_request;
end;
$$;

-- create_support_ticket: notifica dopo l'apertura del ticket.
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

  if caller <> 0 then
    perform notify_root(
      caller,
      'Nuovo ticket di supporto',
      format('Ticket #%s — %s', new_ticket.id, p_topic)
    );
  end if;

  return new_ticket;
end;
$$;

-- create_shop_order: notifica dopo la creazione dell'ordine.
create or replace function create_shop_order(
  p_items jsonb, p_recipient_name text, p_street text, p_city text, p_region text,
  p_country text, p_postal_code text, p_phone text
)
returns shop_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  item jsonb;
  prod products;
  total_qty integer := 0;
  total_amt numeric(12, 2) := 0;
  new_sale sales;
  new_order shop_orders;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per acquistare';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Il carrello è vuoto';
  end if;
  if p_recipient_name is null or trim(p_recipient_name) = '' then
    raise exception 'Nome destinatario obbligatorio';
  end if;
  if p_street is null or trim(p_street) = '' then
    raise exception 'Indirizzo obbligatorio';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'Città obbligatoria';
  end if;
  if p_country is null or trim(p_country) = '' then
    raise exception 'Paese obbligatorio';
  end if;
  if p_postal_code is null or trim(p_postal_code) = '' then
    raise exception 'CAP obbligatorio';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from products
      where id = (item->>'product_id')::bigint and active;

    if prod is null then
      raise exception 'Prodotto % non trovato o non disponibile', item->>'product_id';
    end if;
    if (item->>'quantity')::integer <= 0 then
      raise exception 'Quantità non valida per il prodotto %', prod.name;
    end if;

    total_qty := total_qty + (item->>'quantity')::integer;
    total_amt := total_amt + prod.price * (item->>'quantity')::integer;
  end loop;

  new_sale := register_sale(caller, total_qty);

  insert into shop_orders (
    buyer_code, sale_id, total_amount,
    recipient_name, street, city, region, country, postal_code, phone
  )
  values (
    caller, new_sale.id, total_amt,
    trim(p_recipient_name), trim(p_street), trim(p_city), nullif(trim(p_region), ''),
    trim(p_country), trim(p_postal_code), nullif(trim(p_phone), '')
  )
  returning * into new_order;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from products where id = (item->>'product_id')::bigint;

    insert into shop_order_items (order_id, product_id, quantity, unit_price, line_total)
    values (
      new_order.id, prod.id, (item->>'quantity')::integer, prod.price,
      prod.price * (item->>'quantity')::integer
    );
  end loop;

  if caller <> 0 then
    perform notify_root(
      caller,
      'Nuovo ordine ricevuto',
      format('Ordine #%s — %s pezzi, totale %s€.', new_order.id, total_qty, total_amt)
    );
  end if;

  return new_order;
end;
$$;
