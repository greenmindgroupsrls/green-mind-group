-- Il certificato di attribuzione della partita IVA va conservato insieme
-- agli altri documenti d'identita': stesso bucket privato kyc-documents,
-- stessa cartella per codice attivita', stesse regole di accesso
-- (l'incaricato vede solo i propri, l'azienda tutti). Non serve nulla di
-- nuovo, solo un tipo in piu'.
alter table member_kyc_documents
  drop constraint member_kyc_documents_doc_type_check;

alter table member_kyc_documents
  add constraint member_kyc_documents_doc_type_check
  check (doc_type in ('id_proof', 'utility_bill', 'account_statement', 'vat_certificate'));

create or replace function public.register_kyc_document(p_doc_type text, p_storage_path text)
returns member_kyc_documents
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
  result member_kyc_documents;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per caricare un documento';
  end if;
  if p_doc_type not in ('id_proof', 'utility_bill', 'account_statement', 'vat_certificate') then
    raise exception 'Tipo documento non valido';
  end if;

  insert into member_kyc_documents (activity_code, doc_type, storage_path)
  values (caller, p_doc_type, p_storage_path)
  on conflict (activity_code, doc_type) do update set
    storage_path = p_storage_path,
    uploaded_at = now()
  returning * into result;

  return result;
end;
$function$;
