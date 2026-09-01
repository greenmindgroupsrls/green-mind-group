-- Rank automatico e motore commissioni per pezzo venduto.
--
-- ATTENZIONE: la regola VIP/Royal descritta qui sotto è SUPERATA dal
-- 2026-08-26. La logica realmente in vigore (già sul DB da prima, applicata
-- senza migration corrispondente, poi documentata a posteriori) è in
-- 0034_document_actual_rank_logic.sql — leggere quella per la versione
-- corrente di compute_member_ranks(). Le tariffe commissioni sotto
-- (100/100/50/20) restano invece valide come default, ma da
-- 0033_compensation_settings.sql sono configurabili da UI (tabella
-- compensation_settings), non più hardcoded in register_sale().
--
-- Rank (derivato, non memorizzato — sempre calcolato dallo stato attuale della rete):
--   vip    : il membro ha gia' attivato il pass-up (pass_up_done = true), cioe' ha
--            iscritto il suo 3o referral. Vedi 0001_members_structure.sql.
--   royal  : il membro ha almeno 10 diretti strutturali (parent_code) che sono
--            a loro volta vip o royal.
--   standard: nessuna delle due condizioni sopra.
--
-- Commissioni per pezzo venduto (tariffe attuali, vedi nota in register_sale per
-- modificarle in futuro):
--   livello 0 (il venditore stesso)        : 100 per pezzo, sempre, a prescindere dal rank
--   livello 1 (parent_code del venditore)  : 100 per pezzo, solo se rank in (vip, royal)
--   livello 2 (parent del livello 1)       : 50 per pezzo, solo se rank in (vip, royal)
--   livello 3 (parent del livello 2)       : 20 per pezzo, solo se rank = royal
--   oltre il livello 3: nessuna commissione per ora.

create or replace view member_ranks as
with vip_status as (
  select activity_code, pass_up_done as is_vip
  from members
),
vip_direct_counts as (
  select m.parent_code as activity_code, count(*) as vip_directs
  from members m
  join vip_status v on v.activity_code = m.activity_code
  where v.is_vip and m.parent_code is not null
  group by m.parent_code
)
select
  m.activity_code,
  case
    when coalesce(vdc.vip_directs, 0) >= 10 then 'royal'
    when vs.is_vip then 'vip'
    else 'standard'
  end as rank
from members m
join vip_status vs on vs.activity_code = m.activity_code
left join vip_direct_counts vdc on vdc.activity_code = m.activity_code;

create table if not exists sales (
  id bigint generated always as identity primary key,
  seller_code integer not null references members (activity_code),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists sales_seller_code_idx on sales (seller_code);

create table if not exists commission_entries (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales (id),
  beneficiary_code integer not null references members (activity_code),
  level smallint not null check (level between 0 and 3),
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists commission_entries_sale_id_idx on commission_entries (sale_id);
create index if not exists commission_entries_beneficiary_code_idx on commission_entries (beneficiary_code);

-- Registra una vendita e genera atomicamente le commissioni per il venditore e,
-- in base al rank corrente di ciascun antenato strutturale, per i livelli 1-3.
-- Le tariffe (100/100/50/20) sono hardcoded qui: per renderle configurabili in
-- futuro, spostarle in una tabella impostazioni e sostituire le costanti sotto.
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
