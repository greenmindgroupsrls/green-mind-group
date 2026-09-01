-- Ridisegno del piano compensi, concordato con l'utente punto per punto:
--
-- VIP (dinamico, non piu' legato al pass-up):
--   - se il membro ha fatto almeno un acquisto proprio: gli bastano 2 diretti
--     per codice REF (non posizione strutturale — "lavoro personale", non
--     chi arriva da sotto per un pass-up altrui) che hanno comprato almeno
--     un pezzo ciascuno.
--   - se il membro NON ha mai comprato: gliene servono 10.
--   - la soglia e' dinamica: se un membro e' a 5 diretti-che-comprano e poi
--     acquista lui stesso, diventa VIP in quel momento (2 <= 5), senza dover
--     aspettare di arrivare a 10.
--
-- Royal: almeno 10 membri VIP o Royal ovunque nella propria struttura
--   (parent_code, qualsiasi profondita' — non solo diretti). L'azienda
--   (activity_code = 0) e' sempre Royal per definizione, a prescindere dai
--   conteggi.
--
-- Pass-up (il trigger resta invariato: 3° referral diretto per ref_sponsor_code):
--   la destinazione ora e' il primo antenato VIP o Royal risalendo l'albero
--   (parent_code) a partire dal parent di chi ha appena fatto 3 iscritti —
--   non piu' semplicemente il parent immediato. Se il parent immediato non
--   e' VIP, si risale finche' non se ne trova uno (l'azienda, sempre Royal,
--   garantisce che la risalita termini sempre).
--
-- Bug di sicurezza scoperto e corretto nello stesso intervento: ne'
-- enroll_member ne' register_sale erano SECURITY DEFINER, ma members/sales/
-- commission_entries hanno RLS attiva con solo policy di SELECT (nessuna di
-- INSERT/UPDATE) — significa che chiamate dirette via RPC (non annidate
-- dentro un'altra funzione SECURITY DEFINER come create_shop_order)
-- fallivano sempre con "row-level security policy violation", per
-- qualunque chiamante reale, azienda inclusa. Verificato empiricamente
-- prima di questa migration. Root cause del fatto che il flusso
-- "Registrazione da back office con vendita abbinata" non ha mai
-- funzionato per un utente vero — solo l'autoregistrazione (che passa da
-- complete_registration, gia' SECURITY DEFINER) ha sempre funzionato.
-- Fix: entrambe le funzioni diventano SECURITY DEFINER, con un controllo
-- esplicito che il chiamante stia agendo solo per conto di se stesso
-- (stesso pattern di autorizzazione gia' usato ovunque nel progetto).

-- Calcola il rank corretto per TUTTI i membri in un solo passaggio,
-- ordinando dal piu' profondo al piu' superficiale cosi' che, quando si
-- valuta un nodo, tutti i suoi discendenti abbiano gia' un rank definitivo
-- (Royal dipende dal rank dei propri discendenti, non il contrario — nessun
-- ciclo, solo un ordine di valutazione da rispettare). SECURITY DEFINER:
-- deve vedere l'intera rete indipendentemente da chi chiama, altrimenti il
-- conteggio dei diretti-per-ref (che dopo un pass-up puo' non coincidere
-- piu' con i discendenti strutturali visibili via RLS) sarebbe sbagliato.
create or replace function compute_member_ranks()
returns table(activity_code integer, rank text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  required integer;
  qualifying_directs integer;
  royal_count integer;
  computed_rank text;
begin
  create temporary table if not exists tmp_ranks_calc (
    activity_code integer primary key,
    rank text not null
  );
  truncate tmp_ranks_calc;

  create temporary table if not exists tmp_closure_calc (
    ancestor integer,
    descendant integer
  );
  truncate tmp_closure_calc;

  insert into tmp_closure_calc (ancestor, descendant)
  with recursive closure as (
    select m.activity_code as ancestor, m.activity_code as descendant from members m
    union all
    select c.ancestor, m.activity_code
    from members m
    join closure c on m.parent_code = c.descendant
  )
  select ancestor, descendant from closure where ancestor <> descendant;

  for r in
    with recursive depths as (
      select m.activity_code, 0 as depth
      from members m
      where m.parent_code is null
      union all
      select m.activity_code, d.depth + 1
      from members m
      join depths d on m.parent_code = d.activity_code
    )
    select activity_code from depths order by depth desc
  loop
    if r.activity_code = 0 then
      computed_rank := 'royal';
    else
      select count(distinct m.activity_code) into qualifying_directs
      from members m
      where m.ref_sponsor_code = r.activity_code
        and exists (select 1 from sales s where s.seller_code = m.activity_code);

      required := case
        when exists (select 1 from sales s where s.seller_code = r.activity_code) then 2
        else 10
      end;

      select count(*) into royal_count
      from tmp_closure_calc tc
      join tmp_ranks_calc tr on tr.activity_code = tc.descendant
      where tc.ancestor = r.activity_code
        and tr.rank in ('vip', 'royal');

      if royal_count >= 10 then
        computed_rank := 'royal';
      elsif qualifying_directs >= required then
        computed_rank := 'vip';
      else
        computed_rank := 'standard';
      end if;
    end if;

    insert into tmp_ranks_calc (activity_code, rank) values (r.activity_code, computed_rank);
  end loop;

  return query select t.activity_code, t.rank from tmp_ranks_calc t;
end;
$$;

revoke all on function compute_member_ranks() from public, anon, authenticated;

-- Vista client-facing: stessa visibilita' di sempre (se stesso o discendenti
-- strutturali, azienda vede tutto) — ma il filtro e' esplicito nel WHERE
-- invece di affidarsi a security_invoker sulla vista, perche' la vista non
-- tocca piu' direttamente la tabella members nel FROM (chiama la funzione
-- sopra), quindi security_invoker da solo non filtrerebbe piu' nulla.
drop view if exists member_ranks;
create view member_ranks as
select cr.activity_code, cr.rank
from compute_member_ranks() cr
where current_member_code() = 0 or is_self_or_descendant(current_member_code(), cr.activity_code);

revoke all on member_ranks from public, anon;
grant select on member_ranks to authenticated;

-- Risale l'albero (parent_code) da un punto di partenza finche' non trova un
-- antenato VIP o Royal. Termina sempre: l'azienda (0) e' Royal per
-- definizione. Usata dal pass-up per trovare la nuova destinazione.
create or replace function find_pass_up_target(p_from_code integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_code integer := p_from_code;
  current_rank text;
begin
  loop
    select rank into current_rank from compute_member_ranks() where activity_code = current_code;
    if current_rank in ('vip', 'royal') then
      return current_code;
    end if;

    select parent_code into current_code from members where activity_code = current_code;
    if current_code is null then
      return 0;
    end if;
  end loop;
end;
$$;

revoke all on function find_pass_up_target(integer) from public, anon, authenticated;

-- enroll_member: diventa SECURITY DEFINER (fix del bug di scrittura), con
-- controllo esplicito che il chiamante stia iscrivendo qualcuno sotto se
-- stesso (p_ref_code deve essere il proprio codice — coerente con come la
-- pagina Registrazione la chiama gia' oggi). Il pass-up ora usa
-- find_pass_up_target invece del parent immediato.
create or replace function enroll_member(
  p_username text,
  p_ref_code integer,
  p_role text default 'incaricato'
)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_row members;
  new_member members;
  ref_count integer;
  moved_codes integer[];
  pass_up_target integer;
begin
  if p_ref_code <> current_member_code() then
    raise exception 'Puoi iscrivere qualcuno solo sotto il tuo stesso codice';
  end if;

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

      pass_up_target := find_pass_up_target(ref_row.parent_code);

      update members set parent_code = pass_up_target
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

-- complete_registration: stessa modifica per il pass-up (find_pass_up_target
-- invece del parent immediato). Gia' SECURITY DEFINER, nessun altro cambio.
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
  pass_up_target integer;
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
      pass_up_target := find_pass_up_target(ref_row.parent_code);

      update members set parent_code = pass_up_target
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

-- register_sale: diventa SECURITY DEFINER (fix del bug di scrittura), con
-- controllo esplicito che si possa registrare una vendita solo per se
-- stessi (coerente con entrambi gli usi reali: acquisto diretto dallo shop,
-- o vendita del pacchetto d'ingresso da parte dello sponsor che iscrive).
-- I livelli 1-3 ora leggono da compute_member_ranks() (visibilita' globale,
-- non filtrata) invece della vecchia vista, perche' serve vedere il rank
-- degli antenati del venditore indipendentemente da chi chiama.
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

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  if seller.role <> 'cliente' then
    insert into commission_entries (sale_id, beneficiary_code, level, amount)
    values (new_sale.id, p_seller_code, 0, p_quantity * 100);
  end if;

  level1_code := seller.parent_code;
  if level1_code is not null then
    select rank into level1_rank from compute_member_ranks() where activity_code = level1_code;
    if level1_rank in ('vip', 'royal') then
      insert into commission_entries (sale_id, beneficiary_code, level, amount)
      values (new_sale.id, level1_code, 1, p_quantity * 100);
    end if;

    select parent_code into level2_code from members where activity_code = level1_code;
    if level2_code is not null then
      select rank into level2_rank from compute_member_ranks() where activity_code = level2_code;
      if level2_rank in ('vip', 'royal') then
        insert into commission_entries (sale_id, beneficiary_code, level, amount)
        values (new_sale.id, level2_code, 2, p_quantity * 50);
      end if;

      select parent_code into level3_code from members where activity_code = level2_code;
      if level3_code is not null then
        select rank into level3_rank from compute_member_ranks() where activity_code = level3_code;
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

revoke all on function register_sale(integer, integer) from public, anon;
grant execute on function register_sale(integer, integer) to authenticated;
