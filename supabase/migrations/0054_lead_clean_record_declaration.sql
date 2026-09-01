-- La dichiarazione (e) del contratto (assenza di fallimenti, condanne,
-- carichi pendenti e misure di prevenzione) era coperta solo dalla spunta
-- cumulativa accepted_declarations. Ora ha una spunta dedicata nel form:
-- va registrata a parte, perche' su una dichiarazione di questo peso
-- "risulta affermata esplicitamente" vale piu' di "era inclusa in un
-- gruppo".
--
-- Deve essere sempre true: senza, il contratto non si puo' firmare.

alter table incaricato_contracts
  add column if not exists decl_clean_record boolean not null default true;

drop function if exists sign_incaricato_contract(text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, text, text);

create or replace function sign_incaricato_contract(
  p_birth_place text,
  p_citizenship text,
  p_profession text,
  p_document_type text,
  p_document_number text,
  p_bank_name text,
  p_bank_holder text,
  p_iban text,
  p_swift text,
  p_decl_other_companies boolean,
  p_decl_has_vat boolean,
  p_decl_inps_exceeded boolean,
  p_decl_public_employee boolean,
  p_signing_place text,
  p_contract_version text,
  p_signed_ip text default null,
  p_signed_user_agent text default null,
  p_decl_clean_record boolean default false
)
returns incaricato_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  caller_username text;
  new_contract incaricato_contracts;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per firmare il contratto';
  end if;

  if exists (select 1 from incaricato_contracts where activity_code = caller) then
    raise exception 'Hai gia'' firmato il contratto di incaricato';
  end if;

  if coalesce(btrim(p_birth_place), '') = '' then
    raise exception 'Il luogo di nascita e'' obbligatorio';
  end if;
  if coalesce(btrim(p_citizenship), '') = '' then
    raise exception 'La cittadinanza e'' obbligatoria';
  end if;
  if coalesce(btrim(p_document_type), '') = '' or coalesce(btrim(p_document_number), '') = '' then
    raise exception 'Gli estremi del documento d''identita'' sono obbligatori';
  end if;
  if coalesce(btrim(p_signing_place), '') = '' then
    raise exception 'Il luogo di firma e'' obbligatorio';
  end if;
  if p_decl_clean_record is not true then
    raise exception 'Devi confermare la dichiarazione sui carichi pendenti';
  end if;

  insert into incaricato_contracts (
    activity_code, birth_place, citizenship, profession,
    document_type, document_number,
    bank_name, bank_holder, iban, swift,
    decl_other_companies, decl_has_vat, decl_inps_exceeded, decl_public_employee,
    decl_clean_record,
    signing_place,
    accepted_contract, accepted_clauses_1341, accepted_declarations,
    contract_version, signed_ip, signed_user_agent
  ) values (
    caller, btrim(p_birth_place), btrim(p_citizenship), nullif(btrim(p_profession), ''),
    btrim(p_document_type), btrim(p_document_number),
    nullif(btrim(p_bank_name), ''), nullif(btrim(p_bank_holder), ''),
    nullif(btrim(p_iban), ''), nullif(btrim(p_swift), ''),
    p_decl_other_companies, p_decl_has_vat, p_decl_inps_exceeded, p_decl_public_employee,
    true,
    btrim(p_signing_place),
    true, true, true,
    p_contract_version, p_signed_ip, p_signed_user_agent
  )
  returning * into new_contract;

  update members set role = 'incaricato' where activity_code = caller;
  update member_profiles set incaricato_accepted_at = now() where activity_code = caller;

  select username into caller_username from members where activity_code = caller;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (
    caller, coalesce(caller_username, ''), 0, 'azienda',
    'Nuovo contratto incaricato firmato',
    format('%s ha compilato e accettato il contratto di Incaricato alle Vendite.', coalesce(caller_username, 'Un membro'))
  );

  return new_contract;
end;
$$;

revoke all on function sign_incaricato_contract(text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean) from public, anon;
grant execute on function sign_incaricato_contract(text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean) to authenticated;
