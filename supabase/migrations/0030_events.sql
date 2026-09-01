-- "Eventi": eventi Live organizzati dall'azienda (città/luogo/data) a cui
-- gli incaricati invitano ospiti, più inviti "1to1"/"Zoom" personali non
-- legati a nessun evento specifico. Scelte fatte con l'utente prima di
-- scrivere questa migrazione:
-- - Solo l'account aziendale crea/modifica/elimina eventi (come
--   create_announcement: SECURITY DEFINER root-only, select aperta a
--   tutti — gli incaricati devono vederli per invitare ospiti).
-- - Nessun sistema di quote sugli inviti Live: sempre illimitati per
--   tutti, quindi nessuna tabella/logica di conteggio slot.
-- - Nessuna delega ("invita a nome di"): ogni incaricato invita solo per
--   sé, quindi event_guests usa lo stesso pattern RLS diretto di
--   crm_contacts/crm_tasks (dato personale, nessuna logica di business).

create table if not exists events (
  id bigserial primary key,
  city text not null,
  venue text,
  address text,
  event_date date not null,
  registration_time text,
  start_time text,
  notes text,
  director_name text,
  photo_url text,
  created_by integer not null references members (activity_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_event_date_idx on events (event_date);

alter table events enable row level security;

drop policy if exists events_select on events;
create policy events_select on events
  for select using (true);

-- Nessuna policy insert/update/delete: solo via le funzioni sotto.

create or replace function create_event(
  p_city text,
  p_venue text,
  p_address text,
  p_event_date date,
  p_registration_time text,
  p_start_time text,
  p_notes text,
  p_director_name text,
  p_photo_url text
)
returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  new_event events;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'Città obbligatoria';
  end if;
  if p_event_date is null then
    raise exception 'Data obbligatoria';
  end if;

  insert into events (
    city, venue, address, event_date, registration_time, start_time,
    notes, director_name, photo_url, created_by
  )
  values (
    trim(p_city), nullif(trim(coalesce(p_venue, '')), ''), nullif(trim(coalesce(p_address, '')), ''),
    p_event_date, nullif(trim(coalesce(p_registration_time, '')), ''), nullif(trim(coalesce(p_start_time, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''), nullif(trim(coalesce(p_director_name, '')), ''), p_photo_url, caller
  )
  returning * into new_event;

  return new_event;
end;
$$;

revoke all on function create_event(text, text, text, date, text, text, text, text, text) from public, anon;
grant execute on function create_event(text, text, text, date, text, text, text, text, text) to authenticated;

create or replace function update_event(
  p_id bigint,
  p_city text,
  p_venue text,
  p_address text,
  p_event_date date,
  p_registration_time text,
  p_start_time text,
  p_notes text,
  p_director_name text,
  p_photo_url text
)
returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated events;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_city is null or trim(p_city) = '' then
    raise exception 'Città obbligatoria';
  end if;
  if p_event_date is null then
    raise exception 'Data obbligatoria';
  end if;

  update events set
    city = trim(p_city),
    venue = nullif(trim(coalesce(p_venue, '')), ''),
    address = nullif(trim(coalesce(p_address, '')), ''),
    event_date = p_event_date,
    registration_time = nullif(trim(coalesce(p_registration_time, '')), ''),
    start_time = nullif(trim(coalesce(p_start_time, '')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    director_name = nullif(trim(coalesce(p_director_name, '')), ''),
    photo_url = coalesce(p_photo_url, photo_url),
    updated_at = now()
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Evento % non trovato', p_id;
  end if;

  return updated;
end;
$$;

revoke all on function update_event(bigint, text, text, text, date, text, text, text, text, text) from public, anon;
grant execute on function update_event(bigint, text, text, text, date, text, text, text, text, text) to authenticated;

create or replace function delete_event(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;

  delete from events where id = p_id;
end;
$$;

revoke all on function delete_event(bigint) from public, anon;
grant execute on function delete_event(bigint) to authenticated;

-- Ospiti invitati: dato personale di chi invita (chi ha invitato chi),
-- nessuna cascata di commissioni o regole di business — stesso pattern
-- RLS diretto di crm_contacts/crm_tasks. Root vede tutti gli ospiti di
-- tutti gli eventi per la gestione check-in/conferme.
create table if not exists event_guests (
  id bigserial primary key,
  event_id bigint references events (id) on delete cascade,
  inviter_code integer not null references members (activity_code),
  invite_type text not null check (invite_type in ('live', '1to1', 'zoom')),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,
  gdpr_consent boolean not null default false,
  consented_at timestamptz,
  status text not null default 'invitato' check (status in ('invitato', 'confermato')),
  created_at timestamptz not null default now(),
  constraint event_guests_live_needs_event check (invite_type <> 'live' or event_id is not null),
  constraint event_guests_gdpr_required check (gdpr_consent = true)
);

create index if not exists event_guests_event_id_idx on event_guests (event_id);
create index if not exists event_guests_inviter_code_idx on event_guests (inviter_code);

alter table event_guests enable row level security;

drop policy if exists event_guests_select on event_guests;
create policy event_guests_select on event_guests
  for select using (inviter_code = current_member_code() or current_member_code() = 0);

drop policy if exists event_guests_insert on event_guests;
create policy event_guests_insert on event_guests
  for insert with check (inviter_code = current_member_code());

drop policy if exists event_guests_update on event_guests;
create policy event_guests_update on event_guests
  for update
  using (inviter_code = current_member_code() or current_member_code() = 0)
  with check (inviter_code = current_member_code() or current_member_code() = 0);

drop policy if exists event_guests_delete on event_guests;
create policy event_guests_delete on event_guests
  for delete using (inviter_code = current_member_code() or current_member_code() = 0);

-- Foto/mappa evento (opzionale): stesso pattern pubblico degli avatar
-- (src/app/(dashboard)/impostazioni/avatar-upload.tsx), ma le scritture
-- sono riservate all'azienda invece che al proprietario della cartella,
-- dato che gli eventi li gestisce solo root.
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

drop policy if exists event_photos_public_select on storage.objects;
create policy event_photos_public_select on storage.objects
  for select using (bucket_id = 'event-photos');

drop policy if exists event_photos_root_insert on storage.objects;
create policy event_photos_root_insert on storage.objects
  for insert with check (bucket_id = 'event-photos' and current_member_code() = 0);

drop policy if exists event_photos_root_update on storage.objects;
create policy event_photos_root_update on storage.objects
  for update using (bucket_id = 'event-photos' and current_member_code() = 0);
