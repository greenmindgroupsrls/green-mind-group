-- Permette all'azienda (root) di inoltrare un lead a un incaricato della
-- rete: registra l'assegnazione sul lead stesso e manda una notifica reale
-- (messaggio in-app, stesso sistema già usato per referral/commissioni) al
-- membro scelto, con i dati di contatto del lead da richiamare.

alter table leads add column if not exists assigned_to integer references members (activity_code);
alter table leads add column if not exists assigned_at timestamptz;

create or replace function admin_assign_lead(p_id bigint, p_member_code integer)
returns leads
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  caller_username text;
  target_username text;
  updated leads;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;

  select username into caller_username from members where activity_code = caller;
  select username into target_username from members where activity_code = p_member_code;
  if target_username is null then
    raise exception 'Membro % non trovato', p_member_code;
  end if;

  update leads set
    assigned_to = p_member_code,
    assigned_at = now(),
    updated_at = now()
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Lead % non trovato', p_id;
  end if;

  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (
    caller,
    caller_username,
    p_member_code,
    target_username,
    'Nuovo lead da seguire',
    format(
      'Ti è stato assegnato un contatto da richiamare: %s — tel. %s — email %s%s',
      updated.name,
      updated.phone,
      updated.email,
      case
        when updated.requested_date is not null
          then format(' — richiesta per il %s alle %s', updated.requested_date, coalesce(updated.requested_time, ''))
        else ''
      end
    )
  );

  perform log_admin_action('lead_assigned', p_member_code, jsonb_build_object('lead_id', updated.id));

  return updated;
end;
$$;

revoke all on function admin_assign_lead(bigint, integer) from public, anon;
grant execute on function admin_assign_lead(bigint, integer) to authenticated;
