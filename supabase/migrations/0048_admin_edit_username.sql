-- Permette all'azienda (root) di cambiare l'username di un membro dal
-- Centro di controllo, per i casi in cui qualcuno scelga un nome poco
-- appropriato in fase di registrazione. Stesso overload esplicito già usato
-- altrove nel progetto quando si aggiunge un parametro a una funzione RPC
-- esistente, per evitare che PostgREST veda due firme ambigue.

drop function if exists admin_update_member_profile(integer, text, text, text, text, text, text, text);

create or replace function admin_update_member_profile(
  p_target_code integer,
  p_first_name text default null,
  p_last_name text default null,
  p_phone_country_code text default null,
  p_phone_number text default null,
  p_tax_id text default null,
  p_company_name text default null,
  p_account_type text default null,
  p_username text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  normalized_username text;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if not exists (select 1 from members where activity_code = p_target_code) then
    raise exception 'Membro % non trovato', p_target_code;
  end if;

  if p_username is not null then
    normalized_username := trim(p_username);
    if normalized_username = '' then
      raise exception 'Lo username non può essere vuoto';
    end if;
    if exists (
      select 1 from members
      where username = normalized_username and activity_code <> p_target_code
    ) then
      raise exception 'Username già in uso da un altro membro';
    end if;
  end if;

  update members set
    first_name = coalesce(p_first_name, first_name),
    last_name = coalesce(p_last_name, last_name),
    username = coalesce(normalized_username, username)
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
    'account_type', p_account_type,
    'username', normalized_username
  )));
end;
$$;

revoke all on function admin_update_member_profile(integer, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function admin_update_member_profile(integer, text, text, text, text, text, text, text, text) to authenticated;
