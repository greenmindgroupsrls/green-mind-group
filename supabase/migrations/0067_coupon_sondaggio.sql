-- IL BUONO DEL SONDAGGIO DIVENTA UN COUPON VERO
--
-- Fino a ora il codice mostrato alla fine del sondaggio (VORTIX-XXXXX) era
-- generato dal browser e non finiva da nessuna parte: nessuno poteva
-- verificarlo, e al negozio non serviva a niente. Adesso nasce nel database
-- nel momento in cui la persona lascia i suoi dati, e il negozio lo sa
-- riconoscere.
--
-- Due regole decise dall'azienda:
--
--   * Il coupon e' legato alla mail lasciata nel sondaggio e vale una volta
--     sola. Un codice che gira su WhatsApp non funziona per nessun altro.
--
--   * Lo sconto abbassa anche la base delle provvigioni: si guadagna su
--     quello che e' entrato davvero, non sul prezzo di listino. Il costo del
--     buono lo dividono azienda e rete.

create table if not exists coupons (
  code          text primary key,
  email         text not null,
  nome          text,
  amount        numeric(10,2) not null check (amount > 0),
  origine       text not null default 'sondaggio',
  created_at    timestamptz not null default now(),
  used_at       timestamptz,
  used_by       integer references members(activity_code),
  order_id      bigint references shop_orders(id)
);

create index if not exists coupons_email_idx on coupons (lower(email));

comment on table coupons is
  'Buoni sconto generati dal sondaggio Vortix. Legati a una mail, spendibili una volta sola.';

alter table coupons enable row level security;

-- Nessuna lettura diretta: i coupon si toccano solo dalle funzioni qui
-- sotto. Un elenco leggibile sarebbe un elenco di sconti da spendere.
drop policy if exists coupons_select on coupons;
create policy coupons_select on coupons
  for select using (current_member_code() = 0);

alter table shop_orders
  add column if not exists coupon_code     text references coupons(code),
  add column if not exists discount_amount numeric(12,2) not null default 0;

-- === 1. Il sondaggio chiede un coupon ======================================
-- Il codice lo genera il database, non il browser: un codice inventato dal
-- client non varrebbe niente, e lasciarglielo scegliere vorrebbe dire
-- lasciargli scegliere anche quello di qualcun altro.
create or replace function public.crea_coupon_sondaggio(
  p_email text,
  p_nome text,
  p_importo numeric default 100
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codice text;
  esistente coupons;
  i integer;
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Indirizzo email non valido';
  end if;
  if p_importo <= 0 or p_importo > 1000 then
    raise exception 'Importo del buono non valido';
  end if;

  -- Una mail, un buono: rispondere due volte al sondaggio non moltiplica lo
  -- sconto. Se ne ha gia' uno non speso, si riceve di nuovo lo stesso.
  select * into esistente from coupons
  where lower(email) = lower(trim(p_email)) and used_at is null
  order by created_at desc limit 1;
  if esistente.code is not null then
    return esistente.code;
  end if;

  loop
    codice := 'VORTIX-';
    for i in 1..5 loop
      codice := codice || substr(alfabeto, 1 + floor(random() * length(alfabeto))::integer, 1);
    end loop;
    exit when not exists (select 1 from coupons c where c.code = codice);
  end loop;

  insert into coupons (code, email, nome, amount)
  values (codice, trim(p_email), nullif(trim(coalesce(p_nome, '')), ''), p_importo);

  return codice;
end;
$function$;

revoke all on function public.crea_coupon_sondaggio(text, text, numeric) from public;
grant execute on function public.crea_coupon_sondaggio(text, text, numeric) to anon, authenticated;

-- === 2. Il negozio controlla un coupon =====================================
-- Restituisce sempre una risposta, mai un errore: al checkout serve un
-- messaggio da mostrare, non un'eccezione.
create or replace function public.verifica_coupon(p_code text)
returns table(valido boolean, importo numeric, motivo text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
  c coupons;
  mia_email text;
begin
  if caller is null then
    return query select false, 0::numeric, 'Devi accedere per usare un buono';
    return;
  end if;

  select * into c from coupons where upper(trim(p_code)) = code;
  if c.code is null then
    return query select false, 0::numeric, 'Codice non riconosciuto';
    return;
  end if;
  if c.used_at is not null then
    return query select false, 0::numeric, 'Questo buono e gia stato utilizzato';
    return;
  end if;

  select email into mia_email from members where activity_code = caller;
  if mia_email is null or lower(mia_email) <> lower(c.email) then
    return query select false, 0::numeric,
      'Questo buono e intestato a un altro indirizzo email';
    return;
  end if;

  return query select true, c.amount, null::text;
end;
$function$;

revoke all on function public.verifica_coupon(text) from public, anon;
grant execute on function public.verifica_coupon(text) to authenticated;

-- === 3. L'ordine puo' portarsi dietro un coupon ============================
-- Il parametro nuovo cambia la firma: la vecchia va tolta, altrimenti
-- resterebbero due funzioni con lo stesso nome e PostgREST non saprebbe
-- quale chiamare.
drop function if exists public.create_shop_order(jsonb, text, text, text, text, text, text, text);

create or replace function public.create_shop_order(
  p_items jsonb,
  p_recipient_name text,
  p_street text,
  p_city text,
  p_region text,
  p_country text,
  p_postal_code text,
  p_phone text,
  p_coupon_code text default null
)
returns shop_orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
  item jsonb;
  prod products;
  total_qty integer := 0;
  total_amt numeric(12, 2) := 0;
  sconto numeric(12, 2) := 0;
  codice text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  c coupons;
  mia_email text;
  new_order shop_orders;
begin
  if caller is null then raise exception 'Devi essere autenticato per acquistare'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Il carrello è vuoto'; end if;
  if p_recipient_name is null or trim(p_recipient_name) = '' then raise exception 'Nome destinatario obbligatorio'; end if;
  if p_street is null or trim(p_street) = '' then raise exception 'Indirizzo obbligatorio'; end if;
  if p_city is null or trim(p_city) = '' then raise exception 'Città obbligatoria'; end if;
  if p_country is null or trim(p_country) = '' then raise exception 'Paese obbligatorio'; end if;
  if p_postal_code is null or trim(p_postal_code) = '' then raise exception 'CAP obbligatorio'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from products where id = (item->>'product_id')::bigint and active;
    if prod is null then
      raise exception 'Prodotto % non trovato o non disponibile', item->>'product_id';
    end if;
    if (item->>'quantity')::integer <= 0 then
      raise exception 'Quantità non valida per il prodotto %', prod.name;
    end if;
    total_qty := total_qty + (item->>'quantity')::integer;
    total_amt := total_amt + prod.price * (item->>'quantity')::integer;
  end loop;

  -- Il coupon si blocca qui (for update): due ordini contemporanei con lo
  -- stesso codice non possono spenderlo due volte.
  if codice is not null then
    select * into c from coupons where code = codice for update;
    if c.code is null then raise exception 'Codice buono non riconosciuto'; end if;
    if c.used_at is not null then raise exception 'Questo buono e gia stato utilizzato'; end if;

    select email into mia_email from members where activity_code = caller;
    if mia_email is null or lower(mia_email) <> lower(c.email) then
      raise exception 'Questo buono e intestato a un altro indirizzo email';
    end if;

    -- Il buono sconta, non rimborsa: su un ordine da 80 euro non se ne
    -- restituiscono 20.
    sconto := least(c.amount, total_amt);
  end if;

  insert into shop_orders (
    buyer_code, total_amount, recipient_name, street, city, region, country, postal_code, phone,
    coupon_code, discount_amount
  )
  values (
    caller, total_amt - sconto, trim(p_recipient_name), trim(p_street), trim(p_city),
    nullif(trim(p_region), ''), trim(p_country), trim(p_postal_code), nullif(trim(p_phone), ''),
    codice, sconto
  )
  returning * into new_order;

  if codice is not null then
    update coupons
    set used_at = now(), used_by = caller, order_id = new_order.id
    where code = codice;
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from products where id = (item->>'product_id')::bigint;
    insert into shop_order_items (order_id, product_id, quantity, unit_price, line_total)
    values (new_order.id, prod.id, (item->>'quantity')::integer, prod.price,
            prod.price * (item->>'quantity')::integer);
  end loop;

  if caller <> 0 then
    perform notify_root(caller, 'Nuovo ordine ricevuto',
      format('Ordine #%s — %s pezzi, totale %s€%s. In attesa di pagamento.',
        new_order.id, total_qty, new_order.total_amount,
        case when sconto > 0 then format(' (buono %s: -%s€)', codice, sconto) else '' end));
  end if;

  return new_order;
end;
$function$;

revoke all on function public.create_shop_order(jsonb, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_shop_order(jsonb, text, text, text, text, text, text, text, text) to authenticated;

-- === 4. Le provvigioni seguono l'incassato =================================
-- L'imponibile nasce dalle righe dell'ordine, che restano a prezzo pieno:
-- lo sconto va tolto a parte, al netto dell'IVA come tutto il resto.
create or replace function public.conferma_pagamento_ordine(p_order_id bigint)
returns shop_orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  ordine shop_orders;
  acquirente members;
  sponsor integer;
  imponibile numeric := 0;
  pezzi integer := 0;
  iva numeric;
  nuova_vendita sales;
  riga record;
begin
  if chiamante is null or chiamante <> 0 then
    raise exception 'Non autorizzato';
  end if;

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
  set status = 'paid', paid_at = now(), paid_by = chiamante, sale_id = nuova_vendita.id
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
