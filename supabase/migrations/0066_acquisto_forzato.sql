-- ACQUISTO FORZATO: decidere a mano se un membro "ha comprato"
--
-- La soglia per diventare VIP dipende da un fatto: se il membro ha comprato
-- almeno una volta gli bastano 2 diretti che hanno comprato, altrimenti ne
-- servono 10. Fin qui il fatto si leggeva solo dalle vendite registrate.
--
-- Il problema: un acquisto pagato fuori dal negozio (bonifico gestito a
-- mano, iscritti di prima dello shop) non lascia nessuna riga in sales, e
-- quella persona resta a 10 pur avendo pagato. Serviva un modo per dirlo al
-- sistema, come si fa gia' con il rank forzato.
--
-- Il forzato vale in ENTRAMBI i punti in cui il calcolo guarda l'acquisto:
-- abbassa la soglia della persona stessa E la fa contare tra i diretti che
-- hanno comprato del suo sponsor. Cosi' si comporta esattamente come un
-- acquisto vero, che e' il senso di poterlo forzare.
--
-- Vale nei due sensi: si puo' anche togliere un acquisto realmente
-- registrato (per esempio un ordine poi rimborsato).

create table if not exists member_purchase_overrides (
  activity_code integer primary key references members(activity_code) on delete cascade,
  bought boolean not null,
  set_by integer not null references members(activity_code),
  set_at timestamptz not null default now()
);

comment on table member_purchase_overrides is
  'Forza il fatto "ha comprato" usato dalle soglie VIP, quando le vendite registrate non lo raccontano.';

alter table member_purchase_overrides enable row level security;

drop policy if exists member_purchase_overrides_select on member_purchase_overrides;
create policy member_purchase_overrides_select on member_purchase_overrides
  for select using (current_member_code() = 0 or activity_code = current_member_code());

-- === Calcolo dei rank ======================================================
-- Unica modifica rispetto a prima: chi conta come "ha comprato" si decide
-- una volta sola all'inizio, tenendo conto del forzato. Prima la stessa
-- domanda veniva rifatta a ogni giro del ciclo.
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
  acquirenti integer[];
begin
  -- Il forzato, quando c'e', vince sulle vendite registrate.
  select coalesce(array_agg(m.activity_code), '{}')
    into acquirenti
  from members m
  left join member_purchase_overrides o on o.activity_code = m.activity_code
  where coalesce(o.bought, exists (select 1 from sales s where s.seller_code = m.activity_code));

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
        and m.activity_code = any(acquirenti);

      required := case
        when r.activity_code = any(acquirenti) then 2
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

-- === Comando dal centro di controllo ======================================
-- p_bought null = torna al calcolo automatico.
create or replace function public.admin_set_purchase_override(
  p_target_code integer,
  p_bought boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_target_code = 0 then
    raise exception 'L''account aziendale e sempre Royal: forzare il suo acquisto non cambia nulla';
  end if;
  if not exists (select 1 from members where activity_code = p_target_code) then
    raise exception 'Membro % non trovato', p_target_code;
  end if;

  if p_bought is null then
    delete from member_purchase_overrides where activity_code = p_target_code;
    perform log_admin_action('purchase_override_cleared', p_target_code, null);
  else
    insert into member_purchase_overrides (activity_code, bought, set_by, set_at)
    values (p_target_code, p_bought, caller, now())
    on conflict (activity_code) do update set
      bought = excluded.bought,
      set_by = excluded.set_by,
      set_at = now();
    perform log_admin_action('purchase_override_set', p_target_code, jsonb_build_object('bought', p_bought));
  end if;
end;
$function$;

revoke all on function public.admin_set_purchase_override(integer, boolean) from public, anon;
grant execute on function public.admin_set_purchase_override(integer, boolean) to authenticated;
