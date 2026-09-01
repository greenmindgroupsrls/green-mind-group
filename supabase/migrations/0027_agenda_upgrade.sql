-- Migliora l'agenda/CRM per uso quotidiano pratico:
-- 1) gli appuntamenti diventano eventi veri (data/ora) invece di una sola
--    etichetta di stato sul contatto, tramite crm_tasks.kind;
-- 2) note libere e ricorrenza sui task (per promemoria ripetuti tipo
--    "richiama ogni settimana"), gestita in applicazione alla spunta
--    "fatto" (nessun cron necessario: si genera subito la prossima
--    occorrenza);
-- 3) un contatto può essere collegato a un membro reale della rete una
--    volta che il lead si iscrive.
-- Stesso pattern RLS diretto già in uso per queste tabelle (dati personali,
-- nessuna logica di business da incapsulare).

alter table crm_tasks
  add column if not exists kind text not null default 'task'
    check (kind in ('task', 'appuntamento')),
  add column if not exists notes text,
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

alter table crm_contacts
  add column if not exists linked_member_code integer references members (activity_code);

create index if not exists crm_contacts_linked_member_code_idx
  on crm_contacts (linked_member_code);
