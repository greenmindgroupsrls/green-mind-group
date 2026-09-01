-- Distinzione Cliente / Incaricato: un cliente resta nell'albero di rete
-- (ha uno sponsor tracciato, utile per sapere chi l'ha portato) ma non
-- guadagna commissioni sulle proprie vendite dirette — l'upline invece
-- continua a percepire le commissioni normalmente, perché è comunque un
-- acquirente reale che genera business. Un incaricato è un membro a tutti
-- gli effetti, come tutti i membri prima di questa migration.

alter table members
  add column if not exists role text not null default 'incaricato'
  check (role in ('cliente', 'incaricato'));

-- Timestamp di quando un cliente ha accettato di diventare incaricato
-- (audit trail per il regolamento accettato in quel momento).
alter table member_profiles
  add column if not exists incaricato_accepted_at timestamptz;

-- register_sale: stessa firma di prima (create or replace senza problemi di
-- overload), unica modifica è saltare la commissione di livello 0 ("propria
-- vendita") quando il venditore è un cliente. L'upline (livelli 1/2/3) non
-- cambia in alcun modo.
create or replace function register_sale(p_seller_code integer, p_quantity integer)
returns sales
language plpgsql
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
begin
  if p_quantity <= 0 then
    raise exception 'La quantita deve essere maggiore di zero';
  end if;

  select * into seller from members where activity_code = p_seller_code;
  if seller is null then
    raise exception 'Codice venditore % non trovato', p_seller_code;
  end if;

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  if seller.role <> 'cliente' then
    insert into commission_entries (sale_id, beneficiary_code, level, amount)
    values (new_sale.id, p_seller_code, 0, p_quantity * 100);
  end if;

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

-- enroll_member: aggiunto p_role (chi iscrive sceglie se la persona è
-- cliente o incaricato). Firma cambiata -> drop esplicito prima del
-- create or replace, altrimenti resta vivo il vecchio overload con i
-- grant di default della piattaforma (stessa lezione delle volte scorse).
drop function if exists enroll_member(text, integer);

create or replace function enroll_member(
  p_username text,
  p_ref_code integer,
  p_role text default 'incaricato'
)
returns members
language plpgsql
as $$
declare
  ref_row members;
  new_member members;
  ref_count integer;
  moved_codes integer[];
begin
  select * into ref_row from members where activity_code = p_ref_code for update;

  if ref_row is null then
    raise exception 'Codice ref % non trovato', p_ref_code;
  end if;

  insert into members (username, ref_sponsor_code, parent_code, role)
  values (p_username, p_ref_code, p_ref_code, p_role)
  returning * into new_member;

  if p_ref_code <> 0 and not ref_row.pass_up_done then
    select count(*) into ref_count from members where ref_sponsor_code = p_ref_code;

    if ref_count >= 3 then
      select array_agg(activity_code) into moved_codes
      from (
        select activity_code from members
        where ref_sponsor_code = p_ref_code
        order by activity_code asc
        limit 2
      ) first_two;

      update members set parent_code = ref_row.parent_code
      where activity_code = any(moved_codes);

      update members set pass_up_done = true
      where activity_code = p_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;

revoke all on function enroll_member(text, integer, text) from public, anon;
grant execute on function enroll_member(text, integer, text) to authenticated;

-- complete_registration: aggiunti p_role (default 'cliente' — l'auto-
-- registrazione parte sempre come cliente per definizione, dato che nessuno
-- sponsor sta scegliendo per lei) e i dati di profilo (account_type/tax_id/
-- company_name) raccolti già in fase di registrazione invece che solo dopo
-- in Impostazioni. Stesso motivo di prima per il drop esplicito: la firma
-- cambia (8 parametri invece di 4).
drop function if exists complete_registration(text, text, integer, boolean);

create or replace function complete_registration(
  p_first_name text,
  p_last_name text,
  p_ref_code integer default null,
  p_auto_assign boolean default false,
  p_role text default 'cliente',
  p_account_type text default 'individual',
  p_tax_id text default null,
  p_company_name text default null
)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text := auth.email();
  actual_ref_code integer;
  ref_row members;
  new_member members;
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  if uid is null then
    raise exception 'Devi essere autenticato per completare la registrazione';
  end if;

  if exists (select 1 from members where auth_user_id = uid) then
    raise exception 'Il tuo account è già collegato a un iscritto';
  end if;

  if p_first_name is null or btrim(p_first_name) = '' then
    raise exception 'Il nome è obbligatorio';
  end if;
  if p_last_name is null or btrim(p_last_name) = '' then
    raise exception 'Il cognome è obbligatorio';
  end if;

  if p_auto_assign then
    actual_ref_code := find_sponsor_for_orphan();
    if actual_ref_code is null then
      actual_ref_code := 0;
    end if;
  else
    actual_ref_code := p_ref_code;
  end if;

  if actual_ref_code is null then
    raise exception 'Codice ref mancante';
  end if;

  select * into ref_row from members where activity_code = actual_ref_code for update;
  if ref_row is null then
    raise exception 'Codice ref % non trovato', actual_ref_code;
  end if;

  base_username := regexp_replace(
    lower(split_part(coalesce(user_email, 'utente'), '@', 1)),
    '[^a-z0-9_.]', '', 'g'
  );
  if base_username = '' then
    base_username := 'utente';
  end if;
  candidate_username := base_username;
  while exists (select 1 from members where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into members (username, first_name, last_name, ref_sponsor_code, parent_code, auth_user_id, email, role)
  values (candidate_username, p_first_name, p_last_name, actual_ref_code, actual_ref_code, uid, user_email, p_role)
  returning * into new_member;

  insert into member_profiles (activity_code, account_type, tax_id, company_name)
  values (
    new_member.activity_code,
    p_account_type,
    p_tax_id,
    case when p_account_type = 'company' then p_company_name else null end
  )
  on conflict (activity_code) do update set
    account_type = excluded.account_type,
    tax_id = excluded.tax_id,
    company_name = excluded.company_name;

  if actual_ref_code <> 0 and not ref_row.pass_up_done then
    if (select count(*) from members where ref_sponsor_code = actual_ref_code) >= 3 then
      update members set parent_code = ref_row.parent_code
      where activity_code in (
        select activity_code from members
        where ref_sponsor_code = actual_ref_code
        order by activity_code asc
        limit 2
      );

      update members set pass_up_done = true where activity_code = actual_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;

revoke all on function complete_registration(text, text, integer, boolean, text, text, text, text) from public, anon;
grant execute on function complete_registration(text, text, integer, boolean, text, text, text, text) to authenticated;

-- become_incaricato: usata dal cliente stesso quando clicca "Diventa
-- distributore" e accetta il regolamento. SECURITY DEFINER perché deve
-- poter aggiornare la propria riga members (nessuna policy UPDATE diretta
-- su members, stesso pattern del resto del progetto).
create or replace function become_incaricato()
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated_member members;
begin
  if caller is null then
    raise exception 'Devi essere autenticato';
  end if;

  update members set role = 'incaricato'
  where activity_code = caller
  returning * into updated_member;

  update member_profiles set incaricato_accepted_at = now()
  where activity_code = caller;

  return updated_member;
end;
$$;

revoke all on function become_incaricato() from public, anon;
grant execute on function become_incaricato() to authenticated;
