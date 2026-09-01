-- Parametri del piano compensi (tariffe per pezzo venduto), configurabili
-- da root invece di hardcoded in register_sale(). Riga singola (id=1).
create table if not exists compensation_settings (
  id integer primary key default 1 check (id = 1),
  level0_rate numeric(12,2) not null default 100,
  level1_rate numeric(12,2) not null default 100,
  level2_rate numeric(12,2) not null default 50,
  level3_rate numeric(12,2) not null default 20,
  updated_at timestamptz not null default now(),
  updated_by integer references members (activity_code)
);

insert into compensation_settings (id) values (1) on conflict (id) do nothing;

alter table compensation_settings enable row level security;

drop policy if exists compensation_settings_select on compensation_settings;
create policy compensation_settings_select on compensation_settings
  for select using (current_member_code() = 0);

create or replace function admin_update_compensation_settings(
  p_level0_rate numeric,
  p_level1_rate numeric,
  p_level2_rate numeric,
  p_level3_rate numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_level0_rate < 0 or p_level1_rate < 0 or p_level2_rate < 0 or p_level3_rate < 0 then
    raise exception 'Le tariffe non possono essere negative';
  end if;

  update compensation_settings set
    level0_rate = p_level0_rate,
    level1_rate = p_level1_rate,
    level2_rate = p_level2_rate,
    level3_rate = p_level3_rate,
    updated_at = now(),
    updated_by = caller
  where id = 1;

  perform log_admin_action('compensation_settings_updated', null, jsonb_build_object(
    'level0_rate', p_level0_rate,
    'level1_rate', p_level1_rate,
    'level2_rate', p_level2_rate,
    'level3_rate', p_level3_rate
  ));
end;
$$;

revoke all on function admin_update_compensation_settings(numeric, numeric, numeric, numeric) from public, anon;
grant execute on function admin_update_compensation_settings(numeric, numeric, numeric, numeric) to authenticated;

-- register_sale ora legge le tariffe da compensation_settings invece dei
-- letterali hardcoded 100/100/50/20 (corpo live recuperato via
-- pg_get_functiondef prima di questa modifica, invariato nel resto).
create or replace function register_sale(p_seller_code integer, p_quantity integer)
returns sales
language plpgsql
security definer
set search_path = public
as $$
declare
  seller members;
  new_sale sales;
  level1_code integer;
  level2_code integer;
  level3_code integer;
  level1_rank text;
  level2_rank text;
  level3_rank text;
  rates compensation_settings;
begin
  if p_seller_code <> current_member_code() then
    raise exception 'Puoi registrare una vendita solo per conto tuo';
  end if;

  if p_quantity <= 0 then
    raise exception 'La quantita deve essere maggiore di zero';
  end if;

  select * into seller from members where activity_code = p_seller_code;
  if seller is null then
    raise exception 'Codice venditore % non trovato', p_seller_code;
  end if;

  select * into rates from compensation_settings where id = 1;

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  if seller.role <> 'cliente' then
    insert into commission_entries (sale_id, beneficiary_code, level, amount)
    values (new_sale.id, p_seller_code, 0, p_quantity * rates.level0_rate);
  end if;

  level1_code := seller.parent_code;
  if level1_code is not null then
    select rank into level1_rank from compute_member_ranks() where activity_code = level1_code;
    if level1_rank in ('vip', 'royal') then
      insert into commission_entries (sale_id, beneficiary_code, level, amount)
      values (new_sale.id, level1_code, 1, p_quantity * rates.level1_rate);
    end if;

    select parent_code into level2_code from members where activity_code = level1_code;
    if level2_code is not null then
      select rank into level2_rank from compute_member_ranks() where activity_code = level2_code;
      if level2_rank in ('vip', 'royal') then
        insert into commission_entries (sale_id, beneficiary_code, level, amount)
        values (new_sale.id, level2_code, 2, p_quantity * rates.level2_rate);
      end if;

      select parent_code into level3_code from members where activity_code = level2_code;
      if level3_code is not null then
        select rank into level3_rank from compute_member_ranks() where activity_code = level3_code;
        if level3_rank = 'royal' then
          insert into commission_entries (sale_id, beneficiary_code, level, amount)
          values (new_sale.id, level3_code, 3, p_quantity * rates.level3_rate);
        end if;
      end if;
    end if;
  end if;

  return new_sale;
end;
$$;
