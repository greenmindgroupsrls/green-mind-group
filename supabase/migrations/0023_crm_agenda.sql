-- CRM personale / agenda: contatti (lead) e attività (promemoria) di
-- ciascun utente. A differenza del resto del progetto, qui NON si passa da
-- funzioni SECURITY DEFINER per le scritture: sono dati puramente
-- personali, senza nessuna logica di business da incapsulare (niente
-- cascata di commissioni, niente regola di pass-up, niente validazioni
-- oltre a "appartiene a chi lo crea") — policy RLS dirette su INSERT/UPDATE/
-- DELETE sono il pattern Postgres più semplice e altrettanto sicuro per
-- questo caso. Nessuna eccezione per l'azienda (0): sono dati privati di
-- lavoro personale, non un dato di rete/team.

create table if not exists crm_contacts (
  id bigserial primary key,
  owner_code integer not null references members (activity_code),
  name text not null,
  phone text,
  email text,
  status text not null default 'da_contattare'
    check (status in ('da_contattare', 'contattato', 'interessato', 'convertito', 'perso')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_owner_code_idx on crm_contacts (owner_code);

alter table crm_contacts enable row level security;

drop policy if exists crm_contacts_select on crm_contacts;
create policy crm_contacts_select on crm_contacts
  for select using (owner_code = current_member_code());

drop policy if exists crm_contacts_insert on crm_contacts;
create policy crm_contacts_insert on crm_contacts
  for insert with check (owner_code = current_member_code());

drop policy if exists crm_contacts_update on crm_contacts;
create policy crm_contacts_update on crm_contacts
  for update using (owner_code = current_member_code()) with check (owner_code = current_member_code());

drop policy if exists crm_contacts_delete on crm_contacts;
create policy crm_contacts_delete on crm_contacts
  for delete using (owner_code = current_member_code());

create table if not exists crm_tasks (
  id bigserial primary key,
  owner_code integer not null references members (activity_code),
  contact_id bigint references crm_contacts (id) on delete set null,
  title text not null,
  due_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists crm_tasks_owner_code_idx on crm_tasks (owner_code);
create index if not exists crm_tasks_due_at_idx on crm_tasks (due_at);

alter table crm_tasks enable row level security;

drop policy if exists crm_tasks_select on crm_tasks;
create policy crm_tasks_select on crm_tasks
  for select using (owner_code = current_member_code());

drop policy if exists crm_tasks_insert on crm_tasks;
create policy crm_tasks_insert on crm_tasks
  for insert with check (owner_code = current_member_code());

drop policy if exists crm_tasks_update on crm_tasks;
create policy crm_tasks_update on crm_tasks
  for update using (owner_code = current_member_code()) with check (owner_code = current_member_code());

drop policy if exists crm_tasks_delete on crm_tasks;
create policy crm_tasks_delete on crm_tasks
  for delete using (owner_code = current_member_code());
