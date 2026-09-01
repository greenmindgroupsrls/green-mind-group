-- Contratto di nomina a Incaricato alle Vendite (Legge 173/2005) compilato e
-- accettato online, dentro il flusso /diventa-incaricato.
--
-- L'accettazione avviene con spunte (firma elettronica semplice), come
-- deciso dall'azienda. Per dare a quella firma il massimo peso probatorio
-- possibile registriamo prove puntuali: data e ora, indirizzo IP, browser,
-- la versione esatta del testo accettato e le TRE accettazioni separate
-- (contratto, clausole 1341/1342 c.c., dichiarazioni referente), non una
-- sola spunta cumulativa.
--
-- NOTA LEGALE segnalata all'azienda: l'art. 1341 c.c. richiede
-- l'approvazione specifica "per iscritto" delle clausole onerose e la
-- giurisprudenza in materia e' severa sul valore della spunta online.
-- Questa scelta e' stata confermata dall'azienda il 01/09/2026.

create table if not exists incaricato_contracts (
  id bigserial primary key,
  activity_code integer not null unique references members (activity_code),

  -- dati anagrafici richiesti dal contratto ma non presenti a sistema
  birth_place text not null,
  citizenship text not null,
  profession text,
  document_type text not null,
  document_number text not null,

  -- riferimenti bancari per l'accredito delle provvigioni
  bank_name text,
  bank_holder text,
  iban text,
  swift text,

  -- Dichiarazioni Referente (lettere a-d del contratto; la lettera e) e'
  -- una dichiarazione unica, coperta da accepted_declarations)
  decl_other_companies boolean not null,
  decl_has_vat boolean not null,
  decl_inps_exceeded boolean not null,
  decl_public_employee boolean not null,

  signing_place text not null,

  -- le tre accettazioni, tenute distinte apposta
  accepted_contract boolean not null,
  accepted_clauses_1341 boolean not null,
  accepted_declarations boolean not null,

  -- prova dell'accettazione
  contract_version text not null,
  signed_at timestamptz not null default now(),
  signed_ip text,
  signed_user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists incaricato_contracts_activity_code_idx
  on incaricato_contracts (activity_code);

alter table incaricato_contracts enable row level security;

-- Ognuno vede solo il proprio contratto; l'azienda li vede tutti.
drop policy if exists incaricato_contracts_select on incaricato_contracts;
create policy incaricato_contracts_select on incaricato_contracts
  for select using (activity_code = current_member_code() or current_member_code() = 0);

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
  p_signed_user_agent text default null
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

  -- campi indispensabili al contratto: senza, il documento generato
  -- risulterebbe incompleto
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

  insert into incaricato_contracts (
    activity_code, birth_place, citizenship, profession,
    document_type, document_number,
    bank_name, bank_holder, iban, swift,
    decl_other_companies, decl_has_vat, decl_inps_exceeded, decl_public_employee,
    signing_place,
    accepted_contract, accepted_clauses_1341, accepted_declarations,
    contract_version, signed_ip, signed_user_agent
  ) values (
    caller, btrim(p_birth_place), btrim(p_citizenship), nullif(btrim(p_profession), ''),
    btrim(p_document_type), btrim(p_document_number),
    nullif(btrim(p_bank_name), ''), nullif(btrim(p_bank_holder), ''),
    nullif(btrim(p_iban), ''), nullif(btrim(p_swift), ''),
    p_decl_other_companies, p_decl_has_vat, p_decl_inps_exceeded, p_decl_public_employee,
    btrim(p_signing_place),
    true, true, true,
    p_contract_version, p_signed_ip, p_signed_user_agent
  )
  returning * into new_contract;

  -- Attivazione a incaricato: stessa logica di become_incaricato(), qui
  -- pero' contestuale alla firma, cosi' non si puo' diventare incaricato
  -- senza contratto ne' firmare senza essere attivati.
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

revoke all on function sign_incaricato_contract(text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, text, text) from public, anon;
grant execute on function sign_incaricato_contract(text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, text, text, text, text) to authenticated;
