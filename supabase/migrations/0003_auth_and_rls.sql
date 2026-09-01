-- Collega ogni membro al proprio account Supabase Auth e blinda l'accesso ai
-- dati: da qui in poi ogni iscritto ha un login proprio (email+password) e
-- vede solo se stesso e il proprio sotto-albero strutturale. L'azienda
-- (activity_code = 0) vede tutta la rete, perché tutti sono suoi discendenti.
--
-- Le tabelle members/sales/commission_entries passano a row level security
-- con SOLE policy di select: le scritture avvengono esclusivamente tramite
-- le funzioni SECURITY DEFINER enroll_member()/register_sale() (aggiornate
-- qui sotto con un controllo di autorizzazione interno), mai da insert
-- diretti del client — senza una policy insert, RLS li blocca di default.

alter table members add column if not exists auth_user_id uuid unique references auth.users (id);
alter table members add column if not exists email text;

-- SECURITY DEFINER: deve leggere members bypassando RLS, altrimenti si crea
-- una dipendenza circolare con le policy che la usano.
create or replace function current_member_code()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select activity_code from members where auth_user_id = auth.uid();
$$;

-- SECURITY DEFINER per lo stesso motivo: deve poter attraversare l'intero
-- albero indipendentemente da cosa il chiamante potrebbe gia' vedere.
create or replace function is_self_or_descendant(viewer integer, target integer)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with recursive subtree as (
    select activity_code from members where activity_code = viewer
    union all
    select m.activity_code from members m join subtree s on m.parent_code = s.activity_code
  )
  select viewer is not null and exists (select 1 from subtree where activity_code = target);
$$;

alter table members enable row level security;
alter table sales enable row level security;
alter table commission_entries enable row level security;

drop policy if exists members_select on members;
create policy members_select on members
  for select
  using (is_self_or_descendant(current_member_code(), activity_code));

drop policy if exists sales_select on sales;
create policy sales_select on sales
  for select
  using (is_self_or_descendant(current_member_code(), seller_code));

drop policy if exists commission_entries_select on commission_entries;
create policy commission_entries_select on commission_entries
  for select
  using (is_self_or_descendant(current_member_code(), beneficiary_code));

-- Ricrea enroll_member con il controllo di autorizzazione: si puo' iscrivere
-- solo sotto il proprio codice ref, a meno di essere l'azienda (0) che puo'
-- iscrivere sotto qualunque ref (uso amministrativo).
create or replace function enroll_member(p_username text, p_ref_code integer)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  ref_row members;
  new_member members;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per iscrivere un nuovo membro';
  end if;
  if p_ref_code <> caller and caller <> 0 then
    raise exception 'Non autorizzato a iscrivere sotto questo codice ref';
  end if;

  select * into ref_row from members where activity_code = p_ref_code for update;

  if ref_row is null then
    raise exception 'Codice ref % non trovato', p_ref_code;
  end if;

  insert into members (username, ref_sponsor_code, parent_code)
  values (p_username, p_ref_code, p_ref_code)
  returning * into new_member;

  if p_ref_code <> 0 and not ref_row.pass_up_done then
    if (select count(*) from members where ref_sponsor_code = p_ref_code) >= 3 then
      update members set parent_code = ref_row.parent_code
      where activity_code in (
        select activity_code from members
        where ref_sponsor_code = p_ref_code
        order by activity_code asc
        limit 2
      );

      update members set pass_up_done = true where activity_code = p_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;

-- Ricrea register_sale con lo stesso tipo di controllo: si puo' registrare
-- una vendita solo per se stessi, a meno di essere l'azienda (0).
create or replace function register_sale(p_seller_code integer, p_quantity integer)
returns sales
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  seller members;
  new_sale sales;
  level1_code integer;
  level2_code integer;
  level3_code integer;
  level1_rank text;
  level2_rank text;
  level3_rank text;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per registrare una vendita';
  end if;
  if p_seller_code <> caller and caller <> 0 then
    raise exception 'Non autorizzato a registrare una vendita per questo codice';
  end if;

  if p_quantity <= 0 then
    raise exception 'La quantita deve essere maggiore di zero';
  end if;

  select * into seller from members where activity_code = p_seller_code;
  if seller is null then
    raise exception 'Codice venditore % non trovato', p_seller_code;
  end if;

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  insert into commission_entries (sale_id, beneficiary_code, level, amount)
  values (new_sale.id, p_seller_code, 0, p_quantity * 100);

  level1_code := seller.parent_code;
  if level1_code is not null then
    select rank into level1_rank from member_ranks where activity_code = level1_code;
    if level1_rank in ('vip', 'royal') then
      insert into commission_entries (sale_id, beneficiary_code, level, amount)
      values (new_sale.id, level1_code, 1, p_quantity * 100);
    end if;

    select parent_code into level2_code from members where activity_code = level1_code;
    if level2_code is not null then
      select rank into level2_rank from member_ranks where activity_code = level2_code;
      if level2_rank in ('vip', 'royal') then
        insert into commission_entries (sale_id, beneficiary_code, level, amount)
        values (new_sale.id, level2_code, 2, p_quantity * 50);
      end if;

      select parent_code into level3_code from members where activity_code = level2_code;
      if level3_code is not null then
        select rank into level3_rank from member_ranks where activity_code = level3_code;
        if level3_rank = 'royal' then
          insert into commission_entries (sale_id, beneficiary_code, level, amount)
          values (new_sale.id, level3_code, 3, p_quantity * 20);
        end if;
      end if;
    end if;
  end if;

  return new_sale;
end;
$$;

revoke all on function enroll_member(text, integer) from public;
grant execute on function enroll_member(text, integer) to authenticated, service_role;

revoke all on function register_sale(integer, integer) from public;
grant execute on function register_sale(integer, integer) to authenticated, service_role;
