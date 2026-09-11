-- A CHI SI INTESTA LA FATTURA
--
-- L'ordine raccoglieva solo dove spedire. Ma spedire e fatturare sono due
-- cose diverse: il pacco puo' andare a casa e la fattura alla ditta, e su
-- una vendita da 1.390 euro a un privato la fattura e' un obbligo, non una
-- cortesia.
--
-- Senza questi campi i dati di fatturazione si sarebbero potuti chiedere a
-- schermo e poi buttare: al momento di emettere il documento non ci sarebbe
-- stato niente da cui partire.
--
-- Il codice destinatario SDI (o la PEC) e' quello che serve per mandare la
-- fattura elettronica: si chiede adesso perche' chiederlo dopo significa
-- rincorrere il cliente al telefono.

alter table public.shop_orders
  add column if not exists billing_name text,
  add column if not exists billing_tax_id text,
  add column if not exists billing_sdi text,
  add column if not exists billing_street text,
  add column if not exists billing_city text,
  add column if not exists billing_region text,
  add column if not exists billing_country text,
  add column if not exists billing_postal_code text;

comment on column public.shop_orders.billing_tax_id is
  'Codice fiscale di un privato o partita IVA di un''azienda: senza, la fattura non si puo'' emettere.';
comment on column public.shop_orders.billing_sdi is
  'Codice destinatario SDI (7 caratteri) o indirizzo PEC, per la fattura elettronica.';

-- La funzione va ricreata e non sostituita: aggiungere parametri cambia la
-- firma, e una CREATE OR REPLACE lascerebbe in giro anche la vecchia
-- versione, con due funzioni omonime che si contendono le chiamate.
drop function if exists public.create_shop_order(jsonb, text, text, text, text, text, text, text, text);

create function public.create_shop_order(
  p_items jsonb,
  p_recipient_name text,
  p_street text,
  p_city text,
  p_region text,
  p_country text,
  p_postal_code text,
  p_phone text,
  p_coupon_code text default null,
  p_billing_name text default null,
  p_billing_tax_id text default null,
  p_billing_sdi text default null,
  p_billing_street text default null,
  p_billing_city text default null,
  p_billing_region text default null,
  p_billing_country text default null,
  p_billing_postal_code text default null
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
  if caller is null then raise exception 'gmg.non_autenticato'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'gmg.carrello_vuoto'; end if;
  if p_recipient_name is null or trim(p_recipient_name) = '' then raise exception 'gmg.destinatario_obbligatorio'; end if;
  if p_street is null or trim(p_street) = '' then raise exception 'gmg.indirizzo_obbligatorio'; end if;
  if p_city is null or trim(p_city) = '' then raise exception 'gmg.citta_obbligatoria'; end if;
  if p_country is null or trim(p_country) = '' then raise exception 'gmg.paese_obbligatorio'; end if;
  if p_postal_code is null or trim(p_postal_code) = '' then raise exception 'gmg.cap_obbligatorio'; end if;

  -- Chi va in fattura e con quale codice: senza questi due, il documento
  -- non si puo' emettere, e tanto vale dirlo adesso invece che a vendita
  -- fatta.
  if p_billing_name is null or trim(p_billing_name) = '' then raise exception 'gmg.intestatario_obbligatorio'; end if;
  if p_billing_tax_id is null or trim(p_billing_tax_id) = '' then raise exception 'gmg.codice_fiscale_obbligatorio'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from products where id = (item->>'product_id')::bigint and active;
    if prod is null then
      raise exception 'gmg.prodotto_non_trovato:%', item->>'product_id';
    end if;
    if (item->>'quantity')::integer <= 0 then
      raise exception 'gmg.quantita_non_valida:%', prod.name;
    end if;
    total_qty := total_qty + (item->>'quantity')::integer;
    total_amt := total_amt + prod.price * (item->>'quantity')::integer;
  end loop;

  if codice is not null then
    select * into c from coupons where code = codice for update;
    if c.code is null then raise exception 'gmg.buono_sconosciuto'; end if;
    if c.used_at is not null then raise exception 'gmg.buono_gia_usato'; end if;

    select email into mia_email from members where activity_code = caller;
    if mia_email is null or lower(mia_email) <> lower(c.email) then
      raise exception 'gmg.buono_altra_email';
    end if;

    sconto := least(c.amount, total_amt);
  end if;

  insert into shop_orders (
    buyer_code, total_amount, recipient_name, street, city, region, country, postal_code, phone,
    coupon_code, discount_amount,
    billing_name, billing_tax_id, billing_sdi,
    billing_street, billing_city, billing_region, billing_country, billing_postal_code
  )
  values (
    caller, total_amt - sconto, trim(p_recipient_name), trim(p_street), trim(p_city),
    nullif(trim(p_region), ''), trim(p_country), trim(p_postal_code), nullif(trim(p_phone), ''),
    codice, sconto,
    trim(p_billing_name), upper(trim(p_billing_tax_id)), nullif(trim(coalesce(p_billing_sdi, '')), ''),
    -- Fatturazione lasciata vuota = coincide con la spedizione. Si copia
    -- adesso invece di lasciare campi nulli: chi emettera' la fattura
    -- trovera' l'indirizzo scritto, senza dover sapere questa regola.
    coalesce(nullif(trim(coalesce(p_billing_street, '')), ''), trim(p_street)),
    coalesce(nullif(trim(coalesce(p_billing_city, '')), ''), trim(p_city)),
    coalesce(nullif(trim(coalesce(p_billing_region, '')), ''), nullif(trim(p_region), '')),
    coalesce(nullif(trim(coalesce(p_billing_country, '')), ''), trim(p_country)),
    coalesce(nullif(trim(coalesce(p_billing_postal_code, '')), ''), trim(p_postal_code))
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

revoke all on function public.create_shop_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_shop_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
