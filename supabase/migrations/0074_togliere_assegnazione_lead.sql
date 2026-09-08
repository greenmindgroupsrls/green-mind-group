-- TOGLIERE UN LEAD A CHI L'AVEVA
--
-- Dalla pagina Lead si poteva riassegnare, non liberare: la tendina proponeva
-- solo altri membri. Un lead dato per sbaglio restava addosso a qualcuno per
-- sempre, e l'unico modo per toglierlo era mettere le mani nel database -
-- cioe' chiamare qualcuno che le sappia mettere.
--
-- La copia dell'incaricato sparisce solo se non l'aveva toccata: stessa
-- regola della riassegnazione. Se ci aveva scritto una nota o cambiato
-- stato, quel lavoro resta suo e il contatto rimane nella sua agenda.
--
-- Liberare non e' cancellare: il lead torna nell'elenco aziendale senza
-- padrone, pronto per qualcun altro. A cancellarlo ci pensa il cestino, che
-- da 0073 lo toglie anche a chi ce l'aveva.
create or replace function public.admin_unassign_lead(p_id bigint)
returns leads
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
  precedente integer;
  updated leads;
begin
  if caller is null or caller <> 0 then
    raise exception 'gmg.non_autorizzato';
  end if;

  select assigned_to into precedente from leads where id = p_id;
  if precedente is null then
    -- gia' libero: non e' un errore, non c'e' niente da fare
    select * into updated from leads where id = p_id;
    return updated;
  end if;

  update leads set assigned_to = null, assigned_at = null, updated_at = now()
  where id = p_id
  returning * into updated;

  delete from crm_contacts
  where lead_id = p_id
    and owner_code = precedente
    and status = 'da_chiamare';

  perform log_admin_action('lead_unassigned', precedente,
    jsonb_build_object('lead_id', p_id));

  return updated;
end;
$function$;

revoke all on function public.admin_unassign_lead(bigint) from public, anon;
grant execute on function public.admin_unassign_lead(bigint) to authenticated;
