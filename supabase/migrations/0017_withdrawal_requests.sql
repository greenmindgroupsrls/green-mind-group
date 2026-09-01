-- Richieste di prelievo dal portafoglio commissioni. Nessuna commissione/tassa
-- per ora (net_amount = amount), soglia minima 10€, nessun massimo oltre al
-- saldo disponibile. Il pagamento vero avviene fuori sistema (bonifico
-- manuale da parte dell'azienda): qui si registra solo la richiesta e il suo
-- stato (pending/paid/rejected), stesso spirito dei ticket di Support.

create table if not exists withdrawal_requests (
  id bigserial primary key,
  activity_code integer not null references members (activity_code),
  amount numeric(12, 2) not null,
  charges numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null,
  bank_name text not null,
  iban text not null,
  account_type text,
  swift_code text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by integer references members (activity_code)
);

create index if not exists withdrawal_requests_activity_code_idx on withdrawal_requests (activity_code);

alter table withdrawal_requests enable row level security;

drop policy if exists withdrawal_requests_select on withdrawal_requests;
create policy withdrawal_requests_select on withdrawal_requests
  for select
  using (activity_code = current_member_code() or current_member_code() = 0);

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

  insert into withdrawal_requests (
    activity_code, amount, charges, tax, net_amount, bank_name, iban, account_type, swift_code
  )
  values (
    caller, p_amount, 0, 0, p_amount,
    trim(p_bank_name), trim(p_iban), nullif(trim(p_account_type), ''), nullif(trim(p_swift_code), '')
  )
  returning * into new_request;

  return new_request;
end;
$$;

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

  return updated;
end;
$$;

revoke all on function create_withdrawal_request(numeric, text, text, text, text) from public, anon;
grant execute on function create_withdrawal_request(numeric, text, text, text, text) to authenticated;

revoke all on function update_withdrawal_status(bigint, text) from public, anon;
grant execute on function update_withdrawal_status(bigint, text) to authenticated;
