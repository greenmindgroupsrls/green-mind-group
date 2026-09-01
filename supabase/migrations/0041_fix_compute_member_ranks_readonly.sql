-- BUG CRITICO: compute_member_ranks() usava "create temporary table", che e' una
-- operazione DDL. PostgREST (lo strato REST usato da tutte le query
-- supabase.from(...).select(...) dell'app) esegue sempre le richieste GET dentro una
-- transazione READ ONLY. Qualsiasi query verso la vista member_ranks fatta dall'app
-- reale (Team, Centro di controllo, ecc.) falliva quindi silenziosamente con errore
-- "cannot execute CREATE TABLE in a read-only transaction", e il codice frontend
-- ricadeva su un oggetto ranks vuoto -> ogni membro (root incluso) mostrato come
-- "Standard". Le verifiche fatte durante lo sviluppo usavano sempre connessioni SQL
-- dirette (non PostgREST), che non hanno questa restrizione, motivo per cui il bug
-- non era mai emerso prima d'ora.
--
-- Fix: stessa identica logica di business, ma senza alcuna tabella temporanea.
-- La closure (antenato -> discendenti) e i rank gia' calcolati vengono tenuti in
-- variabili PL/pgSQL (jsonb), non in tabelle: nessuna operazione di scrittura SQL,
-- quindi compatibile con le transazioni read-only.
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
$$;
