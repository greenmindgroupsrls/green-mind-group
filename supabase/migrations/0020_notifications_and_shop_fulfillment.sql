-- Fix operativi: notifiche (messaggi non letti), stato evasione ordini
-- shop, indice mancante segnalato dall'advisor performance.

alter table messages add column if not exists read_at timestamptz;

create or replace function mark_messages_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null then
    raise exception 'Devi essere autenticato';
  end if;

  update messages
  set read_at = now()
  where recipient_code = caller and read_at is null;
end;
$$;

revoke all on function mark_messages_read() from public, anon;
grant execute on function mark_messages_read() to authenticated;

-- Stati di evasione per un ordine shop (prodotto fisico spedito manualmente).
create or replace function set_shop_order_status(p_id bigint, p_status text)
returns shop_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated shop_orders;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_status not in ('pending', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Stato non valido';
  end if;

  update shop_orders
  set status = p_status
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Ordine % non trovato', p_id;
  end if;

  return updated;
end;
$$;

revoke all on function set_shop_order_status(bigint, text) from public, anon;
grant execute on function set_shop_order_status(bigint, text) to authenticated;

create index if not exists withdrawal_requests_processed_by_idx on withdrawal_requests (processed_by);
