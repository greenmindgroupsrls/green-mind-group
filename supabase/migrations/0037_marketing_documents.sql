-- Documenti marketing per gli incaricati: 6 slot fissi (privacy, modulo
-- d'ordine, contratto incaricato, presentazione, flyer, business card).
-- Root carica/sostituisce il file di ciascuno slot da /marketing/documenti;
-- tutti gli incaricati vedono sempre l'ultima versione. Stesso pattern
-- architetturale di events/announcements: contenuto root-authored,
-- select aperta a tutti, scritture solo via funzione root-gated.
create table if not exists marketing_documents (
  doc_type text primary key,
  file_url text,
  file_name text,
  updated_at timestamptz,
  updated_by integer references members (activity_code)
);

insert into marketing_documents (doc_type) values
  ('privacy'),
  ('modulo_ordine'),
  ('contratto_incaricato'),
  ('presentazione'),
  ('flyer'),
  ('business_card')
on conflict (doc_type) do nothing;

alter table marketing_documents enable row level security;

drop policy if exists marketing_documents_select on marketing_documents;
create policy marketing_documents_select on marketing_documents
  for select using (true);

-- Nessuna policy insert/update/delete: solo via la funzione sotto.

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
  if p_doc_type not in ('privacy', 'modulo_ordine', 'contratto_incaricato', 'presentazione', 'flyer', 'business_card') then
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

-- Storage: bucket pubblico in lettura (i link diretti devono funzionare
-- per il download), scrittura riservata all'azienda — stesso pattern di
-- event-photos.
insert into storage.buckets (id, name, public)
values ('marketing-documents', 'marketing-documents', true)
on conflict (id) do nothing;

drop policy if exists marketing_documents_public_select on storage.objects;
create policy marketing_documents_public_select on storage.objects
  for select using (bucket_id = 'marketing-documents');

drop policy if exists marketing_documents_root_insert on storage.objects;
create policy marketing_documents_root_insert on storage.objects
  for insert with check (bucket_id = 'marketing-documents' and current_member_code() = 0);

drop policy if exists marketing_documents_root_update on storage.objects;
create policy marketing_documents_root_update on storage.objects
  for update using (bucket_id = 'marketing-documents' and current_member_code() = 0);
