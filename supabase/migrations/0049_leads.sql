-- Lead: contatti che arrivano dai siti collegati (es. Vortix, sito prodotto
-- separato montato su /company) che chiedono un appuntamento/demo. Arrivano
-- via webhook server-to-server (src/app/api/leads/vortix/route.ts, con
-- service role) — nessuna insert policy per authenticated: un utente loggato
-- non deve mai poter creare un lead direttamente dal client.
-- Visibili solo all'azienda (root): sono contatti commerciali dell'azienda,
-- non un pool condiviso tra incaricati.

create table if not exists leads (
  id bigserial primary key,
  source text not null default 'vortix',
  name text not null,
  phone text not null,
  email text not null,
  address text,
  notes text,
  requested_date date,
  requested_time text,
  status text not null default 'nuovo' check (status in ('nuovo', 'contattato', 'convertito', 'perso')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on leads (created_at desc);

alter table leads enable row level security;

drop policy if exists leads_select on leads;
create policy leads_select on leads
  for select using (current_member_code() = 0);

create or replace function admin_update_lead_status(
  p_id bigint,
  p_status text,
  p_internal_notes text default null
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
  if p_status not in ('nuovo', 'contattato', 'convertito', 'perso') then
    raise exception 'Stato non valido';
  end if;

  update leads set
    status = p_status,
    internal_notes = coalesce(p_internal_notes, internal_notes),
    updated_at = now()
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Lead % non trovato', p_id;
  end if;

  perform log_admin_action('lead_status_updated', null, jsonb_build_object(
    'lead_id', updated.id,
    'status', p_status
  ));

  return updated;
end;
$$;

revoke all on function admin_update_lead_status(bigint, text, text) from public, anon;
grant execute on function admin_update_lead_status(bigint, text, text) to authenticated;
