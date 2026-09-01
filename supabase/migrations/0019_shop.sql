-- Shop: catalogo prodotti + ordini. Nessun pagamento reale per ora: un
-- ordine viene registrato con stato "pending" e l'azienda lo evade
-- manualmente fuori sistema, stesso spirito di support_tickets e
-- withdrawal_requests. Ogni ordine genera le STESSE commissioni di rete di
-- una vendita normale (chi acquista è "venditore" ai fini commissioni,
-- esattamente come nel flusso di vendita già esistente): create_shop_order
-- chiama register_sale() internamente, nessuna modifica al motore
-- commissioni.

create table if not exists products (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  price numeric(12, 2) not null,
  description text not null,
  image_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

drop policy if exists products_select on products;
create policy products_select on products
  for select
  using (true);

create table if not exists shop_orders (
  id bigserial primary key,
  buyer_code integer not null references members (activity_code),
  sale_id bigint references sales (id),
  status text not null default 'pending',
  total_amount numeric(12, 2) not null,
  recipient_name text not null,
  street text not null,
  city text not null,
  region text,
  country text not null,
  postal_code text not null,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists shop_orders_buyer_code_idx on shop_orders (buyer_code);

alter table shop_orders enable row level security;

drop policy if exists shop_orders_select on shop_orders;
create policy shop_orders_select on shop_orders
  for select
  using (buyer_code = current_member_code() or current_member_code() = 0);

create table if not exists shop_order_items (
  id bigserial primary key,
  order_id bigint not null references shop_orders (id),
  product_id bigint not null references products (id),
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null
);

create index if not exists shop_order_items_order_id_idx on shop_order_items (order_id);

alter table shop_order_items enable row level security;

drop policy if exists shop_order_items_select on shop_order_items;
create policy shop_order_items_select on shop_order_items
  for select
  using (
    exists (
      select 1 from shop_orders o
      where o.id = order_id
        and (o.buyer_code = current_member_code() or current_member_code() = 0)
    )
  );

insert into products (slug, name, price, description, image_path) values
  (
    'vortix-5-anni',
    'Vortix + 5 anni di garanzia',
    1290.00,
    'Vortix è il modo in cui gli scarti alimentari smettono di essere un problema. Potenza silenziosa, design essenziale, installazione che scompare sotto il lavello: nient''altro a cui pensare. Costruito per durare, pensato per l''ambiente. 5 anni di garanzia inclusi, dal primo giorno.',
    '/products/vortix-5-anni.png'
  ),
  (
    'vortix-8-anni',
    'Vortix + 8 anni di garanzia',
    1390.00,
    'Stesso Vortix. Stessa potenza silenziosa, stesso design essenziale, la stessa missione: trasformare gli scarti in un problema del passato. Per chi preferisce pensarci una volta sola, la garanzia arriva a 8 anni — tre in più, per non doverci più pensare.',
    '/products/vortix-8-anni.png'
  )
on conflict (slug) do nothing;

create or replace function create_shop_order(
  p_items jsonb,
  p_recipient_name text,
  p_street text,
  p_city text,
  p_region text,
  p_country text,
  p_postal_code text,
  p_phone text
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

  -- valida tutti i prodotti e calcola i totali PRIMA di scrivere qualsiasi riga
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

  return new_order;
end;
$$;

revoke all on function create_shop_order(jsonb, text, text, text, text, text, text, text) from public, anon;
grant execute on function create_shop_order(jsonb, text, text, text, text, text, text, text) to authenticated;
