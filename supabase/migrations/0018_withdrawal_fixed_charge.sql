-- Commissione fissa di prelievo: 3€ per richiesta (prima era 0). Il netto
-- ricevuto scende di conseguenza (net_amount = amount - 3), la soglia minima
-- di richiesta resta 10€ lorde (quindi il netto minimo è 7€).

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
