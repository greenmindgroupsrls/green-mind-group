-- IL LEAD ASSEGNATO DIVENTA UN CONTATTO, NON UN MESSAGGIO
--
-- Assegnare un lead scriveva nome, telefono e mail dentro un messaggio.
-- L'incaricato se lo ritrovava in Messaggi, da dove non poteva farci niente:
-- niente stato, niente note, niente appuntamento. Per lavorarlo doveva
-- ricopiarselo a mano in Contatti.
--
-- Il motivo per cui non lo trovava altrove: la RLS sui lead lascia leggere
-- solo all'azienda. Un incaricato la tabella leads non la vede proprio, e
-- infatti l'avviso "hai N lead da richiamare" in Dashboard, che li conta,
-- per lui restava sempre a zero. Il messaggio era l'unica strada.
--
-- Adesso l'assegnazione crea un contatto nella sua agenda, con dentro
-- quello che serve per richiamare: nome, telefono, mail, e in nota la data
-- richiesta e quello che la persona ha scritto.
--
-- Un contatto per lead e per proprietario: riassegnare due volte alla stessa
-- persona non moltiplica le righe. Se il lead passa a qualcun altro, il
-- contatto del precedente sparisce SOLO se non era stato toccato: se ci
-- aveva gia' scritto una nota o cambiato stato, quel lavoro resta suo.

alter table crm_contacts
  add column if not exists lead_id bigint references leads(id) on delete set null;

comment on column crm_contacts.lead_id is
  'Se il contatto nasce da un lead assegnato, quale. Serve a non duplicarlo a ogni riassegnazione.';

-- Indice normale e non parziale: ON CONFLICT non sa usare un indice
-- parziale senza ripeterne la condizione, e i valori NULL non entrano mai
-- in conflitto fra loro, quindi i contatti creati a mano restano liberi.
create unique index if not exists crm_contacts_lead_owner_idx
  on crm_contacts (lead_id, owner_code);

create or replace function public.admin_assign_lead(p_id bigint, p_member_code integer)
returns leads
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller integer := current_member_code();
  caller_username text;
  target_username text;
  precedente integer;
  updated leads;
  nota text;
begin
  if caller is null or caller <> 0 then
    raise exception 'gmg.non_autorizzato';
  end if;

  select username into caller_username from members where activity_code = caller;
  select username into target_username from members where activity_code = p_member_code;
  if target_username is null then
    raise exception 'gmg.destinatario_non_trovato:%', p_member_code;
  end if;

  select assigned_to into precedente from leads where id = p_id;

  update leads set
    assigned_to = p_member_code,
    assigned_at = now(),
    updated_at = now()
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'gmg.evento_non_trovato:%', p_id;
  end if;

  -- Quello che serve per richiamare, in un posto dove si puo' lavorare.
  nota := concat_ws(E'\n',
    case when updated.requested_date is not null
      then format('Ha chiesto un appuntamento per il %s%s',
                  to_char(updated.requested_date, 'DD/MM/YYYY'),
                  coalesce(' alle ' || updated.requested_time, ''))
    end,
    case when nullif(trim(coalesce(updated.address, '')), '') is not null
      then 'Indirizzo: ' || updated.address end,
    case when nullif(trim(coalesce(updated.notes, '')), '') is not null
      then 'Ha scritto: ' || updated.notes end
  );

  insert into crm_contacts (owner_code, name, phone, email, notes, lead_id, status)
  values (p_member_code, updated.name, updated.phone, updated.email,
          nullif(nota, ''), updated.id, 'da_chiamare')
  on conflict (lead_id, owner_code) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now();

  -- Passato a un altro: il contatto del precedente si toglie solo se era
  -- rimasto intatto. Se ci aveva scritto qualcosa, quel lavoro non si butta.
  if precedente is not null and precedente <> p_member_code then
    delete from crm_contacts
    where lead_id = updated.id
      and owner_code = precedente
      and status = 'da_chiamare'
      and nullif(trim(coalesce(notes, '')), '') is not distinct from nullif(nota, '');
  end if;

  -- Il campanello resta, ma non porta piu' i dati: quelli stanno in Contatti,
  -- ed e' li' che si lavorano.
  insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
  values (caller, caller_username, p_member_code, target_username,
    'Nuovo contatto da richiamare',
    format('%s ti aspetta in Contatti, dentro Marketing > Agenda.', updated.name));

  perform log_admin_action('lead_assigned', p_member_code, jsonb_build_object('lead_id', updated.id));

  return updated;
end;
$function$;

-- I lead assegnati prima di questa modifica non avevano un contatto: chi se
-- li era visti arrivare come messaggio continuerebbe a non trovarli in
-- Contatti. Si recuperano una volta sola.
insert into crm_contacts (owner_code, name, phone, email, notes, lead_id, status)
select l.assigned_to, l.name, l.phone, l.email,
       nullif(concat_ws(E'\n',
         case when l.requested_date is not null
           then format('Ha chiesto un appuntamento per il %s%s',
                       to_char(l.requested_date, 'DD/MM/YYYY'),
                       coalesce(' alle ' || l.requested_time, '')) end,
         case when nullif(trim(coalesce(l.address, '')), '') is not null
           then 'Indirizzo: ' || l.address end,
         case when nullif(trim(coalesce(l.notes, '')), '') is not null
           then 'Ha scritto: ' || l.notes end
       ), ''),
       l.id, 'da_chiamare'
from leads l
where l.assigned_to is not null
on conflict (lead_id, owner_code) do nothing;
