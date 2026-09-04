-- Cancellare un lead serve: dal sito arrivano anche registrazioni false, e
-- lasciarle in elenco sporca il lavoro di chi deve richiamare.
--
-- La cancellazione e' definitiva: la puo' fare solo l'azienda, e prima di
-- sparire il lead viene copiato nel registro delle azioni. Resta traccia di
-- cosa e' stato eliminato e da chi, senza tenere il dato in una tabella
-- "cestino" che nessuno svuoterebbe mai (e che sarebbe un problema in piu'
-- per la protezione dei dati personali).
create or replace function public.admin_delete_lead(p_lead_id bigint)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  vittima leads;
begin
  if chiamante is null or chiamante <> 0 then
    raise exception 'Non autorizzato';
  end if;

  select * into vittima from leads where id = p_lead_id;
  if vittima.id is null then
    raise exception 'Lead non trovato';
  end if;

  insert into admin_audit_log (actor_code, action_type, target_code, details)
  values (chiamante, 'lead_deleted', vittima.assigned_to,
    jsonb_build_object(
      'id', vittima.id,
      'nome', vittima.name,
      'email', vittima.email,
      'telefono', vittima.phone,
      'origine', vittima.source,
      'stato', vittima.status,
      'ricevuto_il', vittima.created_at
    ));

  delete from leads where id = p_lead_id;
  return true;
end;
$function$;

revoke execute on function public.admin_delete_lead(bigint) from anon;
