-- Il "Business Card" non è un file statico come gli altri 5 documenti:
-- ogni incaricato scarica un PDF generato al volo (fronte con i propri
-- dati anagrafici sovrapposti al template senza logo, retro con logo
-- invariato). Qui salviamo solo i 2 template caricati da root; la
-- generazione vera e propria avviene in /api/marketing/business-card
-- (Next.js, usa pdf-lib — Postgres non genera PDF).
alter table marketing_documents add column if not exists template_front_url text;
alter table marketing_documents add column if not exists template_back_url text;

create or replace function admin_set_business_card_template(p_side text, p_file_url text, p_file_name text)
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
  if p_side not in ('front', 'back') then
    raise exception 'Lato non valido';
  end if;

  if p_side = 'front' then
    update marketing_documents set
      template_front_url = p_file_url,
      updated_at = now(),
      updated_by = caller
    where doc_type = 'business_card'
    returning * into updated;
  else
    update marketing_documents set
      template_back_url = p_file_url,
      updated_at = now(),
      updated_by = caller
    where doc_type = 'business_card'
    returning * into updated;
  end if;

  perform log_admin_action(
    'marketing_document_updated',
    null,
    jsonb_build_object('doc_type', 'business_card', 'side', p_side, 'file_name', p_file_name)
  );

  return updated;
end;
$$;

revoke all on function admin_set_business_card_template(text, text, text) from public, anon;
grant execute on function admin_set_business_card_template(text, text, text) to authenticated;
