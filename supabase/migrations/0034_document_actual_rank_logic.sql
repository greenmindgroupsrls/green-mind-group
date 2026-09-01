-- La logica VIP/Royal descritta nel commento di 0002_ranks_and_commissions.sql
-- (VIP al 3o iscritto via pass_up_done, Royal a 10 diretti strutturali) e'
-- SUPERATA: e' stata sostituita in una sessione precedente non documentata
-- da questa versione, applicata direttamente sul database senza una
-- migration corrispondente. Questa migration NON cambia alcun comportamento
-- (il corpo e' identico a quello gia' in produzione, recuperato via
-- pg_get_functiondef() prima di scriverla) - serve solo a registrare nella
-- cronologia delle migration la regola realmente in vigore.
--
-- Regola VIP/Royal attuale (confermata con l'utente il 2026-08-26):
--   VIP: il nodo diventa VIP quando almeno N suoi iscritti diretti (di
--        qualunque ruolo, cliente o incaricato) hanno registrato ALMENO
--        una vendita/acquisto ciascuno. N = 2 se il nodo stesso ha gia'
--        registrato una vendita/acquisto, altrimenti N = 10.
--        Il rank e' sempre ricalcolato dal vivo (non memorizzato): se un
--        nodo con gia' alcuni diretti-che-comprano registra a sua volta un
--        acquisto, la soglia richiesta scende istantaneamente da 10 a 2 e
--        il nodo puo' diventare VIP nello stesso momento, senza bisogno di
--        nuove iscrizioni.
--   Royal: il nodo ha almeno 10 discendenti (in TUTTO il sotto-albero
--        strutturale, non solo i figli diretti) che sono gia' VIP o Royal.
--   L'azienda (activity_code = 0) e' sempre Royal, incondizionatamente.
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
  override_rank text;
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

    if override_rank is not null then
      computed_rank := override_rank;
    elsif r.activity_code = 0 then
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
