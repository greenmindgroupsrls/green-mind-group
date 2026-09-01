-- "Centro di controllo": pannello riservato all'account aziendale (root,
-- activity_code 0) per vedere e correggere qualunque membro della rete.
-- Su richiesta esplicita dell'utente, in questa prima versione copre SOLO:
-- (1) dati anagrafici, (2) rank forzato a mano (bypassando le regole
-- normali VIP/Royal). Deliberatamente escluso: cambio ruolo
-- cliente/incaricato, riposizionamento nell'albero, reset password — non
-- richiesti in questo giro.

-- 1) Override manuale del rank: se presente, vince sempre sul calcolo
-- automatico, e siccome viene applicato DENTRO compute_member_ranks()
-- prima di scrivere il risultato nella tabella temporanea che gli
-- antenati leggono per il proprio conteggio Royal, si propaga
-- correttamente anche a chi sta sopra (un override a "royal" conta come
-- royal vero per il calcolo Royal di chi sta sopra) e a find_pass_up_target
-- (che si appoggia alla stessa funzione).
create table if not exists member_rank_overrides (
  activity_code integer primary key references members (activity_code),
  rank text not null check (rank in ('standard', 'vip', 'royal')),
  set_by integer not null references members (activity_code),
  set_at timestamptz not null default now()
);

alter table member_rank_overrides enable row level security;

drop policy if exists member_rank_overrides_select on member_rank_overrides;
create policy member_rank_overrides_select on member_rank_overrides
  for select using (current_member_code() = 0 or activity_code = current_member_code());

-- Nessuna policy insert/update/delete: le scritture passano solo da
-- admin_set_rank_override() (root-only), stesso pattern di
-- announcements/withdrawal-status per dati con effetto non solo personale.

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

revoke all on function compute_member_ranks() from public, anon, authenticated;
grant execute on function compute_member_ranks() to authenticated;

create or replace function admin_set_rank_override(p_target_code integer, p_rank text)
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
  if p_target_code = 0 then
    raise exception 'Non è possibile forzare il rank dell''account aziendale';
  end if;
  if not exists (select 1 from members where activity_code = p_target_code) then
    raise exception 'Membro % non trovato', p_target_code;
  end if;

  if p_rank is null then
    delete from member_rank_overrides where activity_code = p_target_code;
  else
    if p_rank not in ('standard', 'vip', 'royal') then
      raise exception 'Rank non valido';
    end if;
    insert into member_rank_overrides (activity_code, rank, set_by, set_at)
    values (p_target_code, p_rank, caller, now())
    on conflict (activity_code) do update set
      rank = excluded.rank,
      set_by = excluded.set_by,
      set_at = now();
  end if;
end;
$$;

revoke all on function admin_set_rank_override(integer, text) from public, anon;
grant execute on function admin_set_rank_override(integer, text) to authenticated;

-- 2) Modifica anagrafica di un membro qualsiasi, da parte dell'azienda.
-- Email di login ESCLUSA di proposito: members.email è solo un campo
-- informativo, l'email di accesso vera vive in auth.users e va cambiata
-- con l'Admin API di Supabase (fatto lato server action, non qui).
create or replace function admin_update_member_profile(
  p_target_code integer,
  p_first_name text default null,
  p_last_name text default null,
  p_phone_country_code text default null,
  p_phone_number text default null,
  p_tax_id text default null,
  p_company_name text default null,
  p_account_type text default null
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
  if not exists (select 1 from members where activity_code = p_target_code) then
    raise exception 'Membro % non trovato', p_target_code;
  end if;

  update members set
    first_name = coalesce(p_first_name, first_name),
    last_name = coalesce(p_last_name, last_name)
  where activity_code = p_target_code;

  insert into member_profiles (activity_code, account_type, phone_country_code, phone_number, tax_id, company_name)
  values (p_target_code, coalesce(p_account_type, 'individual'), p_phone_country_code, p_phone_number, p_tax_id, p_company_name)
  on conflict (activity_code) do update set
    account_type = coalesce(p_account_type, member_profiles.account_type),
    phone_country_code = coalesce(p_phone_country_code, member_profiles.phone_country_code),
    phone_number = coalesce(p_phone_number, member_profiles.phone_number),
    tax_id = coalesce(p_tax_id, member_profiles.tax_id),
    company_name = coalesce(p_company_name, member_profiles.company_name),
    updated_at = now();
end;
$$;

revoke all on function admin_update_member_profile(integer, text, text, text, text, text, text, text) from public, anon;
grant execute on function admin_update_member_profile(integer, text, text, text, text, text, text, text) to authenticated;
