-- Calendario appuntamenti in Marketing > Lead.
--
-- requested_date/requested_time sono cio' che il CLIENTE ha chiesto dal
-- sito Vortix. L'appuntamento vero pero' si fissa al telefono entro 24 ore
-- e spesso si sposta: senza un campo separato, il calendario mostrerebbe
-- richieste mai confermate e diventerebbe inaffidabile dopo la prima
-- telefonata.
--
-- appointment_at e' la data/ora CONFERMATA. Finche' e' null il calendario
-- mostra la richiesta originale, distinguendola visivamente.

alter table leads add column if not exists appointment_at timestamptz;

create index if not exists leads_appointment_at_idx on leads (appointment_at);

create or replace function admin_set_lead_appointment(
  p_id bigint,
  p_appointment_at timestamptz
)
returns leads
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated leads;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;

  update leads set
    appointment_at = p_appointment_at,
    -- fissare un appuntamento implica che il contatto e' avvenuto: si
    -- evita di dover aggiornare due campi a mano per la stessa azione
    status = case when status = 'nuovo' and p_appointment_at is not null then 'contattato' else status end,
    updated_at = now()
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Lead % non trovato', p_id;
  end if;

  perform log_admin_action('lead_appointment_set', null, jsonb_build_object(
    'lead_id', updated.id,
    'appointment_at', p_appointment_at
  ));

  return updated;
end;
$$;

revoke all on function admin_set_lead_appointment(bigint, timestamptz) from public, anon;
grant execute on function admin_set_lead_appointment(bigint, timestamptz) to authenticated;
