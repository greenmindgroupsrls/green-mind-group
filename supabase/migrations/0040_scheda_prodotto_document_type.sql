-- Nuova voce nell'elenco Documenti: "Scheda Prodotto".
insert into marketing_documents (doc_type)
values ('scheda_prodotto')
on conflict (doc_type) do nothing;

create or replace function admin_set_marketing_document(p_doc_type text, p_file_url text, p_file_name text)
returns marketing_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated marketing_documents;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_doc_type not in ('privacy', 'modulo_ordine', 'contratto_incaricato', 'presentazione', 'flyer', 'business_card', 'piano_compensi', 'scheda_prodotto') then
    raise exception 'Tipo documento non valido';
  end if;

  update marketing_documents set
    file_url = p_file_url,
    file_name = p_file_name,
    updated_at = now(),
    updated_by = caller
  where doc_type = p_doc_type
  returning * into updated;

  perform log_admin_action(
    'marketing_document_updated',
    null,
    jsonb_build_object('doc_type', p_doc_type, 'file_name', p_file_name)
  );

  return updated;
end;
$$;

revoke all on function admin_set_marketing_document(text, text, text) from public, anon;
grant execute on function admin_set_marketing_document(text, text, text) to authenticated;
