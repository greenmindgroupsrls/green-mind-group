-- PIANO COMPENSI "SISTEMA 2" (pass-up a due contratti)
--
-- Cosa cambia rispetto al piano precedente (100/100/50/20 su quattro livelli):
--   * 170,00 EUR di provvigione diretta a ogni pezzo venduto, all'Incaricato
--     che ha fatto la vendita;
--   * 80,00 EUR di pass-up al primo VIP che si trova risalendo la struttura,
--     ma soltanto sulle prime due vendite qualificanti di ciascuno;
--   * 31,72 EUR (il 3% dell'imponibile di un prodotto da 1.290 EUR) messi da
--     parte a ogni pezzo nel Royal Pool, che si liquida a periodi fra chi ha
--     almeno 10 VIP diretti.
--
-- "Vendita qualificante" = iscrizione di un nuovo Incaricato che ha pagato.
-- Una vendita a chi non entra in rete, o a un Cliente, paga la diretta e
-- alimenta il pool ma non consuma le due cessioni: e' la regola decisa
-- dall'azienda.
--
-- Le qualifiche VIP e Royal sono PERMANENTI: una volta ottenute non si
-- perdono piu'. E' una scelta aziendale su un prodotto che si compra una
-- volta sola, non una semplificazione tecnica.
--
-- Il meccanismo di risalita esisteva gia': find_pass_up_target() cerca il
-- primo VIP sopra e ripiega sull'azienda. Qui cambia solo cosa lo fa
-- scattare: prima era il terzo iscritto, ora sono le prime due vendite.

-- === 1. Parametri del piano, modificabili senza ripubblicare ===============
alter table compensation_settings
  add column if not exists plan2_active_from   timestamptz,
  add column if not exists plan2_direct_rate   numeric(10,2) not null default 170.00,
  add column if not exists plan2_passup_rate   numeric(10,2) not null default 80.00,
  add column if not exists plan2_pool_rate     numeric(10,2) not null default 31.72,
  add column if not exists plan2_passup_quota  integer       not null default 2,
  add column if not exists plan2_royal_directs integer       not null default 10;

comment on column compensation_settings.plan2_active_from is
  'Da quando vale il Sistema 2. Nullo = piano vecchio. Le vendite registrate prima di questa data restano com''erano.';

-- === 2. Qualifiche permanenti e contatore delle cessioni ==================
alter table members
  add column if not exists vip_qualified_at   timestamptz,
  add column if not exists royal_qualified_at timestamptz,
  add column if not exists passed_up_count    integer not null default 0;

comment on column members.passed_up_count is
  'Quante vendite qualificanti sono state cedute al VIP superiore. Raggiunta la quota, il membro e liberato e diventa VIP.';

-- === 3. Tipo di provvigione ===============================================
alter table commission_entries
  add column if not exists kind text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_entries_kind_check') then
    alter table commission_entries
      add constraint commission_entries_kind_check
      check (kind is null or kind in ('diretta', 'pass_up', 'pool_royal'));
  end if;
end $$;

comment on column commission_entries.kind is
  'Nullo sulle righe del piano vecchio, che si leggono dal livello.';

-- === 4. Royal Pool ========================================================
create table if not exists royal_pool_settlements (
  id           bigserial primary key,
  settled_at   timestamptz   not null default now(),
  total_amount numeric(10,2) not null,
  royal_count  integer       not null,
  share        numeric(10,2) not null,
  settled_by   integer references members(activity_code)
);

create table if not exists royal_pool_entries (
  id            bigserial primary key,
  sale_id       bigint        not null references sales(id) on delete cascade,
  amount        numeric(10,2) not null,
  created_at    timestamptz   not null default now(),
  settlement_id bigint references royal_pool_settlements(id)
);

-- Le righe non ancora liquidate si leggono a ogni chiusura: vale un indice.
create index if not exists royal_pool_entries_da_liquidare_idx
  on royal_pool_entries (settlement_id) where settlement_id is null;

alter table royal_pool_entries      enable row level security;
alter table royal_pool_settlements  enable row level security;

drop policy if exists royal_pool_entries_select on royal_pool_entries;
create policy royal_pool_entries_select on royal_pool_entries
  for select using (current_member_code() = 0);

-- Le chiusure sono numeri aggregati, non dicono nulla su nessuno in
-- particolare: chi e' in rete puo' vederle.
drop policy if exists royal_pool_settlements_select on royal_pool_settlements;
create policy royal_pool_settlements_select on royal_pool_settlements
  for select using (current_member_code() is not null);

-- === 5. Il rank tiene conto delle qualifiche permanenti ===================
-- Ordine di precedenza: assegnazione manuale dell'azienda, poi la qualifica
-- conquistata (che non si perde piu'), poi il calcolo del piano vecchio per
-- chi non ha ancora nessuna qualifica.
create or replace function public.compute_member_ranks()
returns table(activity_code integer, rank text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  required integer;
  qualifying_directs integer;
  royal_count integer;
  computed_rank text;
  override_rank text;
  qualified_vip timestamptz;
  qualified_royal timestamptz;
  closure_map jsonb;
  computed jsonb := '{}'::jsonb;
begin
  select coalesce(jsonb_object_agg(x.ancestor, x.descendants), '{}'::jsonb) into closure_map
  from (
    select c.ancestor::text as ancestor, jsonb_agg(c.descendant) as descendants
    from (
      with recursive closure as (
        select m.activity_code as ancestor, m.activity_code as descendant from members m
        union all
        select cl.ancestor, m.activity_code
        from members m
        join closure cl on m.parent_code = cl.descendant
      )
      select ancestor, descendant from closure where ancestor <> descendant
    ) c
    group by c.ancestor
  ) x;

  for r in
    with recursive depths as (
      select m.activity_code as node_code, 0 as depth
      from members m
      where m.parent_code is null
      union all
      select m.activity_code as node_code, d.depth + 1
      from members m
      join depths d on m.parent_code = d.node_code
    )
    select node_code as activity_code from depths order by depth desc
  loop
    select o.rank into override_rank
    from member_rank_overrides o
    where o.activity_code = r.activity_code;

    select m.vip_qualified_at, m.royal_qualified_at
      into qualified_vip, qualified_royal
    from members m where m.activity_code = r.activity_code;

    if override_rank is not null then
      computed_rank := override_rank;
    elsif r.activity_code = 0 then
      computed_rank := 'royal';
    elsif qualified_royal is not null then
      computed_rank := 'royal';
    elsif qualified_vip is not null then
      computed_rank := 'vip';
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
      from jsonb_array_elements_text(coalesce(closure_map -> r.activity_code::text, '[]'::jsonb)) as d(descendant_code)
      where computed ->> d.descendant_code in ('vip', 'royal');

      if royal_count >= 10 then
        computed_rank := 'royal';
      elsif qualifying_directs >= required then
        computed_rank := 'vip';
      else
        computed_rank := 'standard';
      end if;
    end if;

    computed := computed || jsonb_build_object(r.activity_code::text, computed_rank);
  end loop;

  return query
    select t.key::integer, t.value
    from jsonb_each_text(computed) as t(key, value);
end;
$function$;

-- === 6. Promozione a Royal ================================================
-- Si diventa Royal con 10 VIP agganciati direttamente sotto di se' nella
-- struttura: contano anche quelli arrivati per eredita' dai pass-up, come
-- deciso dall'azienda ("diventa a tutti gli effetti un tuo diretto").
create or replace function public.verifica_qualifica_royal(p_code integer)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  vip_diretti integer;
  soglia integer;
  gia_royal timestamptz;
begin
  if p_code is null then return false; end if;

  select royal_qualified_at into gia_royal from members where activity_code = p_code;
  if gia_royal is not null then return false; end if;

  select plan2_royal_directs into soglia from compensation_settings where id = 1;

  select count(*) into vip_diretti
  from members
  where parent_code = p_code
    and (vip_qualified_at is not null or royal_qualified_at is not null);

  if vip_diretti >= soglia then
    update members set royal_qualified_at = now() where activity_code = p_code;

    insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
    select 0, 'green-mind-group', p_code, m.username,
      'Hai raggiunto la qualifica Royal',
      format('Complimenti: hai %s VIP diretti nella tua struttura e da adesso partecipi al Royal Pool.', vip_diretti)
    from members m where m.activity_code = p_code;

    return true;
  end if;

  return false;
end;
$function$;

revoke execute on function public.verifica_qualifica_royal(integer) from anon, authenticated;

-- === 7. Registrazione della vendita =======================================
-- La firma cresce di un parametro facoltativo: chi ha comprato. Serve per il
-- pass-up, perche' e' l'acquirente a essere ereditato dal VIP superiore.
-- Le chiamate vecchie a due parametri continuano a funzionare.
drop function if exists public.register_sale(integer, integer);

create or replace function public.register_sale(
  p_seller_code integer,
  p_quantity integer,
  p_buyer_code integer default null
)
returns sales
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  seller members;
  buyer members;
  new_sale sales;
  rates compensation_settings;
  amount numeric;
  qualificante boolean := false;
  destinatario integer;
  quota_residua integer;
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

  select * into seller from members where activity_code = p_seller_code for update;
  if seller is null then
    raise exception 'Codice venditore % non trovato', p_seller_code;
  end if;

  select * into rates from compensation_settings where id = 1;

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  -- ---- Piano vecchio: quattro livelli, nessun pass-up ---------------------
  if rates.plan2_active_from is null or now() < rates.plan2_active_from then
    if seller.role <> 'cliente' then
      amount := p_quantity * rates.level0_rate;
      insert into commission_entries (sale_id, beneficiary_code, level, amount)
      values (new_sale.id, p_seller_code, 0, amount);

      insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
      values (p_seller_code, seller.username, p_seller_code, seller.username,
        'Nuova commissione guadagnata',
        format('Hai guadagnato %s€ dalla tua vendita di %s pezzi.', amount, p_quantity));
    end if;

    level1_code := seller.parent_code;
    if level1_code is not null then
      select rank into level1_rank from compute_member_ranks() where activity_code = level1_code;
      if level1_rank in ('vip', 'royal') then
        amount := p_quantity * rates.level1_rate;
        insert into commission_entries (sale_id, beneficiary_code, level, amount)
        values (new_sale.id, level1_code, 1, amount);
      end if;

      select parent_code into level2_code from members where activity_code = level1_code;
      if level2_code is not null then
        select rank into level2_rank from compute_member_ranks() where activity_code = level2_code;
        if level2_rank in ('vip', 'royal') then
          amount := p_quantity * rates.level2_rate;
          insert into commission_entries (sale_id, beneficiary_code, level, amount)
          values (new_sale.id, level2_code, 2, amount);
        end if;

        select parent_code into level3_code from members where activity_code = level2_code;
        if level3_code is not null then
          select rank into level3_rank from compute_member_ranks() where activity_code = level3_code;
          if level3_rank = 'royal' then
            amount := p_quantity * rates.level3_rate;
            insert into commission_entries (sale_id, beneficiary_code, level, amount)
            values (new_sale.id, level3_code, 3, amount);
          end if;
        end if;
      end if;
    end if;

    return new_sale;
  end if;

  -- ---- Sistema 2 ----------------------------------------------------------

  -- 1) Provvigione diretta: sempre, a chi ha venduto, per ogni pezzo.
  --    I Clienti non percepiscono provvigioni, come nel piano precedente.
  if seller.role <> 'cliente' then
    amount := p_quantity * rates.plan2_direct_rate;
    insert into commission_entries (sale_id, beneficiary_code, level, amount, kind)
    values (new_sale.id, p_seller_code, 0, amount, 'diretta');

    insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
    values (p_seller_code, seller.username, p_seller_code, seller.username,
      'Nuova commissione guadagnata',
      format('Hai guadagnato %s€ dalla tua vendita di %s pezzi.', amount, p_quantity));
  end if;

  -- 2) Royal Pool: accantonamento a ogni pezzo, indipendente da tutto il
  --    resto. E' una quota dei ricavi, non una provvigione di qualcuno.
  insert into royal_pool_entries (sale_id, amount)
  values (new_sale.id, p_quantity * rates.plan2_pool_rate);

  -- 3) Vendita qualificante: solo se accompagnata dall'iscrizione di un nuovo
  --    Incaricato che ha pagato. Una vendita a un Cliente, o a chi non entra
  --    in rete, non consuma le cessioni.
  if p_buyer_code is not null then
    select * into buyer from members where activity_code = p_buyer_code for update;
    qualificante := buyer.activity_code is not null
                and buyer.role = 'incaricato'
                and buyer.activity_code <> p_seller_code;
  end if;

  quota_residua := rates.plan2_passup_quota - seller.passed_up_count;

  if qualificante and quota_residua > 0 and p_seller_code <> 0 then
    -- L'acquirente viene ereditato dal primo VIP che si trova risalendo la
    -- struttura dal venditore. Se sopra non c'e' nessun VIP si arriva
    -- all'azienda.
    destinatario := find_pass_up_target(seller.parent_code);

    update members set parent_code = destinatario where activity_code = p_buyer_code;

    insert into commission_entries (sale_id, beneficiary_code, level, amount, kind)
    values (new_sale.id, destinatario, 1, rates.plan2_passup_rate, 'pass_up');

    insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
    select p_seller_code, seller.username, destinatario, m.username,
      'Nuova commissione guadagnata',
      format('Hai guadagnato %s€ di pass-up da una vendita di %s.', rates.plan2_passup_rate, seller.username)
    from members m where m.activity_code = destinatario;

    update members
    set passed_up_count = passed_up_count + 1,
        -- si tiene aggiornato anche il vecchio segnalino, che resta letto
        -- altrove, cosi' i due non si contraddicono
        pass_up_done = (passed_up_count + 1) >= rates.plan2_passup_quota
    where activity_code = p_seller_code
    returning passed_up_count into quota_residua;

    -- 4) Cedute tutte le vendite previste, il venditore e' libero: da qui in
    --    poi i suoi iscritti restano suoi, e la qualifica VIP e' acquisita.
    if quota_residua >= rates.plan2_passup_quota and seller.vip_qualified_at is null then
      update members set vip_qualified_at = now() where activity_code = p_seller_code;

      insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
      values (0, 'green-mind-group', p_seller_code, seller.username,
        'Hai raggiunto la qualifica VIP',
        format('Hai completato le %s vendite di qualifica: da adesso i tuoi nuovi iscritti restano nella tua struttura e ricevi tu i pass-up.', rates.plan2_passup_quota));

      -- Un VIP in piu' sotto qualcuno puo' farlo diventare Royal.
      perform verifica_qualifica_royal((select parent_code from members where activity_code = p_seller_code));
    end if;
  end if;

  return new_sale;
end;
$function$;

revoke execute on function public.register_sale(integer, integer, integer) from anon;

-- === 8. L'iscrizione non sposta piu' nessuno ==============================
-- Nel piano vecchio erano i primi due ISCRITTI a salire, e succedeva in un
-- colpo solo quando arrivava il terzo. Nel Sistema 2 sono le prime due
-- VENDITE, e lo spostamento avviene subito, dentro register_sale. Qui resta
-- il comportamento di prima solo per il periodo precedente al lancio.
create or replace function public.enroll_member(
  p_username text,
  p_ref_code integer,
  p_role text default 'incaricato'::text
)
returns members
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ref_row members;
  new_member members;
  ref_count integer;
  moved_codes integer[];
  pass_up_target integer;
  attivo_da timestamptz;
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

  select plan2_active_from into attivo_da from compensation_settings where id = 1;

  if (attivo_da is null or now() < attivo_da)
     and p_ref_code <> 0 and not ref_row.pass_up_done then
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
$function$;

-- === 9. Liquidazione del Royal Pool =======================================
-- Il pool non si liquida da solo a calendario: lo chiude l'azienda quando
-- decide, cosi' la data e' una scelta e non un automatismo che scatta di
-- notte senza che nessuno controlli.
alter table commission_entries
  alter column sale_id drop not null,
  add column if not exists settlement_id bigint references royal_pool_settlements(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commission_entries_origine_check') then
    alter table commission_entries
      add constraint commission_entries_origine_check
      check (sale_id is not null or kind = 'pool_royal');
  end if;
end $$;

-- Il vincolo ammetteva solo i livelli 0-3 del piano vecchio. La quota del
-- Royal Pool non appartiene a nessun livello della struttura: si registra
-- come 4, cioe' "oltre i livelli", e si riconosce comunque dal campo kind.
alter table commission_entries drop constraint if exists commission_entries_level_check;

alter table commission_entries
  add constraint commission_entries_level_check
  check (level >= 0 and level <= 4);

comment on column commission_entries.level is
  'Piano vecchio: 0 venditore, 1-3 livelli superiori. Sistema 2: 0 diretta, 1 pass-up, 4 quota del Royal Pool.';

create or replace function public.liquida_royal_pool()
returns royal_pool_settlements
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  totale numeric(10,2);
  quanti integer;
  quota numeric(10,2);
  chiusura royal_pool_settlements;
  royal record;
begin
  if chiamante is null or chiamante <> 0 then
    raise exception 'Non autorizzato';
  end if;

  select coalesce(sum(amount), 0) into totale
  from royal_pool_entries where settlement_id is null;

  if totale <= 0 then
    raise exception 'Non c''e nulla da liquidare nel Royal Pool';
  end if;

  -- Partecipa chi ha la qualifica Royal, esclusa l'azienda: il codice 0 e'
  -- Royal per definizione ma non e' un beneficiario.
  select count(*) into quanti
  from members m
  join compute_member_ranks() r on r.activity_code = m.activity_code
  where r.rank = 'royal' and m.activity_code <> 0;

  if quanti = 0 then
    raise exception 'Nessun Royal qualificato: il pool resta accantonato';
  end if;

  -- Si arrotonda per difetto al centesimo: la differenza resta nel pool
  -- invece di distribuire un centesimo che non esiste.
  quota := floor((totale / quanti) * 100) / 100;

  insert into royal_pool_settlements (total_amount, royal_count, share, settled_by)
  values (totale, quanti, quota, chiamante)
  returning * into chiusura;

  for royal in
    select m.activity_code, m.username
    from members m
    join compute_member_ranks() r on r.activity_code = m.activity_code
    where r.rank = 'royal' and m.activity_code <> 0
  loop
    insert into commission_entries (sale_id, beneficiary_code, level, amount, kind, settlement_id)
    values (null, royal.activity_code, 4, quota, 'pool_royal', chiusura.id);

    insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
    values (0, 'green-mind-group', royal.activity_code, royal.username,
      'Quota del Royal Pool accreditata',
      format('E'' stato chiuso il Royal Pool: %s€ divisi fra %s Royal, la tua quota e'' %s€.', totale, quanti, quota));
  end loop;

  update royal_pool_entries set settlement_id = chiusura.id where settlement_id is null;

  return chiusura;
end;
$function$;

revoke execute on function public.liquida_royal_pool() from anon;

-- === 10. Accensione =======================================================
-- Il piano NON si accende qui. Prima deve essere in linea la versione del
-- sito che passa l'acquirente a register_sale: senza, le iscrizioni
-- pagherebbero la diretta senza far scattare il pass-up. L'accensione e'
-- una riga a parte, eseguita dopo la pubblicazione:
--   update compensation_settings set plan2_active_from = now() where id = 1;

-- === 11. Tariffe modificabili dal Centro di controllo =====================
create or replace function public.admin_update_plan2_settings(
  p_direct_rate numeric,
  p_passup_rate numeric,
  p_pool_rate numeric,
  p_passup_quota integer,
  p_royal_directs integer
)
returns compensation_settings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  aggiornate compensation_settings;
begin
  if chiamante is null or chiamante <> 0 then
    raise exception 'Non autorizzato';
  end if;

  if p_direct_rate < 0 or p_passup_rate < 0 or p_pool_rate < 0 then
    raise exception 'Le tariffe non possono essere negative';
  end if;
  if p_passup_quota < 0 then
    raise exception 'Le vendite da cedere non possono essere negative';
  end if;
  if p_royal_directs < 1 then
    raise exception 'Servono almeno 1 VIP diretto per la qualifica Royal';
  end if;

  update compensation_settings
  set plan2_direct_rate = p_direct_rate,
      plan2_passup_rate = p_passup_rate,
      plan2_pool_rate = p_pool_rate,
      plan2_passup_quota = p_passup_quota,
      plan2_royal_directs = p_royal_directs
  where id = 1
  returning * into aggiornate;

  insert into admin_audit_log (actor_code, action_type, target_code, details)
  values (chiamante, 'plan2_settings_updated', null,
    jsonb_build_object('diretta', p_direct_rate, 'pass_up', p_passup_rate,
                       'pool', p_pool_rate, 'quota', p_passup_quota,
                       'royal_diretti', p_royal_directs));

  return aggiornate;
end;
$function$;

revoke execute on function public.admin_update_plan2_settings(numeric, numeric, numeric, integer, integer) from anon;
