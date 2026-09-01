-- Registro delle azioni amministrative: chi (sempre root, oggi l'unico
-- ruolo che può fare queste azioni) ha fatto cosa, quando, su chi.
-- Sola lettura per root; le scritture passano solo da log_admin_action(),
-- chiamata internamente dalle funzioni admin già root-gated (mai
-- esposta per scritture dirette da parte del client).
create table if not exists admin_audit_log (
  id bigserial primary key,
  actor_code integer not null references members (activity_code),
  action_type text not null,
  target_code integer references members (activity_code),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_code_idx on admin_audit_log (target_code);

alter table admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on admin_audit_log;
create policy admin_audit_log_select on admin_audit_log
  for select using (current_member_code() = 0);

create or replace function log_admin_action(p_action_type text, p_target_code integer, p_details jsonb)
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

  insert into admin_audit_log (actor_code, action_type, target_code, details)
  values (caller, p_action_type, p_target_code, p_details);
end;
$$;

revoke all on function log_admin_action(text, integer, jsonb) from public, anon;
grant execute on function log_admin_action(text, integer, jsonb) to authenticated;

-- Da qui in giù: le stesse 6 funzioni admin già esistenti, corpo
-- identico, con l'aggiunta di una chiamata a log_admin_action() dopo
-- che la scrittura è andata a buon fine.

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
    perform log_admin_action('rank_override_cleared', p_target_code, null);
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
    perform log_admin_action('rank_override_set', p_target_code, jsonb_build_object('rank', p_rank));
  end if;
end;
$$;

revoke all on function admin_set_rank_override(integer, text) from public, anon;
grant execute on function admin_set_rank_override(integer, text) to authenticated;

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

  perform log_admin_action('member_profile_updated', p_target_code, jsonb_strip_nulls(jsonb_build_object(
    'first_name', p_first_name,
    'last_name', p_last_name,
    'phone_country_code', p_phone_country_code,
    'phone_number', p_phone_number,
    'tax_id', p_tax_id,
    'company_name', p_company_name,
    'account_type', p_account_type
  )));
end;
$$;

revoke all on function admin_update_member_profile(integer, text, text, text, text, text, text, text) from public, anon;
grant execute on function admin_update_member_profile(integer, text, text, text, text, text, text, text) to authenticated;

create or replace function update_withdrawal_status(p_id bigint, p_status text)
returns withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated withdrawal_requests;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_status not in ('pending', 'paid', 'rejected') then
    raise exception 'Stato non valido';
  end if;

  update withdrawal_requests
  set status = p_status,
      processed_at = case when p_status = 'pending' then null else now() end,
      processed_by = case when p_status = 'pending' then null else caller end
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Richiesta % non trovata', p_id;
  end if;

  perform log_admin_action('withdrawal_status_updated', updated.activity_code, jsonb_build_object(
    'withdrawal_id', updated.id,
    'status', p_status,
    'amount', updated.amount
  ));

  return updated;
end;
$$;

revoke all on function update_withdrawal_status(bigint, text) from public, anon;
grant execute on function update_withdrawal_status(bigint, text) to authenticated;

create or replace function set_shop_order_status(p_id bigint, p_status text)
returns shop_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated shop_orders;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_status not in ('pending', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Stato non valido';
  end if;

  update shop_orders
  set status = p_status
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Ordine % non trovato', p_id;
  end if;

  perform log_admin_action('shop_order_status_updated', updated.buyer_code, jsonb_build_object(
    'order_id', updated.id,
    'status', p_status
  ));

  return updated;
end;
$$;

revoke all on function set_shop_order_status(bigint, text) from public, anon;
grant execute on function set_shop_order_status(bigint, text) to authenticated;

create or replace function create_announcement(p_title text, p_body text)
returns announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  new_announcement announcements;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'Titolo obbligatorio';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'Testo obbligatorio';
  end if;

  insert into announcements (title, body, created_by)
  values (trim(p_title), trim(p_body), caller)
  returning * into new_announcement;

  perform log_admin_action('announcement_created', null, jsonb_build_object('title', new_announcement.title));

  return new_announcement;
end;
$$;

revoke all on function create_announcement(text, text) from public, anon;
grant execute on function create_announcement(text, text) to authenticated;

create or replace function delete_event(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  removed events;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;

  delete from events where id = p_id returning * into removed;

  if removed is not null then
    perform log_admin_action('event_deleted', null, jsonb_build_object('city', removed.city, 'event_date', removed.event_date));
  end if;
end;
$$;

revoke all on function delete_event(bigint) from public, anon;
grant execute on function delete_event(bigint) to authenticated;
