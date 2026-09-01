-- Un incaricato con il profilo incompleto (niente codice fiscale/P.IVA,
-- telefono o data di nascita — dati che servono per la tracciabilità fiscale
-- del prelievo) non deve poter richiedere un prelievo. Il controllo vero e
-- vincolante sta qui (RPC), non solo lato UI: create_withdrawal_request lo
-- richiama prima di inserire la richiesta.

create or replace function is_profile_complete(p_activity_code integer default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target integer := coalesce(p_activity_code, current_member_code());
  m members;
  p member_profiles;
begin
  if target is null then
    return false;
  end if;

  select * into m from members where activity_code = target;
  if m is null or coalesce(trim(m.first_name), '') = '' or coalesce(trim(m.last_name), '') = '' then
    return false;
  end if;

  select * into p from member_profiles where activity_code = target;
  if p is null then
    return false;
  end if;

  if coalesce(trim(p.tax_id), '') = ''
     or coalesce(trim(p.phone_number), '') = ''
     or p.date_of_birth is null
  then
    return false;
  end if;

  if p.account_type = 'company'
     and (coalesce(trim(p.company_name), '') = '' or coalesce(trim(p.sdi_code), '') = '')
  then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function is_profile_complete(integer) from public, anon;
grant execute on function is_profile_complete(integer) to authenticated;

create or replace function create_withdrawal_request(
  p_amount numeric,
  p_bank_name text,
  p_iban text,
  p_account_type text,
  p_swift_code text
)
returns withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  earned numeric;
  already_withdrawn numeric;
  available numeric;
  fixed_charge constant numeric := 3.00;
  net numeric;
  new_request withdrawal_requests;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per richiedere un prelievo';
  end if;
  if not is_profile_complete(caller) then
    raise exception 'Completa le informazioni del tuo profilo prima di richiedere un prelievo';
  end if;
  if p_amount is null or p_amount < 10 then
    raise exception 'L''importo minimo di prelievo è 10€';
  end if;
  if p_bank_name is null or trim(p_bank_name) = '' then
    raise exception 'Nome banca e indirizzo obbligatori';
  end if;
  if p_iban is null or trim(p_iban) = '' then
    raise exception 'IBAN obbligatorio';
  end if;

  select coalesce(sum(amount), 0) into earned
  from commission_entries where beneficiary_code = caller;

  select coalesce(sum(net_amount), 0) into already_withdrawn
  from withdrawal_requests where activity_code = caller and status <> 'rejected';

  available := earned - already_withdrawn;

  if p_amount > available then
    raise exception 'Importo superiore al saldo disponibile (% disponibili)', available;
  end if;

  net := p_amount - fixed_charge;

  insert into withdrawal_requests (
    activity_code, amount, charges, tax, net_amount, bank_name, iban, account_type, swift_code
  )
  values (
    caller, p_amount, fixed_charge, 0, net,
    trim(p_bank_name), trim(p_iban), nullif(trim(p_account_type), ''), nullif(trim(p_swift_code), '')
  )
  returning * into new_request;

  return new_request;
end;
$$;
