-- INCASSARE DAVVERO, SENZA CHE QUALCUNO CLICCHI
--
-- Finora un ordine nasceva "in attesa di pagamento" e restava li' finche'
-- qualcuno dell'azienda non apriva il back office e cliccava "Conferma
-- pagamento": era quel clic a far nascere le provvigioni. I soldi si
-- incassavano fuori dal sistema, e il sistema si fidava.
--
-- Con Stripe l'incasso e' verificabile, e la conferma deve arrivare da li'.
-- Il problema e' che conferma_pagamento_ordine pretende l'account aziendale
-- (current_member_code() = 0), e un avviso che arriva dai server di Stripe
-- non ha nessuna sessione: sarebbe sempre "Non autorizzato".
--
-- La logica delle provvigioni pero' non va duplicata - due copie della
-- stessa matematica dei soldi divergono al primo ritocco. Qui viene
-- estratta in una funzione interna, e le due strade (il clic a mano e
-- l'avviso di Stripe) diventano due porte d'ingresso alla stessa stanza.

alter table public.shop_orders
  add column if not exists payment_method text not null default 'bonifico',
  add column if not exists stripe_session_id text;

comment on column public.shop_orders.payment_method is
  'bonifico = si conferma a mano dal back office, come si e'' sempre fatto; stripe = lo conferma l''incasso.';

-- Indice non parziale: i NULL non danno mai conflitto fra loro, quindi gli
-- ordini per bonifico (che una sessione non ce l''hanno) convivono senza
-- doverli escludere con una condizione.
create unique index if not exists shop_orders_stripe_session_key
  on public.shop_orders (stripe_session_id);

-- ---------------------------------------------------------------------------
-- La stanza: tutto quello che succede quando un ordine risulta pagato.
-- Non controlla chi chiama - lo fanno le due porte qui sotto.
-- ---------------------------------------------------------------------------
create or replace function public.esegui_conferma_ordine(
  p_order_id bigint,
  p_confermato_da integer
)
returns shop_orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ordine shop_orders;
  acquirente members;
  sponsor integer;
  imponibile numeric := 0;
  pezzi integer := 0;
  iva numeric;
  nuova_vendita sales;
  riga record;
begin
  select * into ordine from shop_orders where id = p_order_id for update;
  if ordine.id is null then raise exception 'Ordine non trovato'; end if;
  if ordine.paid_at is not null then
    raise exception 'Questo ordine risulta gia pagato: le provvigioni sono gia state generate';
  end if;
  if ordine.status = 'cancelled' then
    raise exception 'Ordine annullato: non si puo confermarne il pagamento';
  end if;

  select * into acquirente from members where activity_code = ordine.buyer_code;
  select vat_rate into iva from compensation_settings where id = 1;

  for riga in select quantity, unit_price from shop_order_items where order_id = p_order_id
  loop
    pezzi := pezzi + riga.quantity;
    imponibile := imponibile + round((riga.unit_price / (1 + coalesce(iva,0)/100)) * riga.quantity, 2);
  end loop;

  if coalesce(ordine.discount_amount, 0) > 0 then
    imponibile := greatest(
      imponibile - round(ordine.discount_amount / (1 + coalesce(iva,0)/100), 2),
      0
    );
  end if;

  insert into sales (seller_code, quantity) values (ordine.buyer_code, pezzi)
  returning * into nuova_vendita;

  update shop_orders
  set status = 'paid', paid_at = now(), paid_by = p_confermato_da, sale_id = nuova_vendita.id
  where id = p_order_id
  returning * into ordine;

  sponsor := acquirente.ref_sponsor_code;
  if sponsor is not null then
    perform genera_commissioni(nuova_vendita.id, sponsor, ordine.buyer_code, imponibile);
  end if;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  select 0, 'green-mind-group', ordine.buyer_code, acquirente.username,
    'Pagamento confermato',
    format('Abbiamo registrato il pagamento dell''ordine #%s. Grazie!', ordine.id);

  return ordine;
end;
$function$;

-- Interna: la chiamano solo le due porte, mai un browser.
revoke all on function public.esegui_conferma_ordine(bigint, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Porta 1: il clic a mano dal back office. Invariata nel comportamento.
-- ---------------------------------------------------------------------------
create or replace function public.conferma_pagamento_ordine(p_order_id bigint)
returns shop_orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
begin
  if chiamante is null or chiamante <> 0 then
    raise exception 'Non autorizzato';
  end if;
  return esegui_conferma_ordine(p_order_id, chiamante);
end;
$function$;

-- ---------------------------------------------------------------------------
-- Porta 2: l'avviso di Stripe, che arriva senza sessione utente.
--
-- Chi puo' entrare: solo il service_role, cioe' il nostro server dopo aver
-- verificato la firma dell'avviso. Un browser non ha quel ruolo e non
-- arriva nemmeno a bussare (le GRANT qui sotto).
--
-- Si identifica per sessione Stripe e non per numero d'ordine: cosi' non e'
-- possibile far confermare l'ordine di un altro passando un id a caso.
--
-- Idempotente per costruzione: Stripe rimanda lo stesso avviso finche' non
-- riceve un "ricevuto", e puo' mandarlo due volte comunque. Un ordine gia'
-- pagato non e' un errore da segnalare, e' il lavoro gia' fatto: si
-- restituisce e basta, altrimenti Stripe riproverebbe all'infinito.
-- ---------------------------------------------------------------------------
create or replace function public.conferma_pagamento_stripe(p_session_id text)
returns shop_orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ruolo text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  ordine shop_orders;
begin
  if ruolo <> 'service_role' then
    raise exception 'Non autorizzato';
  end if;

  select * into ordine from shop_orders where stripe_session_id = p_session_id;
  if ordine.id is null then
    raise exception 'Nessun ordine collegato a questa sessione di pagamento';
  end if;

  if ordine.paid_at is not null then
    return ordine;
  end if;

  -- Confermato da 0: i soldi sono arrivati all'azienda, non a una persona.
  return esegui_conferma_ordine(ordine.id, 0);
end;
$function$;

revoke all on function public.conferma_pagamento_stripe(text) from public, anon, authenticated;
grant execute on function public.conferma_pagamento_stripe(text) to service_role;

-- ---------------------------------------------------------------------------
-- Legare l'ordine alla sessione di pagamento appena creata.
--
-- La chiama chi sta comprando, subito prima di essere mandato su Stripe.
-- Puo' toccare solo un ordine suo e non ancora pagato.
-- ---------------------------------------------------------------------------
create or replace function public.collega_sessione_stripe(
  p_order_id bigint,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  ordine shop_orders;
begin
  if chiamante is null then
    raise exception 'Non autorizzato';
  end if;

  select * into ordine from shop_orders where id = p_order_id for update;
  if ordine.id is null then raise exception 'Ordine non trovato'; end if;
  if ordine.buyer_code <> chiamante then raise exception 'Non autorizzato'; end if;
  if ordine.paid_at is not null then raise exception 'Ordine gia pagato'; end if;

  update shop_orders
  set stripe_session_id = p_session_id, payment_method = 'stripe'
  where id = p_order_id;
end;
$function$;

revoke all on function public.collega_sessione_stripe(bigint, text) from public, anon;
grant execute on function public.collega_sessione_stripe(bigint, text) to authenticated;
